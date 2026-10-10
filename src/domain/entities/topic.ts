import { ValidationError } from '../errors/validation-error';
import { Locale, LOCALES } from '../value-objects/locale';
import { Slug } from '../value-objects/slug';

export type TopicTranslations = Record<Locale, { name: string; description: string | null }>;

function copyTranslations(translations: TopicTranslations): TopicTranslations {
  return Object.fromEntries(LOCALES.map((l) => [l, { ...translations[l] }])) as TopicTranslations;
}

export class Topic {
  private constructor(
    readonly id: string,
    readonly slug: Slug,
    private _position: number,
    private _translations: TopicTranslations,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(id: string, translations: TopicTranslations, position: number, now: Date): Topic {
    Topic.assertTranslations(translations);
    Topic.assertPosition(position);
    return new Topic(
      id,
      Slug.fromName(translations.en.name),
      position,
      copyTranslations(translations),
      now,
      now,
    );
  }

  static restore(
    id: string,
    slug: Slug,
    position: number,
    translations: TopicTranslations,
    createdAt: Date,
    updatedAt: Date,
  ): Topic {
    return new Topic(id, slug, position, translations, createdAt, updatedAt);
  }

  rename(translations: TopicTranslations, now: Date): void {
    Topic.assertTranslations(translations);
    this._translations = copyTranslations(translations);
    this._updatedAt = now;
  }

  moveTo(position: number, now: Date): void {
    Topic.assertPosition(position);
    this._position = position;
    this._updatedAt = now;
  }

  nameIn(locale: Locale): string {
    return this._translations[locale]?.name ?? this._translations.en.name;
  }

  get position(): number {
    return this._position;
  }

  get translations(): TopicTranslations {
    return copyTranslations(this._translations);
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  private static assertTranslations(translations: TopicTranslations): void {
    const missing = LOCALES.filter((l) => !translations[l]?.name?.trim());
    if (missing.length) {
      throw new ValidationError(
        missing.map((l) => ({ field: `translations.${l}.name`, code: 'MISSING_TRANSLATION' })),
      );
    }
  }

  private static assertPosition(position: number): void {
    if (!Number.isInteger(position) || position < 0) {
      throw new ValidationError([{ field: 'position', code: 'OUT_OF_RANGE' }]);
    }
  }
}
