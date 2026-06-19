import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { ZodType } from 'zod';
import { RabbitMqConnection } from '../../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { MAIN_EXCHANGE } from '../../../../libs/contracts/main/events/exchanges';
import {
  NOTIFICATION_DLQ,
  NOTIFICATION_DLX,
  NOTIFICATION_QUEUE,
  NOTIFICATION_ROUTING_PATTERN,
} from './constants/messaging.const';
import { MessageConsumerInterface } from '../../../../libs/infrastructure/message-broker/interfaces/message.consumer.interface';
import { EmailServiceInterface } from './interfaces/email.service.interface';
import { AppLogger } from '../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { SUBSCRIPTION_EVENT_ROUTING_KEYS } from '../../../../libs/contracts/main/events/routing-keys';
import { validate } from '../../../../libs/common/utils/validation/validate';
import {
  subscriptionConfirmedEventSchema,
  subscriptionCreatedEventSchema,
  subscriptionRepositoryReleasedEventSchema,
  unsubscribedEventSchema,
} from './schemas/notification.schema';
import { ValidationError } from '../../../../libs/common/utils/errors/custom-errors';

export class NotificationRabbitMqEventConsumer implements MessageConsumerInterface {
  private readonly channelWrapper: ChannelWrapper;
  private consumerTag: string | undefined;

  constructor(
    connection: RabbitMqConnection,
    private readonly notificationService: EmailServiceInterface,
    private readonly logger: AppLogger,
  ) {
    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await Promise.all([
          channel.assertExchange(NOTIFICATION_DLX, 'topic', { durable: true }),
          channel.assertExchange(MAIN_EXCHANGE, 'topic', { durable: true }),

          channel.assertQueue(NOTIFICATION_QUEUE, {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': NOTIFICATION_DLX,
            },
          }),
          channel.assertQueue(NOTIFICATION_DLQ, { durable: true }),

          channel.prefetch(10),
        ]);

        await channel.bindQueue(NOTIFICATION_QUEUE, MAIN_EXCHANGE, NOTIFICATION_ROUTING_PATTERN);
        await channel.bindQueue(NOTIFICATION_DLQ, NOTIFICATION_DLX, '#');
      },
    });
  }

  async start(): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      const { consumerTag } = await channel.consume(NOTIFICATION_QUEUE, (msg) => {
        if (!msg) {
          this.logger.error('Consumer was cancelled by broker. Restarting channel...');
          channel.close().catch((err: unknown) => {
            this.logger.error(
              { err, queue: NOTIFICATION_QUEUE },
              'Error while trying to close dead channel.',
            );
          });
          return;
        }

        this.handleMessage(msg, channel).catch((err: unknown) => {
          this.logger.error(
            { err, queue: NOTIFICATION_QUEUE },
            'Unchecked error while processing notification event.',
          );
        });
      });
      this.consumerTag = consumerTag;
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

  private async handleMessage(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    const routingKey = msg.fields.routingKey;

    try {
      switch (routingKey) {
        case SUBSCRIPTION_EVENT_ROUTING_KEYS.SUBSCRIBED:
          await this.handleSubscriptionCreated(msg, channel);
          break;
        case SUBSCRIPTION_EVENT_ROUTING_KEYS.CONFIRMED:
          await this.handleSubscriptionConfirmed(msg, channel);
          break;
        case SUBSCRIPTION_EVENT_ROUTING_KEYS.UNSUBSCRIBED:
          await this.handleUnsubscribed(msg, channel);
          break;
        case SUBSCRIPTION_EVENT_ROUTING_KEYS.REPOSITORY_RELEASED:
          await this.handleSubscriptionRepositoryReleased(msg, channel);
          break;
        default:
          this.logger.warn({ routingKey, queue: NOTIFICATION_QUEUE }, `Ignored unknown event.`);
          channel.ack(msg);
      }
    } catch (err) {
      this.logger.error(
        { err, routingKey, queue: NOTIFICATION_QUEUE },
        'Failed to process message.',
      );

      try {
        channel.nack(msg, false, false);
      } catch (err) {
        this.logger.debug(
          { err, routingKey, queue: NOTIFICATION_QUEUE },
          'Channel already closed, skipping nack.',
        );
      }
    }
  }

  private async handleSubscriptionCreated(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(msg, channel, subscriptionCreatedEventSchema, async (payload) => {
      await this.notificationService.sendConfirmationEmail(
        payload.email,
        payload.confirmationUrl,
        payload.repo,
      );
    });
  }

  private async handleSubscriptionConfirmed(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(msg, channel, subscriptionConfirmedEventSchema, async (payload) => {
      await this.notificationService.sendConfirmationSuccessEmail(
        payload.email,
        payload.unsubscribeUrl,
        payload.repo,
      );
    });
  }

  private async handleUnsubscribed(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    await this.processMessage(msg, channel, unsubscribedEventSchema, async (payload) => {
      await this.notificationService.sendUnsubscribeSuccessEmail(payload.email, payload.repo);
    });
  }

  private async handleSubscriptionRepositoryReleased(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(
      msg,
      channel,
      subscriptionRepositoryReleasedEventSchema,
      async (payload) => {
        await this.notificationService.sendGitHubReleaseEmail(
          payload.email,
          payload.release,
          payload.unsubscribeUrl,
        );
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
      this.handleError(msg, channel, err);
    }
  }

  private handleError(msg: ConsumeMessage, channel: ConfirmChannel, err: unknown) {
    const routingKey = msg.fields.routingKey;

    if (err instanceof SyntaxError) {
      this.logger.error(
        { err, routingKey, queue: NOTIFICATION_QUEUE },
        'JSON parsing failed. Moving to DLQ.',
      );
      channel.nack(msg, false, false);
      return;
    }

    if (err instanceof ValidationError) {
      this.logger.error(
        { err, routingKey, queue: NOTIFICATION_QUEUE, details: err.details },
        'Validation failed. Moving to DLQ.',
      );
      channel.nack(msg, false, false);
      return;
    }

    this.logger.warn(
      { err, routingKey, queue: NOTIFICATION_QUEUE },
      'Internal error while notifying. Moving to DLQ.',
    );

    channel.nack(msg, false, false);
  }
}
