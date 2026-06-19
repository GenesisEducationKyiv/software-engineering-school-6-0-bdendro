export interface MessageConsumerInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
}
