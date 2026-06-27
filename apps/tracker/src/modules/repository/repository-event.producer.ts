import {
  RepositoryTrackedEvent,
  RepositoryUntrackedEvent,
  RepositoryUpdatedEvent,
} from '../../../../../libs/contracts/tracker/events/repository.produce.contract';
import { REPOSITORY_EVENT_ROUTING_KEYS } from '../../../../../libs/contracts/tracker/events/routing-keys';
import { MessageProducerInterface } from '../../../../../libs/infrastructure/message-broker/interfaces/message.producer.interface';
import { Repository } from './types/repository';

type RepositoryId = Repository['id'];

export class RepositoryEventProducer {
  constructor(private readonly messageProducer: MessageProducerInterface) {}

  async produceRepositoryTracked(repository: Repository): Promise<void> {
    const payload: RepositoryTrackedEvent = {
      id: repository.id,
      repo: repository.repo,
      lastSeenTag: repository.lastSeenTag,
      createdAt: repository.createdAt.toISOString(),
    };
    await this.messageProducer.produce(REPOSITORY_EVENT_ROUTING_KEYS.TRACKED, payload);
  }

  async produceRepositoryUpdated(repository: Repository): Promise<void> {
    const payload: RepositoryUpdatedEvent = {
      id: repository.id,
      repo: repository.repo,
      lastSeenTag: repository.lastSeenTag,
      createdAt: repository.createdAt.toISOString(),
    };
    await this.messageProducer.produce(REPOSITORY_EVENT_ROUTING_KEYS.UPDATED, payload);
  }

  async produceRepositoryUntracked(id: RepositoryId): Promise<void> {
    const payload: RepositoryUntrackedEvent = { id };
    await this.messageProducer.produce(REPOSITORY_EVENT_ROUTING_KEYS.UNTRACKED, payload);
  }
}
