export interface RateLimiterInterface {
  isBlocked(now?: Date): boolean;
  blockUntil(date: Date): void;
  getRetryAfterSeconds(now?: Date): number;
  unblock(): void;
}

export class RateLimiter implements RateLimiterInterface {
  protected blockedUntil: Date | null = null;
  constructor() {}

  blockUntil(date: Date): void {
    if (!this.blockedUntil || this.blockedUntil < date) this.blockedUntil = date;
  }

  isBlocked(now: Date = new Date()): boolean {
    this.clearIfExpired(now);
    return !!this.blockedUntil && now < this.blockedUntil;
  }

  getRetryAfterSeconds(now: Date = new Date()): number {
    this.clearIfExpired(now);

    if (!this.blockedUntil) {
      return 0;
    }

    const diffMs = this.blockedUntil.getTime() - now.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }

  unblock(): void {
    this.blockedUntil = null;
  }

  protected clearIfExpired(now: Date = new Date()): void {
    if (this.blockedUntil && now >= this.blockedUntil) this.blockedUntil = null;
  }
}
