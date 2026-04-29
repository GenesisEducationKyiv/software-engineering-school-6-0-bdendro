export interface RateLimiterInterface {
  isBlocked(now?: Date): boolean;
  blockUntil(date: Date): void;
  getRetryAfterSeconds(now?: Date): number;
  clearIfExpired(now?: Date): void;
}

export class RateLimiter implements RateLimiterInterface {
  protected blockedUntil: Date | null = null;
  constructor() {}

  blockUntil(date: Date): void {
    if (!this.blockedUntil || this.blockedUntil < date) this.blockedUntil = date;
  }

  isBlocked(now: Date = new Date()): boolean {
    this.clearIfExpired();
    return !!this.blockedUntil && now < this.blockedUntil;
  }

  getRetryAfterSeconds(now: Date = new Date()): number {
    if (!this.blockedUntil) {
      return 0;
    }

    const diffMs = this.blockedUntil.getTime() - now.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }

  clearIfExpired(now: Date = new Date()): void {
    if (this.blockedUntil && now >= this.blockedUntil) this.blockedUntil = null;
  }

  protected clear(): void {
    this.blockedUntil = null;
  }
}
