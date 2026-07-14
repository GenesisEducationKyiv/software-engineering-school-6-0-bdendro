export function parseFullRepoName(fullRepoName: string): { owner: string; repo: string } {
  const [owner, repo] = fullRepoName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository name format. Expected "owner/repo", got "${fullRepoName}"`);
  }
  return { owner, repo };
}
