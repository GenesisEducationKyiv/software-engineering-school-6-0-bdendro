import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { MessageProducerInterface } from './interfaces/message.producer.interface';
import { type RabbitMqConnection } from './rabbitmq.connection';

export class RabbitMqProducer implements MessageProducerInterface {
  private readonly channelWrapper: ChannelWrapper;

  constructor(
    connection: RabbitMqConnection,
    private readonly exchange: string,
  ) {
    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });
  }

  async produce<T>(routingKey: string, payload: T): Promise<void> {
    await this.channelWrapper.publish(this.exchange, routingKey, payload, { persistent: true });
  }

  async close(): Promise<void> {
    await this.channelWrapper.close();
  }
}
