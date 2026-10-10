import { TopicUsageQueries } from '../../../../../application/ports/out/topics/topic-usage-queries';
import { PrismaContext } from './prisma-context';

export class PrismaTopicUsageQueries implements TopicUsageQueries {
  constructor(private readonly context: PrismaContext) {}

  async findProductsByTopic(topicId: string, limit: number) {
    const where = { topics: { some: { id: topicId } } };
    const [rows, total] = await Promise.all([
      this.context.client.product.findMany({
        where,
        select: { id: true, title: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit,
      }),
      this.context.client.product.count({ where }),
    ]);
    return { items: rows.map((row) => ({ productId: row.id, title: row.title })), total };
  }
}
