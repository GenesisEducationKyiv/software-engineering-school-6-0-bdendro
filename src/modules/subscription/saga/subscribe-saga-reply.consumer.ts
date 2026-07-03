import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { ZodType } from 'zod';
import { MessageConsumerInterface } from '../../../../libs/infrastructure/message-broker/interfaces/message.consumer.interface';
import { RabbitMqConnection } from '../../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { AppLogger } from '../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { SUBSCRIPTION_RETRY_EXCHANGE } from '../../../common/constants/messaging.const';
import {
  RETRY_TIME_IN_MS,
  SUBSCRIBE_SAGA_REPLIES_QUEUE,
  SUBSCRIBE_SAGA_REPLIES_RETRY_QUEUE,
} from './constants/messaging.const';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../libs/common/utils/errors/custom-errors';
import { validate } from '../../../../libs/common/utils/validation/validate';
import {
  TRACKER_REPOSITORY_REPLY_TYPES,
  TrackerRepositoryReplyType,
} from '../../../../libs/contracts/tracker/messaging/repository.commands';
import { RabbitMqDlxProducer } from '../../../../libs/infrastructure/message-broker/rabbitmq-dlx.producer';
import { mapValidationErrorDetailsToString } from '../../../../libs/common/utils/validation/map-validation-error-details';
import { SubscribeSagaRepository } from './interfaces/subscribe-saga.repository.interface';
import { SubscribeSagaCommandProducer } from './subscribe-saga-command.producer';
import { SubscriptionServiceInterface } from '../interfaces/subscription.service.interface';
import { RepositoryRepositoryWritableInterface } from '../../repository/interfaces/repository.repository.interface';
import {
  repositoryTrackFailedReplySchema,
  repositoryTrackSuccessReplySchema,
  subscribeSagaReplyPropertiesSchema,
} from './schemas/subscribe-saga.schema';
import { SUBSCRIPTION_ERROR_MESSAGES } from '../constants/error-messages';
import { REPOSITORY_ERROR_MESSAGES } from '../../repository/constants/error-messages';
import { SUBSCRIBE_SAGA_ERROR_MESSAGES } from './constants/subscribe-saga.const';

export class SubscribeSagaReplyConsumer implements MessageConsumerInterface {
  private readonly channelWrapper: ChannelWrapper;
  private consumerTag: string | undefined;

  constructor(
    connection: RabbitMqConnection,
    private readonly sagaRepository: SubscribeSagaRepository,
    private readonly commandProducer: SubscribeSagaCommandProducer,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly subscriptionRepositoryRepository: RepositoryRepositoryWritableInterface,
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
      channel.assertExchange(SUBSCRIPTION_RETRY_EXCHANGE, 'topic', {
        durable: true,
      }),

      channel.assertQueue(SUBSCRIBE_SAGA_REPLIES_QUEUE, {
        durable: true,
        deadLetterExchange: SUBSCRIPTION_RETRY_EXCHANGE,
        deadLetterRoutingKey: SUBSCRIBE_SAGA_REPLIES_QUEUE,
      }),
      channel.assertQueue(SUBSCRIBE_SAGA_REPLIES_RETRY_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: SUBSCRIBE_SAGA_REPLIES_QUEUE,
        messageTtl: RETRY_TIME_IN_MS.SAGA_REPLY,
      }),

