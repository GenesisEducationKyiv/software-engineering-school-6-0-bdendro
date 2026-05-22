import type { APIRequestContext } from '@playwright/test';

interface GithubRepoApiResponse {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
}

interface GithubRepoReleaseApiResponse {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
}

interface MessageResponse {
  message: string;
}

type WireMockHeaders = Record<string, string>;

interface WireMockResponse<T extends object = object> {
  status: number;
  headers?: WireMockHeaders;
  body?: T;
}

interface WireMockMapping {
  request: {
    method: string;
    urlPath: string;
  };
  response: WireMockResponse;
}

export function createGithubRepoResponse(
  repo: string,
  overrides?: Partial<GithubRepoApiResponse>,
): GithubRepoApiResponse {
  return {
    id: 1,
    full_name: repo,
    private: false,
    html_url: `https://github.com/${repo}`,
    ...overrides,
  };
}

export function createGithubRepoReleaseResponse(
  repo: string,
  overrides?: Partial<GithubRepoReleaseApiResponse>,
): GithubRepoReleaseApiResponse {
  const tagName = overrides?.tag_name ?? 'v26.2.0';
  return {
    id: 1,
    tag_name: tagName,
    name: tagName,
    html_url: `https://github.com/${repo}/releases/tag/${tagName}`,
    published_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export class GithubApiMock {
  constructor(
    private readonly wireMockBaseUrl: string,
    private readonly request: APIRequestContext,
  ) {}

  async reset(): Promise<void> {
    const response = await this.request.post(`${this.wireMockBaseUrl}/__admin/reset`);

    if (!response.ok()) {
      throw new Error(`Failed to reset WireMock. Status: ${response.status()}`);
    }
  }

  async mockRepository(repo: string, responseBody: GithubRepoApiResponse): Promise<void> {
    await this.addMapping({
      request: {
        method: 'GET',
        urlPath: `/repos/${repo}`,
      },
      response: {
        status: 200,
        headers: this.jsonHeaders(),
        body: responseBody,
      },
    });
  }

  async mockRepoRelease(repo: string, responseBody: GithubRepoReleaseApiResponse): Promise<void> {
    await this.addMapping({
      request: {
        method: 'GET',
        urlPath: `/repos/${repo}/releases/latest`,
      },
      response: {
        status: 200,
        headers: this.jsonHeaders(),
        body: responseBody,
      },
    });
  }

  async mockRepositoryError(
    repo: string,
    response: WireMockResponse<MessageResponse>,
  ): Promise<void> {
    await this.addMapping({
      request: {
        method: 'GET',
        urlPath: `/repos/${repo}`,
      },
      response: {
        ...response,
        headers: { ...response.headers, ...this.jsonHeaders() },
      },
    });
  }

  async mockRepoReleaseError(
    repo: string,
    response: WireMockResponse<MessageResponse>,
  ): Promise<void> {
    await this.addMapping({
      request: {
        method: 'GET',
        urlPath: `/repos/${repo}/releases/latest`,
      },
      response: {
        ...response,
        headers: { ...response.headers, ...this.jsonHeaders() },
      },
    });
  }

  private async addMapping(mapping: WireMockMapping): Promise<void> {
    const response = await this.request.post(`${this.wireMockBaseUrl}/__admin/mappings`, {
      data: mapping,
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to add WireMock mapping. Status: ${response.status()}. Body: ${body}`,
      );
    }
  }

  private jsonHeaders(): WireMockHeaders {
    return {
      'Content-Type': 'application/json',
    };
  }
}
