import { Clock } from '../../src/application/ports/out/clock';
import { IdGenerator } from '../../src/application/ports/out/id-generator';

export class FakeClock implements Clock {
  constructor(private current: Date = new Date('2026-01-01T00:00:00Z')) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}

export class FakeIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}
