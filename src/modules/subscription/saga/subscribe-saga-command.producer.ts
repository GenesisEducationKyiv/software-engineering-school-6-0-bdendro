import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, MessageProperties } from 'amqplib';
import { RabbitMqConnection } from '../../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { TRACKER_COMMAND_EXCHANGE } from '../../../../libs/contracts/tracker/messaging/topology';
import {
  RepositoryCommandProperties,
  TrackRepositoryCommand,
  UntrackRepositoryCommand,
} from '../../../../libs/contracts/tracker/messaging/repository.commands';
import { REPOSITORY_COMMANDS_ROUTING_KEYS } from '../../../../libs/contracts/tracker/messaging/routing-keys';
import { SUBSCRIBE_SAGA_REPLIES_QUEUE } from './constants/messaging.const';

type CommandMessageProperties = {
  correlationId: number;
};

export class SubscribeSagaCommandProducer {
  private readonly channelWrapper: ChannelWrapper;
  private readonly exchange: string;

  constructor(connection: RabbitMqConnection) {
    this.exchange = TRACKER_COMMAND_EXCHANGE;

    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });
  }

  async produceTrackRepo(repo: string, messageProperties: CommandMessageProperties): Promise<void> {
    const payload: TrackRepositoryCommand = { repo: repo };
    const commandProperties: RepositoryCommandProperties = {
      correlationId: messageProperties.correlationId.toString(),
      replyTo: SUBSCRIBE_SAGA_REPLIES_QUEUE,
    };
    await this.produce(REPOSITORY_COMMANDS_ROUTING_KEYS.TRACK, payload, commandProperties);
  }

  async produceUntrackRepo(
    repoId: number,
    messageProperties: CommandMessageProperties,
  ): Promise<void> {
    const payload: UntrackRepositoryCommand = { repoId: repoId };
    const commandProperties: RepositoryCommandProperties = {
      correlationId: messageProperties.correlationId.toString(),
      replyTo: SUBSCRIBE_SAGA_REPLIES_QUEUE,
    };
    await this.produce(REPOSITORY_COMMANDS_ROUTING_KEYS.UNTRACK, payload, commandProperties);
  }

  private async produce<T>(
    routingKey: string,
    payload: T,
    messageProperties?: Partial<MessageProperties>,
  ): Promise<void> {
    await this.channelWrapper.publish(this.exchange, routingKey, payload, {
      persistent: true,
      ...messageProperties,
    });
  }
}
