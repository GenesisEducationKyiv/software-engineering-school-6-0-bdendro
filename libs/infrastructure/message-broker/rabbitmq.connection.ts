import { connect, type AmqpConnectionManager } from 'amqp-connection-manager';
import { AppLogger } from '../logger/interfaces/logger.interface';

export type RabbitMqConnection = AmqpConnectionManager;

export function createRabbitMqConnection(
  rabbitMqUrl: string,
  logger: AppLogger,
): RabbitMqConnection {
  const connection = connect(rabbitMqUrl);

  connection.on('connect', () => {
    logger.info(`RabbitMQ successfully connected.`);
  });

  connection.on('connectFailed', (params) => {
    logger.error({ err: params.err }, 'RabbitMQ connection failed.');
  });

  connection.on('disconnect', (params) => {
    logger.error({ err: params.err }, `RabbitMQ disconnected. Retrying...`);
  });

  return connection;
}
