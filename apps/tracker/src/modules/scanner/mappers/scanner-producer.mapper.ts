import { RepositoryReleaseDetectedEvent } from '../../../../../../libs/contracts/tracker/messaging/release.events';
import { GithubRelease } from '../../github';

export class ScannerProducerMapper {
  constructor() {}

  toRepositoryRelease(release: GithubRelease): RepositoryReleaseDetectedEvent {
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
