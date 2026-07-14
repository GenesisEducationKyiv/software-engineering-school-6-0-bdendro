import { Response } from 'express';
import { RequestWithValidatedParams } from '../../../../libs/common/types/validated-request';
import { GithubServiceInterface } from './interfaces/github.service.interface';
import {
  GithubReleaseResponse,
  RepoExistenceResponse,
  RepoParams,
} from '../../../../libs/contracts/github/rest/github.contract';
import { NotFoundError } from '../../../../libs/common/utils/errors/custom-errors';
import { GITHUB_ERROR_MESSAGES } from './constants/error-messages';
import { concatOwnerRepo } from './utils/github';

export class GithubController {
  constructor(private readonly githubService: GithubServiceInterface) {}
  async isRepositoryExists(
    req: RequestWithValidatedParams<RepoParams>,
    res: Response<RepoExistenceResponse>,
  ): Promise<void> {
    const { repo, owner } = req.validated.params;
    const ownerRepo = concatOwnerRepo(owner, repo);
    const isRepositoryExists = await this.githubService.isRepoExists(ownerRepo);
    res.status(200).json({ exists: isRepositoryExists });
  }

  async getLatestRelease(
    req: RequestWithValidatedParams<RepoParams>,
    res: Response<GithubReleaseResponse>,
  ): Promise<void> {
    const { repo, owner } = req.validated.params;
    const ownerRepo = concatOwnerRepo(owner, repo);
    const release = await this.githubService.getLastRelease(ownerRepo);
    if (!release) throw new NotFoundError(GITHUB_ERROR_MESSAGES.RELEASE_NOT_FOUND);
    res.status(200).json(release);
  }
}
