import { TopicUsageQueries } from '../../src/application/ports/out/topic-usage-queries';
import { BlockingProduct } from '../../src/domain/errors/topic-in-use-error';
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

export class FakeTopicUsageQueries implements TopicUsageQueries {
  private readonly blocking = new Map<string, BlockingProduct[]>();

  block(topicId: string, products: BlockingProduct[]): void {
    this.blocking.set(topicId, products);
  }

  async findProductsOnlyInTopic(topicId: string, limit: number) {
    const all = this.blocking.get(topicId) ?? [];
    return { items: all.slice(0, limit), total: all.length };
  }
}
