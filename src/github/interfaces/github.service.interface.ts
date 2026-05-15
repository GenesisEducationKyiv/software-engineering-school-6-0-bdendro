import { GithubReleaseResponseInterface } from '../dto/github.response.dto';

export interface GithubServiceInterface {
  isRepositoryExists(repo: string): Promise<boolean>;
  getLastRelease(repo: string): Promise<GithubReleaseResponseInterface | null>;
}
