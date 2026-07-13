export const EMAIL_VERIFICATION_ERROR_KIND = {
  AUTH: 'auth',
  CONNECTION: 'connection',
  UNKNOWN: 'unknown',
} as const;

export type EmailVerificationKind =
  (typeof EMAIL_VERIFICATION_ERROR_KIND)[keyof typeof EMAIL_VERIFICATION_ERROR_KIND];

export const EMAIL_ERROR_CODES = {
  AUTH: {
    FAILED: 'EAUTH',
    NOT_PROVIDED: 'ENOAUTH',
    OAUTH_TOKEN: 'EOAUTH2',
  },
  CONNECTION: {
    CLOSED: 'ECONNECTION',
    TIMED_OUT: 'ETIMEDOUT',
    DNS_RESOLUTION: 'EDNS',
    SOCKET: 'ESOCKET',
    TLS: 'ETLS',
  },
} as const;

export const EMAIL_ERROR_AUTH_CODES: readonly string[] = Object.values(EMAIL_ERROR_CODES.AUTH);
export const EMAIL_ERROR_CONNECTION_CODES: readonly string[] = Object.values(
  EMAIL_ERROR_CODES.CONNECTION,
);
