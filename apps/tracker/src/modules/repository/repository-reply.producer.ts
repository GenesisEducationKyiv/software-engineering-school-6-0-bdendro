import { ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMqConnection } from '../../../../../libs/infrastructure/message-broker/rabbitmq.connection';
import {
  TRACKER_REPOSITORY_REPLY_TYPES,
  TrackRepositoryFailedReply,
  TrackRepositorySuccessReply,
} from '../../../../../libs/contracts/tracker/messaging/repository.commands';
import { RepositoryReplyProducerMapper } from './mappers/repository-reply-producer.mapper';
import { Repository } from './types/repository';

export class RepositoryReplyRabbitMqProducer {
  private readonly channelWrapper: ChannelWrapper;

  constructor(
    connection: RabbitMqConnection,
    private readonly mapper: RepositoryReplyProducerMapper,
  ) {
    this.channelWrapper = connection.createChannel({
      json: true,
    });
  }

  async sendTrackRepositorySuccessReply(
    replyToQueue: string,
    correlationId: string,
    repository: Repository,
  ): Promise<void> {
    const payload: TrackRepositorySuccessReply = {
      repository: this.mapper.toReplyRepository(repository),
    };
    await this.sendReply(
      replyToQueue,
      correlationId,
      TRACKER_REPOSITORY_REPLY_TYPES.TRACK_SUCCESS,
      payload,
    );
  }

  async sendTrackRepositoryFailedReply(
    replyToQueue: string,
    correlationId: string,
    payload: TrackRepositoryFailedReply,
  ): Promise<void> {
    await this.sendReply(
      replyToQueue,
      correlationId,
      TRACKER_REPOSITORY_REPLY_TYPES.TRACK_FAILED,
      payload,
    );
  }

  private async sendReply<T>(
    replyToQueue: string,
    correlationId: string,
    replyType: string,
    payload: T,
  ): Promise<void> {
    await this.channelWrapper.sendToQueue(replyToQueue, payload, {
      persistent: true,
      correlationId,
      type: replyType,
    });
  }
}
