import { RepositoryReleaseDetectedEvent } from '../../../../../../libs/contracts/tracker/messaging/release.events';
import { RepositoryRelease } from '../../github/types/repository-release';

export class ScannerProducerMapper {
  constructor() {}

  toRepositoryRelease(release: RepositoryRelease): RepositoryReleaseDetectedEvent {
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
