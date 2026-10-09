import { Locale } from '../../../../../domain/value-objects/locale';
import { TopicQueries } from '../../../../../application/ports/out/topics/topic-queries';
import { TopicItem } from '../../../../../application/read-models/topic-item';
import { PrismaContext } from './prisma-context';
import { toDbLocale } from './prisma-mappers';

export class PrismaTopicQueries implements TopicQueries {
  constructor(private readonly context: PrismaContext) {}

  async list(locale: Locale): Promise<TopicItem[]> {
    const dbLocale = toDbLocale(locale);
    const rows = await this.context.client.topic.findMany({
      include: { translations: true, _count: { select: { products: true } } },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => {
      const translation =
        row.translations.find((t) => t.locale === dbLocale) ??
        row.translations.find((t) => t.locale === 'en');
      return {
        id: row.id,
        slug: row.slug,
        name: translation?.name ?? row.slug,
        description: translation?.description ?? null,
        position: row.position,
        productCount: row._count.products,
      };
    });
  }
}
