import { Product } from '../../../../../domain/entities/product';
import { Review } from '../../../../../domain/entities/review';
import { Locale } from '../../../../../domain/value-objects/locale';
import {
  ProductListFilter,
  ProductQueries,
} from '../../../../../application/ports/out/products/product-queries';
import { ReviewRepository } from '../../../../../application/ports/out/reviews/review-repository';
import { TopicRepository } from '../../../../../application/ports/out/topics/topic-repository';
import {
  AdminProductListItem,
  ProductDetail,
  ProductListItem,
} from '../../../../../application/read-models/product-item';
import { InMemoryProductRepository } from './in-memory-product-repository';

const byRanking = (a: Product, b: Product) =>
  b.upvotes - a.upvotes || b.createdAt.getTime() - a.createdAt.getTime();

const byNewest = (a: Product, b: Product) => b.createdAt.getTime() - a.createdAt.getTime();

export class InMemoryProductQueries implements ProductQueries {
  constructor(
    private readonly products: InMemoryProductRepository,
    private readonly topics: TopicRepository,
    private readonly reviews: ReviewRepository,
  ) {}

  async listPublic(filter: ProductListFilter, locale: Locale): Promise<ProductListItem[]> {
    const topic = filter.topicSlug
      ? (await this.topics.findAll()).find((item) => item.slug.value === filter.topicSlug)
      : undefined;
    if (filter.topicSlug && !topic) return [];

    const matching: Product[] = [];
    for (const product of await this.products.findAll()) {
      if (product.status !== filter.status) continue;
      if (topic && !product.hasTopic(topic.id)) continue;
      if (filter.reviewed !== undefined) {
        const hasReview = (await this.reviews.findByProductId(product.id)) !== null;
        if (hasReview !== filter.reviewed) continue;
      }
      matching.push(product);
    }

    matching.sort(filter.status === 'PUBLISHED' ? byRanking : byNewest);
    return Promise.all(matching.map((product) => this.toListItem(product, locale)));
  }

  async getById(id: string, locale: Locale): Promise<ProductDetail | null> {
    const product = await this.products.findById(id);
    if (!product) return null;

    const item = await this.toListItem(product, locale);
    const review = await this.reviews.findByProductId(product.id);
    return {
      ...item,
      longDescription: product.longDescription,
      createdAt: product.createdAt,
      review: review ? { rating: review.rating, summary: review.summary } : null,
    };
  }

  async listForAdmin(locale: Locale): Promise<AdminProductListItem[]> {
    const all = (await this.products.findAll()).sort(byNewest);
    return Promise.all(
      all.map(async (product) => ({
        ...(await this.toListItem(product, locale)),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
    );
  }

  private async toListItem(product: Product, locale: Locale): Promise<ProductListItem> {
    const topics = await this.topics.findByIds(product.topicIds);
    const review: Review | null = await this.reviews.findByProductId(product.id);
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      url: product.url,
      imageUrl: product.imageUrl,
      status: product.status,
      upvotes: product.upvotes,
      topics: topics.map((topic) => ({
        id: topic.id,
        name: topic.nameIn(locale),
        slug: topic.slug.value,
      })),
      review: review ? { rating: review.rating } : null,
    };
  }
}
