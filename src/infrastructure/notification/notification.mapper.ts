import { RepositoryRelease } from '../../../libs/contracts/notification/notification.contract';
import { GithubRelease } from '../../modules/github';

export class NotificationClientMapper {
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
