export interface MessageProducerInterface {
  produce<T>(routingKey: string, payload: T): Promise<void>;
}
