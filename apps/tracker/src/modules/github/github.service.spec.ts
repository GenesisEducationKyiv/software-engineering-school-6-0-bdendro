import { GithubService } from './github.service';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubRelease } from './types/github-release';
import { GithubRepository } from './types/github-repository';

describe('GithubService', () => {
  let githubService: GithubService;
  let githubClient: jest.Mocked<GithubClientInterface>;

  const repo = 'owner/repo';

  const githubRepo: GithubRepository = {
    id: 1,
    repoName: 'repo_name',
    private: false,
    htmlUrl: 'html_url',
  };

  const githubRelease: GithubRelease = {
    id: 1,
    repoName: 'repo_name',
    tagName: 'tag_name',
    name: 'name',
    htmlUrl: 'html_url',
    publishedAt: 'published_at',
  };

  beforeAll(() => {
    githubClient = {
      getRepository: jest.fn(),
      getLatestRelease: jest.fn(),
    } as jest.Mocked<GithubClientInterface>;

    githubService = new GithubService(githubClient);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isRepositoryExists', () => {
    it('should return true when repository exists', async () => {
      githubClient.getRepository.mockResolvedValue(githubRepo);

      const result = await githubService.isRepositoryExists(repo);

      expect(githubClient.getRepository).toHaveBeenCalledWith(repo);
      expect(result).toBe(true);
    });

    it('should return false when repository does not exist', async () => {
      githubClient.getRepository.mockResolvedValue(null);

      const result = await githubService.isRepositoryExists(repo);

      expect(githubClient.getRepository).toHaveBeenCalledWith(repo);
      expect(result).toBe(false);
    });
  });

  describe('getLastRelease', () => {
    it('should return null when latest release does not exist', async () => {
      githubClient.getLatestRelease.mockResolvedValue(null);

      const result = await githubService.getLastRelease(repo);

      expect(githubClient.getLatestRelease).toHaveBeenCalledWith(repo);
      expect(result).toBeNull();
    });

    it('should return latest release', async () => {
      githubClient.getLatestRelease.mockResolvedValue(githubRelease);

      const result = await githubService.getLastRelease(repo);

      expect(githubClient.getLatestRelease).toHaveBeenCalledWith(repo);
      expect(result).toEqual(githubRelease);
    });
  });
});
