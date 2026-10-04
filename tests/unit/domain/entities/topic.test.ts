import { describe, expect, it } from 'vitest';
import { Topic, TopicTranslations } from '../../../../src/domain/entities/topic';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { Slug } from '../../../../src/domain/value-objects/slug';

const created = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

function translations(): TopicTranslations {
  return {
    en: { name: 'Productivity', description: 'Get more done' },
    'pt-BR': { name: 'Produtividade', description: null },
  };
}

function fieldErrors(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationError) return error.fieldErrors;
    throw error;
  }
  throw new Error('Expected ValidationError');
}

describe('Topic', () => {
  describe('create', () => {
    it('derives the slug from the English name and stamps both timestamps with now', () => {
      const topic = Topic.create('t1', translations(), 2, created);

      expect(topic.slug.value).toBe('productivity');
      expect(topic.position).toBe(2);
      expect(topic.createdAt).toBe(created);
      expect(topic.updatedAt).toBe(created);
    });

    it('requires a name in every locale', () => {
      const t = translations();
      t['pt-BR'].name = '  ';
      t.en.name = '';

      expect(fieldErrors(() => Topic.create('t1', t, 0, created))).toEqual([
        { field: 'translations.en.name', code: 'MISSING_TRANSLATION' },
        { field: 'translations.pt-BR.name', code: 'MISSING_TRANSLATION' },
      ]);
    });

    it.each([-1, 1.5, Number.NaN])('rejects position %s', (position) => {
      expect(fieldErrors(() => Topic.create('t1', translations(), position, created))).toEqual([
        { field: 'position', code: 'OUT_OF_RANGE' },
      ]);
    });

    it('is not affected by later changes to the object it was given', () => {
      const t = translations();
      const topic = Topic.create('t1', t, 0, created);

      t.en.name = 'Changed';

      expect(topic.nameIn('en')).toBe('Productivity');
    });
  });

  describe('restore', () => {
    it('rehydrates the stored state without validating', () => {
      const t = translations();
      t['pt-BR'].name = '';
      const topic = Topic.restore('t1', Slug.of('productivity'), 3, t, created, later);

      expect(topic.slug.value).toBe('productivity');
      expect(topic.position).toBe(3);
      expect(topic.updatedAt).toBe(later);
    });
  });

  describe('rename', () => {
    it('changes the names, bumps updatedAt and keeps the slug', () => {
      const topic = Topic.create('t1', translations(), 0, created);
      const renamed = translations();
      renamed.en.name = 'Getting Things Done';

      topic.rename(renamed, later);

      expect(topic.nameIn('en')).toBe('Getting Things Done');
      expect(topic.slug.value).toBe('productivity');
      expect(topic.updatedAt).toBe(later);
    });

    it('keeps the previous state when a translation is missing', () => {
      const topic = Topic.create('t1', translations(), 0, created);
      const invalid = translations();
      invalid['pt-BR'].name = '';

      expect(() => topic.rename(invalid, later)).toThrow(ValidationError);
      expect(topic.nameIn('pt-BR')).toBe('Produtividade');
      expect(topic.updatedAt).toBe(created);
    });
  });

  describe('moveTo', () => {
    it('changes the position and bumps updatedAt', () => {
      const topic = Topic.create('t1', translations(), 0, created);

      topic.moveTo(4, later);

      expect(topic.position).toBe(4);
      expect(topic.updatedAt).toBe(later);
    });

    it('rejects an invalid position and keeps the previous one', () => {
      const topic = Topic.create('t1', translations(), 1, created);

      expect(() => topic.moveTo(-1, later)).toThrow(ValidationError);
      expect(topic.position).toBe(1);
      expect(topic.updatedAt).toBe(created);
    });
  });

  describe('nameIn', () => {
    it('returns the name for each locale', () => {
      const topic = Topic.create('t1', translations(), 0, created);

      expect(topic.nameIn('en')).toBe('Productivity');
      expect(topic.nameIn('pt-BR')).toBe('Produtividade');
    });

    it('falls back to English when a stored locale is missing', () => {
      const partial = { en: { name: 'AI', description: null } } as TopicTranslations;
      const topic = Topic.restore('t1', Slug.of('ai'), 0, partial, created, created);

      expect(topic.nameIn('pt-BR')).toBe('AI');
    });
  });

  describe('translations', () => {
    it('returns a copy that cannot change the topic', () => {
      const topic = Topic.create('t1', translations(), 0, created);

      topic.translations.en.name = 'Hacked';

      expect(topic.nameIn('en')).toBe('Productivity');
    });
  });
});
