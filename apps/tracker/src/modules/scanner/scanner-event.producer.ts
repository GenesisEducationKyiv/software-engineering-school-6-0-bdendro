import { REPOSITORY_RELEASE_EVENT_ROUTING_KEYS } from '../../../../../libs/contracts/tracker/events/routing-keys';
import { RepositoryReleaseDetectedEvent } from '../../../../../libs/contracts/tracker/events/scanner.produce.contract';
import { MessageProducerInterface } from '../../../../../libs/infrastructure/message-broker/interfaces/message.producer.interface';
import { GithubRelease } from '../github';
import { RepositoryReleaseEventProducerInterface } from './interfaces/scanner-event.producer.interface';
import { ScannerProducerMapper } from './mappers/scanner-producer.mapper';

export class ScannerEventProducer implements RepositoryReleaseEventProducerInterface {
  constructor(
    private readonly messageProducer: MessageProducerInterface,
    private readonly mapper: ScannerProducerMapper,
  ) {}

  async produceSubscriptionRepositoryRelease(release: GithubRelease): Promise<void> {
    const payload: RepositoryReleaseDetectedEvent = this.mapper.toRepositoryRelease(release);
    await this.messageProducer.produce(REPOSITORY_RELEASE_EVENT_ROUTING_KEYS.DETECTED, payload);
  }
}
