import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { ZodType } from 'zod';
import { MessageConsumerInterface } from '../../../../../libs/infrastructure/message-broker/interfaces/message.consumer.interface';
import { RabbitMqConnection } from '../../../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { AppLogger } from '../../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { TRACKER_COMMAND_EXCHANGE } from '../../../../../libs/contracts/tracker/messaging/topology';
import { TRACKER_RETRY_EXCHANGE } from '../../common/constants/messaging.const';
import {
  TRACKER_REPOSITORY_COMMAND_QUEUE,
  TRACKER_REPOSITORY_COMMAND_RETRY_QUEUE,
  TRACKER_RETRY_TIME_IN_MS,
} from './constants/messaging.const';
import { REPOSITORY_COMMANDS_ROUTING_KEYS } from '../../../../../libs/contracts/tracker/messaging/routing-keys';
import { validate } from '../../../../../libs/common/utils/validation/validate';
import {
  NotFoundError,
  ValidationError,
} from '../../../../../libs/common/utils/errors/custom-errors';
import { RabbitMqDlxProducer } from '../../../../../libs/infrastructure/message-broker/rabbitmq-dlx.producer';
import { mapValidationErrorDetailsToString } from '../../../../../libs/common/utils/validation/map-validation-error-details';
import { RepositoryServiceInterface } from './interfaces/repository.service.interface';
import { RepositoryReplyRabbitMqProducer } from './repository-reply.producer';
import {
  repositoryCommandPropertiesSchema,
  TRACK_REPO_FAIL_REASONS,
  trackRepositoryCommandSchema,
  untrackRepositoryCommandSchema,
} from '../../../../../libs/contracts/tracker/messaging/repository.commands';
import { GITHUB_NAME } from '../github';

export class RepositoryCommandConsumer implements MessageConsumerInterface {
  private readonly channelWrapper: ChannelWrapper;
  private consumerTag: string | undefined;

