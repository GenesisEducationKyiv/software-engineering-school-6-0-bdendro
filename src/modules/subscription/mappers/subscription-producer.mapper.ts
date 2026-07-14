import { RepositoryRelease } from '../../../../libs/contracts/notification/notification.contract';
import { RepositoryReleaseDetectedEvent } from '../schemas/repository-release.schema';

export class SubscriptionProducerMapper {
  constructor() {}

  toRepositoryRelease(release: RepositoryReleaseDetectedEvent): RepositoryRelease {
    return {
      id: release.id,
      repoName: release.repoName,
      tagName: release.tagName,
      name: release.name,
      htmlUrl: release.htmlUrl,
      publishedAt: release.publishedAt,
    };
  }
}
