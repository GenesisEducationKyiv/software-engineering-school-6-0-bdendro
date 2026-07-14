import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { type RabbitMqConnection } from './rabbitmq.connection';

export class RabbitMqDlxProducer {
  private readonly channelWrapper: ChannelWrapper;

  constructor(
    connection: RabbitMqConnection,
    private readonly exchange: string,
    private readonly queue: string,
  ) {
    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await Promise.all([
          channel.assertExchange(this.exchange, 'topic', { durable: true }),
          channel.assertQueue(this.queue, { durable: true }),
        ]);

        await channel.bindQueue(this.queue, this.exchange, '#');
      },
    });
  }

  async produceToDlx(originalMessage: ConsumeMessage, reason?: string): Promise<void> {
    const properties = originalMessage.properties || {};
    const headers = properties.headers || {};

    const routingKey = originalMessage.fields.routingKey;

    await this.channelWrapper.publish(this.exchange, routingKey, originalMessage.content, {
      ...properties,
      persistent: true,
      headers: {
        ...headers,
        'x-error-reason': reason || 'Unknown error',
      },
    });
  }

  async close(): Promise<void> {
    await this.channelWrapper.close();
  }
}