      channel.prefetch(10),
    ]);

    await channel.bindQueue(
      SUBSCRIBE_SAGA_REPLIES_RETRY_QUEUE,
      SUBSCRIPTION_RETRY_EXCHANGE,
      SUBSCRIBE_SAGA_REPLIES_QUEUE,
    );
  }

  private async startConsumer(channel: ConfirmChannel) {
    const { consumerTag } = await channel.consume(SUBSCRIBE_SAGA_REPLIES_QUEUE, (msg) => {
      if (!msg) {
        this.logger.error('Consumer was cancelled by broker. Setup consumer...');
        this.setupChannel(channel)
          .then(() => {
            this.logger.info(
              { queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
              'Successfully setup consumer.',
            );

            this.startConsumer(channel)
              .then(() => {
                this.logger.info({ queue: SUBSCRIBE_SAGA_REPLIES_QUEUE }, 'Consumer restarted.');
              })
              .catch((err: unknown) => {
                this.logger.error(
                  { err, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
                  'Error while trying to restart consumer.',
                );
              });
          })
          .catch((err: unknown) => {
            this.logger.error(
              { err, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
              'Error while trying to setup consumer after cancellation.',
            );
          });
        return;
      }

      this.handleMessage(msg, channel).catch((err: unknown) => {
        this.logger.error(
          { err, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
          'Unchecked error while processing subscribe saga reply.',
        );
      });
    });
    this.consumerTag = consumerTag;
  }

  private async handleMessage(msg: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
    const replyType = msg.properties.type as TrackerRepositoryReplyType;

    try {
      switch (replyType) {
        case TRACKER_REPOSITORY_REPLY_TYPES.TRACK_SUCCESS:
          this.logger.info(
            { routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
            'Received repository track success reply.',
          );
          await this.handleRepositoryTrackSuccess(msg, channel);
          break;
        case TRACKER_REPOSITORY_REPLY_TYPES.TRACK_FAILED:
          this.logger.info(
            { routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
            'Received repository track failed reply.',
          );
          await this.handleRepositoryTrackFailed(msg, channel);
          break;
        default:
          this.logger.warn(
            { routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
            `Ignored unknown reply.`,
          );
          await this.dlxProducer.produceToDlx(msg, 'Unknown event.');
          channel.ack(msg);
      }
    } catch (err) {
      this.logger.error(
        { err, routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
        'Failed to process message.',
      );

      try {
        channel.nack(msg, false, false);
      } catch (err) {
        this.logger.debug(
          { err, routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
          'Channel already closed, skipping nack.',
        );
      }
    }
  }

  private async handleRepositoryTrackSuccess(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(msg, channel, repositoryTrackSuccessReplySchema, async (payload) => {
      const { correlationId } = this.validateMessageProperties(msg);
      const receivedRepository = payload.repository;
      try {
        const saga = await this.sagaRepository.markRepoTracked(
          correlationId,
          receivedRepository.id,
        );
        const repository =
          await this.subscriptionRepositoryRepository.createOrGet(receivedRepository);

        const subscription = await this.subscriptionService.createSubscription(
          saga.email,
          repository.id,
          repository.repo,
        );

        await this.sagaRepository.markCompleted(saga.id, subscription.id);
      } catch (err) {
        if (
          err instanceof ConflictError &&
          (err.message.includes(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_EMAIL_REPOSITORY) ||
            err.message.includes(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_TOKEN))
        ) {
          await this.sagaRepository.markFailed(correlationId, err.message);
          try {
            const deletedRepository = await this.subscriptionRepositoryRepository.deleteById(
              receivedRepository.id,
            );
            await this.commandProducer.produceUntrackRepo(deletedRepository.id, {
              correlationId: correlationId,
            });

            await this.sagaRepository.markCompensated(correlationId, true);
            return; // ack
          } catch (err) {
            if (
              err instanceof ConflictError &&
              err.message.includes(REPOSITORY_ERROR_MESSAGES.IN_USE)
            ) {
              await this.sagaRepository.markCompensated(correlationId, false);
              return; // ack
            }
            throw err;
          }
        }

        throw err;
      }
    });
  }

  private async handleRepositoryTrackFailed(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    await this.processMessage(msg, channel, repositoryTrackFailedReplySchema, async (payload) => {
      const { correlationId } = this.validateMessageProperties(msg);
      await Promise.all([
        this.sagaRepository.markFailed(correlationId, payload.error_message),
        this.sagaRepository.markCompensated(correlationId, true),
      ]);
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
    const replyType = msg.properties.type as TrackerRepositoryReplyType;
    const correlationId = msg.properties.correlationId as unknown;

    if (err instanceof SyntaxError) {
      this.logger.error(
        { err, routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
        'JSON parsing failed. Moving to DLQ.',
      );

      await this.dlxProducer.produceToDlx(msg, 'Invalid JSON.');
      channel.ack(msg);
      return;
    }

    if (err instanceof ValidationError) {
      this.logger.error(
        { err, routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
        'Validation failed. Moving to DLQ.',
      );
      const message = mapValidationErrorDetailsToString(err.details);
      await this.dlxProducer.produceToDlx(msg, message);

      channel.ack(msg);
      return;
    }

    if (
      err instanceof NotFoundError &&
      err.message.includes(SUBSCRIBE_SAGA_ERROR_MESSAGES.NOT_FOUND)
    ) {
      this.logger.warn(
        { err, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE, sagaId: correlationId },
        'Received unexisting sagaId.',
      );
      await this.dlxProducer.produceToDlx(msg, 'Unexisting sagaId.');
      channel.ack(msg);
      return;
    }

    this.logger.warn(
      { err, routingKey: replyType, queue: SUBSCRIBE_SAGA_REPLIES_QUEUE },
      'Internal error while processing. Move to retry queue.',
    );

    channel.nack(msg, false, false);
  }

  private validateMessageProperties(msg: ConsumeMessage) {
    const data = {
      correlationId: msg.properties.correlationId as unknown,
    };

    const validationResult = validate(data, subscribeSagaReplyPropertiesSchema);
    if (!validationResult.success) throw new ValidationError(validationResult.details);
    return validationResult.data;
  }
}
