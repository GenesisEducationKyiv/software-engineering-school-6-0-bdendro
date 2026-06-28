export const REPOSITORY_RELEASE_EVENT_ROUTING_KEYS = {
  DETECTED: 'repository.release.detected',
} as const;

export const REPOSITORY_EVENT_ROUTING_KEYS = {
  TRACKED: 'repository.tracked',
  UPDATED: 'repository.updated',
  UNTRACKED: 'repository.untracked',
} as const;
