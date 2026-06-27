import { GithubRelease } from '../../github';

export interface RepositoryReleaseEventProducerInterface {
  produceSubscriptionRepositoryRelease(release: GithubRelease): Promise<void>;
}
