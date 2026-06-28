import type { ChannelWrapper } from 'amqp-connection-manager';
import { MessageConsumerInterface } from '../../../libs/infrastructure/message-broker/interfaces/message.consumer.interface';
import { RabbitMqConnection } from '../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { TRACKER_EXCHANGE } from '../../../libs/contracts/tracker/messaging/exchanges';
import { RabbitMqDlxProducer } from '../../../libs/infrastructure/message-broker/rabbitmq-dlx.producer';
import { REPOSITORY_RELEASE_EVENT_ROUTING_KEYS } from '../../../libs/contracts/tracker/messaging/routing-keys';
import { ZodType } from 'zod';
import { validate } from '../../../libs/common/utils/validation/validate';
import { ValidationError } from '../../../libs/common/utils/errors/custom-errors';
import { mapValidationErrorDetailsToString } from '../../../libs/common/utils/validation/map-validation-error-details';
import {
  RETRY_TIME_IN_MS,
  SUBSCRIPTION_RELEASE_QUEUE,
  SUBSCRIPTION_RELEASE_RETRY_EXCHANGE,
  SUBSCRIPTION_RELEASE_RETRY_QUEUE,
} from './constants/messaging.const';
import { repositoryReleaseDetectedEventSchema } from './schemas/repository-release.schema';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';

export class ReleaseDetectedRabbitMqEventConsumer implements MessageConsumerInterface {
  private readonly channelWrapper: ChannelWrapper;
  private consumerTag: string | undefined;

  constructor(
    connection: RabbitMqConnection,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly dlxProducer: RabbitMqDlxProducer,
    private readonly logger: AppLogger,
  ) {
    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await this.setupChannel(channel);
      },
    });
  }

  async start(): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await this.startConsumer(channel);
    });
  }

  async stop(): Promise<void> {
    if (this.consumerTag) {
      const consumerTag = this.consumerTag;
      await this.channelWrapper.removeSetup(
        () => {},
        async (channel: ConfirmChannel) => {
          await channel.cancel(consumerTag);
        },
      );
    }
    await this.channelWrapper.close();
  }

  private async setupChannel(channel: ConfirmChannel) {
    await Promise.all([
      channel.assertExchange(TRACKER_EXCHANGE, 'topic', { durable: true }),
      channel.assertExchange(SUBSCRIPTION_RELEASE_RETRY_EXCHANGE, 'topic', {
        durable: true,
      }),

      channel.assertQueue(SUBSCRIPTION_RELEASE_QUEUE, {
        durable: true,
        deadLetterExchange: SUBSCRIPTION_RELEASE_RETRY_EXCHANGE,
      }),
      channel.assertQueue(SUBSCRIPTION_RELEASE_RETRY_QUEUE, {
        durable: true,
        deadLetterExchange: TRACKER_EXCHANGE,
        messageTtl: RETRY_TIME_IN_MS.SUBSCRIPTION_RELEASE,
      }),

      channel.prefetch(10),
    ]);

    await channel.bindQueue(
      SUBSCRIPTION_RELEASE_QUEUE,
      TRACKER_EXCHANGE,
      REPOSITORY_RELEASE_EVENT_ROUTING_KEYS.DETECTED,
    );
    await channel.bindQueue(
      SUBSCRIPTION_RELEASE_RETRY_QUEUE,
      SUBSCRIPTION_RELEASE_RETRY_EXCHANGE,
      '#',
    );
  }

  private async startConsumer(channel: ConfirmChannel) {
    const { consumerTag } = await channel.consume(SUBSCRIPTION_RELEASE_QUEUE, (msg) => {
      if (!msg) {
        this.logger.error('Consumer was cancelled by broker. Setup consumer...');
        this.setupChannel(channel)
          .then(() => {
            this.logger.info({ queue: SUBSCRIPTION_RELEASE_QUEUE }, 'Successfully setup consumer.');

            this.startConsumer(channel)
              .then(() => {
                this.logger.info({ queue: SUBSCRIPTION_RELEASE_QUEUE }, 'Consumer restarted.');
              })
              .catch((err: unknown) => {
                this.logger.error(
                  { err, queue: SUBSCRIPTION_RELEASE_QUEUE },
                  'Error while trying to restart consumer.',
                );
              });
          })
          .catch((err: unknown) => {
            this.logger.error(
              { err, queue: SUBSCRIPTION_RELEASE_QUEUE },
              'Error while trying to setup consumer after cancellation.',
            );
          });
        return;
      }

      this.handleMessage(msg, channel).catch((err: unknown) => {
        this.logger.error(
          { err, queue: SUBSCRIPTION_RELEASE_QUEUE },
          'Unchecked error while processing repository event.',
        );
      });
    });
    this.consumerTag = consumerTag;
  }

  private async handleMessage(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    const routingKey = msg.fields.routingKey;

    try {
      switch (routingKey) {
        case REPOSITORY_RELEASE_EVENT_ROUTING_KEYS.DETECTED:
          this.logger.info(
            { routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
            'Received repository release event.',
          );
          await this.handleRepositoryReleaseDetected(msg, channel);
          break;
        default:
          this.logger.warn(
            { routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
            `Ignored unknown event.`,
          );
          await this.dlxProducer.produceToDlx(msg, 'Unknown event.');
          channel.ack(msg);
      }
    } catch (err) {
      this.logger.error(
        { err, routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
        'Failed to process message.',
      );

      try {
        channel.nack(msg, false, false);
      } catch (err) {
        this.logger.debug(
          { err, routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
          'Channel already closed, skipping nack.',
        );
      }
    }
  }

  private async handleRepositoryReleaseDetected(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(
      msg,
      channel,
      repositoryReleaseDetectedEventSchema,
      async (payload) => {
        await this.subscriptionService.processRepositoryRelease(payload);
      },
    );
  }

  private async processMessage<T>(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
    schema: ZodType<T>,
    handler: (payload: T) => Promise<void>,
  ): Promise<void> {
    const contentString = msg.content.toString('utf-8');

    try {
      const rawPayload = JSON.parse(contentString) as unknown;

      const validationResult = validate(rawPayload, schema);
      if (!validationResult.success) throw new ValidationError(validationResult.details);

      const payload = validationResult.data;

      await handler(payload);

      channel.ack(msg);
    } catch (err) {
      await this.handleError(msg, channel, err);
    }
  }

  private async handleError(msg: ConsumeMessage, channel: ConfirmChannel, err: unknown) {
    const routingKey = msg.fields.routingKey;

    if (err instanceof SyntaxError) {
      this.logger.error(
        { err, routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
        'JSON parsing failed. Moving to DLQ.',
      );

      await this.dlxProducer.produceToDlx(msg, 'Invalid JSON.');
      channel.ack(msg);
      return;
    }

    if (err instanceof ValidationError) {
      this.logger.error(
        { err, routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
        'Validation failed. Moving to DLQ.',
      );
      const message = mapValidationErrorDetailsToString(err.details);
      await this.dlxProducer.produceToDlx(msg, message);

      channel.ack(msg);
      return;
    }

    this.logger.warn(
      { err, routingKey, queue: SUBSCRIPTION_RELEASE_QUEUE },
      'Internal error while processing. Move to retry queue.',
    );

    channel.nack(msg, false, false);
  }
}
