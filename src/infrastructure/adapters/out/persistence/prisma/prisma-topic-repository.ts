import { randomUUID } from 'node:crypto';
import { Topic, TopicTranslations } from '../../../../../domain/entities/topic';
import { LOCALES, Locale } from '../../../../../domain/value-objects/locale';
import { Slug } from '../../../../../domain/value-objects/slug';
import { TopicRepository } from '../../../../../application/ports/out/topics/topic-repository';
import { PrismaContext } from './prisma-context';
import { fromDbLocale, toDbLocale } from './prisma-mappers';

interface TopicRow {
  id: string;
  slug: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  translations: { locale: 'en' | 'pt_BR'; name: string; description: string | null }[];
}

function toDomain(row: TopicRow): Topic {
  const translations = Object.fromEntries(
    row.translations.map((t) => [
      fromDbLocale(t.locale),
      { name: t.name, description: t.description },
    ]),
  ) as TopicTranslations;
  return Topic.restore(
    row.id,
    Slug.of(row.slug),
    row.position,
    translations,
    row.createdAt,
    row.updatedAt,
  );
}

export class PrismaTopicRepository implements TopicRepository {
  constructor(private readonly context: PrismaContext) {}

  async findById(id: string): Promise<Topic | null> {
    const row = await this.context.client.topic.findUnique({
      where: { id },
      include: { translations: true },
    });
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Topic[]> {
    const rows = await this.context.client.topic.findMany({
      include: { translations: true },
      orderBy: { position: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findByIds(ids: string[]): Promise<Topic[]> {
    const rows = await this.context.client.topic.findMany({
      where: { id: { in: ids } },
      include: { translations: true },
    });
    const byId = new Map(rows.map((row) => [row.id, toDomain(row)]));
    return ids.flatMap((id) => {
      const topic = byId.get(id);
      return topic ? [topic] : [];
    });
  }

  async save(topic: Topic): Promise<void> {
    const translations = topic.translations;
    await this.context.client.topic.upsert({
      where: { id: topic.id },
      create: {
        id: topic.id,
        slug: topic.slug.value,
        position: topic.position,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        translations: {
          create: LOCALES.map((locale) => ({
            id: randomUUID(),
            locale: toDbLocale(locale),
            name: translations[locale].name,
            description: translations[locale].description,
          })),
        },
      },
      update: {
        position: topic.position,
        updatedAt: topic.updatedAt,
        translations: {
          upsert: LOCALES.map((locale) => ({
            where: { topicId_locale: { topicId: topic.id, locale: toDbLocale(locale) } },
            create: {
              id: randomUUID(),
              locale: toDbLocale(locale),
              name: translations[locale].name,
              description: translations[locale].description,
            },
            update: {
              name: translations[locale].name,
              description: translations[locale].description,
            },
          })),
        },
      },
    });
  }

  async saveAll(topics: Topic[]): Promise<void> {
    await this.context.run(async () => {
      for (const topic of topics) await this.save(topic);
    });
  }

  async delete(id: string): Promise<void> {
    await this.context.client.topic.deleteMany({ where: { id } });
  }

  async existsByName(locale: Locale, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.context.client.topicTranslation.count({
      where: {
        locale: toDbLocale(locale),
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(excludeId ? { topicId: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    const count = await this.context.client.topic.count({ where: { slug: slug.value } });
    return count > 0;
  }
}
