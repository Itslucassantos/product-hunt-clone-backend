import type { Logger } from '../../../logging/logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(
    private readonly logger: Logger,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 5000;
  }

  get isOpen(): boolean {
    return Date.now() < this.openUntil;
  }

  async run<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (this.isOpen) return fallback;
    try {
      const result = await operation();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      this.logger.warn({ err: error, failures: this.failures }, 'redis call failed');
      if (this.failures >= this.failureThreshold) {
        this.openUntil = Date.now() + this.cooldownMs;
        this.failures = 0;
        this.logger.warn({ cooldownMs: this.cooldownMs }, 'redis circuit opened');
      }
      return fallback;
    }
  }
}
