export type RequestBodyParseError = Error & {
  status: number;
  type: string;
};

export function isRequestBodyParseError(err: unknown): err is RequestBodyParseError {
  return (
    err instanceof Error &&
    'type' in err &&
    err.type === 'entity.parse.failed' &&
    'status' in err &&
    err.status === 400
  );
}
