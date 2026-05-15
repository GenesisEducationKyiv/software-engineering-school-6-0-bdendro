import { GithubService } from './github.service';
import { GithubClientInterface } from './interfaces/github.client.interface';

describe('GithubService', () => {
  let githubService: GithubService;
  let githubClient: jest.Mocked<GithubClientInterface>;

  const repo = 'owner/repo';

  const githubRepo = {
    id: 1,
    full_name: 'full_name',
    private: false,
    html_url: 'html_url',
  } as const;

  const githubRelease = {
    id: 1,
    tag_name: 'tag_name',
    name: 'name',
    html_url: 'html_url',
    body: 'body',
    published_at: 'published_at',
  } as const;

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

    it('should map latest release data to service response DTO', async () => {
      githubClient.getLatestRelease.mockResolvedValue(githubRelease);
      const expected = {
        repo,
        lastSeenTag: githubRelease.tag_name,
        htmlUrl: githubRelease.html_url,
        publishedAt: githubRelease.published_at,
      };

      const result = await githubService.getLastRelease(repo);

      expect(githubClient.getLatestRelease).toHaveBeenCalledWith(repo);
      expect(result).toEqual(expected);
    });
  });
});
