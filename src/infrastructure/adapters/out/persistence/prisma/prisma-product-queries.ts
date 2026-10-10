import { Locale } from '../../../../../domain/value-objects/locale';
import {
  ProductListFilter,
  ProductQueries,
} from '../../../../../application/ports/out/products/product-queries';
import {
  AdminProductListItem,
  ProductDetail,
  ProductListItem,
} from '../../../../../application/read-models/product-item';
import { PrismaContext } from './prisma-context';
import { toDbLocale } from './prisma-mappers';

const productInclude = {
  review: true,
  topics: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      slug: true,
      translations: { select: { locale: true, name: true } },
    },
  },
} as const;

type ProductRow = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  status: 'PUBLISHED' | 'COMING_SOON';
  upvotes: number;
  review: { rating: number } | null;
  topics: {
    id: string;
    slug: string;
    translations: { locale: 'en' | 'pt_BR'; name: string }[];
  }[];
};

function toListItem(row: ProductRow, locale: Locale): ProductListItem {
  const dbLocale = toDbLocale(locale);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    imageUrl: row.imageUrl,
    status: row.status,
    upvotes: row.upvotes,
    topics: row.topics.map((topic) => ({
      id: topic.id,
      name:
        topic.translations.find((t) => t.locale === dbLocale)?.name ??
        topic.translations.find((t) => t.locale === 'en')?.name ??
        topic.slug,
      slug: topic.slug,
    })),
    review: row.review ? { rating: row.review.rating } : null,
  };
}

export class PrismaProductQueries implements ProductQueries {
  constructor(private readonly context: PrismaContext) {}

  async listPublic(filter: ProductListFilter, locale: Locale): Promise<ProductListItem[]> {
    const rows = await this.context.client.product.findMany({
      where: {
        status: filter.status,
        ...(filter.topicSlug ? { topics: { some: { slug: filter.topicSlug } } } : {}),
        ...(filter.reviewed === undefined
          ? {}
          : { review: filter.reviewed ? { isNot: null } : { is: null } }),
      },
      include: productInclude,
      orderBy:
        filter.status === 'PUBLISHED'
          ? [{ upvotes: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => toListItem(row, locale));
  }

  async getById(id: string, locale: Locale): Promise<ProductDetail | null> {
    const row = await this.context.client.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!row) return null;
    return {
      ...toListItem(row, locale),
      longDescription: row.longDescription,
      createdAt: row.createdAt,
      review: row.review ? { rating: row.review.rating, summary: row.review.summary } : null,
    };
  }

  async listForAdmin(locale: Locale): Promise<AdminProductListItem[]> {
    const rows = await this.context.client.product.findMany({
      include: productInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      ...toListItem(row, locale),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }
}
