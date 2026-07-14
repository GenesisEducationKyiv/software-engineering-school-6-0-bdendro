import { RepositoryRelease } from '../../github/types/repository-release';

export interface RepositoryReleaseEventProducerInterface {
  produceSubscriptionRepositoryRelease(release: RepositoryRelease): Promise<void>;
}