  constructor(
    connection: RabbitMqConnection,
    private readonly repositoryService: RepositoryServiceInterface,
    private readonly repositoryReplyProducer: RepositoryReplyRabbitMqProducer,
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
      channel.assertExchange(TRACKER_COMMAND_EXCHANGE, 'topic', { durable: true }),
      channel.assertExchange(TRACKER_RETRY_EXCHANGE, 'topic', {
        durable: true,
      }),

      channel.assertQueue(TRACKER_REPOSITORY_COMMAND_QUEUE, {
        durable: true,
        deadLetterExchange: TRACKER_RETRY_EXCHANGE,
      }),
      channel.assertQueue(TRACKER_REPOSITORY_COMMAND_RETRY_QUEUE, {
        durable: true,
        deadLetterExchange: TRACKER_COMMAND_EXCHANGE,
        messageTtl: TRACKER_RETRY_TIME_IN_MS.REPOSITORY_COMMANDS,
      }),

      channel.prefetch(10),
    ]);
    await Promise.all([
      channel.bindQueue(
        TRACKER_REPOSITORY_COMMAND_QUEUE,
        TRACKER_COMMAND_EXCHANGE,
        REPOSITORY_COMMANDS_ROUTING_KEYS.TRACK,
      ),
      channel.bindQueue(
        TRACKER_REPOSITORY_COMMAND_QUEUE,
        TRACKER_COMMAND_EXCHANGE,
        REPOSITORY_COMMANDS_ROUTING_KEYS.UNTRACK,
      ),

      channel.bindQueue(
        TRACKER_REPOSITORY_COMMAND_RETRY_QUEUE,
        TRACKER_RETRY_EXCHANGE,
        REPOSITORY_COMMANDS_ROUTING_KEYS.TRACK,
      ),
      channel.bindQueue(
        TRACKER_REPOSITORY_COMMAND_RETRY_QUEUE,
        TRACKER_RETRY_EXCHANGE,
        REPOSITORY_COMMANDS_ROUTING_KEYS.UNTRACK,
      ),
    ]);
  }

  private async startConsumer(channel: ConfirmChannel) {
    const { consumerTag } = await channel.consume(TRACKER_REPOSITORY_COMMAND_QUEUE, (msg) => {
      if (!msg) {
        this.logger.error('Consumer was cancelled by broker. Setup consumer...');
        this.setupChannel(channel)
          .then(() => {
            this.logger.info(
              { queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
              'Successfully setup consumer.',
            );

            this.startConsumer(channel)
              .then(() => {
                this.logger.info(
                  { queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
                  'Consumer restarted.',
                );
              })
              .catch((err: unknown) => {
                this.logger.error(
                  { err, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
                  'Error while trying to restart consumer.',
                );
              });
          })
          .catch((err: unknown) => {
            this.logger.error(
              { err, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
              'Error while trying to setup consumer after cancellation.',
            );
          });
        return;
      }

      this.handleMessage(msg, channel).catch((err: unknown) => {
        this.logger.error(
          { err, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
          'Unchecked error while processing repository command.',
        );
      });
    });
    this.consumerTag = consumerTag;
  }

  private async handleMessage(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    const routingKey = msg.fields.routingKey;

    try {
      switch (routingKey) {
        case REPOSITORY_COMMANDS_ROUTING_KEYS.TRACK:
          this.logger.info(
            { routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
            'Received track repository command.',
          );
          await this.handleTrackRepository(msg, channel);
          break;
        case REPOSITORY_COMMANDS_ROUTING_KEYS.UNTRACK:
          this.logger.info(
            { routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
            'Received untrack repository command.',
          );
          await this.handleUntrackRepository(msg, channel);
          break;
        default:
          this.logger.warn(
            { routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
            `Ignored unknown event.`,
          );
          await this.dlxProducer.produceToDlx(msg, 'Unknown event.');
          channel.ack(msg);
      }
    } catch (err) {
      this.logger.error(
        { err, routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
        'Failed to process message.',
      );

      try {
        channel.nack(msg, false, false);
      } catch (err) {
        this.logger.debug(
          { err, routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
          'Channel already closed, skipping nack.',
        );
      }
    }
  }

  private async handleTrackRepository(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    await this.processMessage(msg, channel, trackRepositoryCommandSchema, async (payload) => {
      const { replyTo, correlationId } = this.validateMessageProperties(msg);
      try {
        const repository = await this.repositoryService.track(payload.repo);
        await this.repositoryReplyProducer.sendTrackRepositorySuccessReply(
          replyTo,
          correlationId,
          repository,
        );
      } catch (err) {
        if (err instanceof NotFoundError && err.message.includes(GITHUB_NAME)) {
          await this.repositoryReplyProducer.sendTrackRepositoryFailedReply(
            replyTo,
            correlationId,
            {
              error_reason: TRACK_REPO_FAIL_REASONS.GITHUB_REPO_NOT_FOUND,
              error_message: err.message,
            },
          );
          return;
        }

        throw err;
      }
    });
  }

  private async handleUntrackRepository(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(msg, channel, untrackRepositoryCommandSchema, async (payload) => {
      await this.repositoryService.untrack(payload.repoId);
    });
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
        { err, routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
        'JSON parsing failed. Moving to DLQ.',
      );

      await this.dlxProducer.produceToDlx(msg, 'Invalid JSON.');
      channel.ack(msg);
      return;
    }

    if (err instanceof ValidationError) {
      this.logger.error(
        { err, routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
        'Validation failed. Moving to DLQ.',
      );
      const message = mapValidationErrorDetailsToString(err.details);
      await this.dlxProducer.produceToDlx(msg, message);

      channel.ack(msg);
      return;
    }

    this.logger.warn(
      { err, routingKey, queue: TRACKER_REPOSITORY_COMMAND_QUEUE },
      'Internal error while processing. Move to retry queue.',
    );

    channel.nack(msg, false, false);
  }

  private validateMessageProperties(msg: ConsumeMessage) {
    const data = {
      replyTo: msg.properties.replyTo as unknown,
      correlationId: msg.properties.correlationId as unknown,
    };

    const validationResult = validate(data, repositoryCommandPropertiesSchema);
    if (!validationResult.success) throw new ValidationError(validationResult.details);
    return validationResult.data;
  }
}
