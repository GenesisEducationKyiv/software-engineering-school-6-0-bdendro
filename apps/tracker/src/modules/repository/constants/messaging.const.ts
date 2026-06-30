export const TRACKER_REPOSITORY_COMMAND_QUEUE = 'tracker.repository.commands_queue';

export const TRACKER_REPOSITORY_COMMAND_RETRY_QUEUE = 'tracker.repository.commands.retry_queue';

export const TRACKER_RETRY_TIME_IN_MS = {
  REPOSITORY_COMMANDS: 2_000,
} as const;
