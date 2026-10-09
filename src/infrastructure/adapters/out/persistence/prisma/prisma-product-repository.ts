import { Product } from '../../../../../domain/entities/product';
import { Upvotes } from '../../../../../domain/value-objects/upvotes';
import { ProductRepository } from '../../../../../application/ports/out/products/product-repository';
import { PrismaContext } from './prisma-context';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly context: PrismaContext) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.context.client.product.findUnique({
      where: { id },
      include: { topics: { select: { id: true } } },
    });
    if (!row) return null;
    return Product.restore(
      row.id,
      row.title,
      row.description,
      row.longDescription,
      row.url,
      row.imageUrl,
      row.status,
      Upvotes.of(row.upvotes),
      row.topics.map((topic) => topic.id),
      row.createdAt,
      row.updatedAt,
    );
  }

  async save(product: Product): Promise<void> {
    const data = {
      title: product.title,
      description: product.description,
      longDescription: product.longDescription,
      url: product.url,
      imageUrl: product.imageUrl,
      status: product.status,
      updatedAt: product.updatedAt,
    };
    const topics = product.topicIds.map((id) => ({ id }));

    await this.context.client.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        ...data,
        upvotes: product.upvotes,
        createdAt: product.createdAt,
        topics: { connect: topics },
      },
      update: {
        ...data,
        upvotes: { increment: product.pendingUpvoteDelta },
        topics: { set: topics },
      },
    });
    product.clearPendingUpvoteDelta();
  }

  async delete(id: string): Promise<void> {
    await this.context.client.product.deleteMany({ where: { id } });
  }

  async existsByTitle(title: string, excludeId?: string): Promise<boolean> {
    const count = await this.context.client.product.count({
      where: {
        title: { equals: title.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
