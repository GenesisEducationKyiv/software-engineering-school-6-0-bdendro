import { RepositoryRelease } from '../../../../libs/contracts/main/events/main.produce.contract';
import { GithubRelease } from '../../../../apps/tracker/src/modules/github';

export class SubscriptionProducerMapper {
  constructor() {}

  toRepositoryRelease(release: GithubRelease): RepositoryRelease {
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
