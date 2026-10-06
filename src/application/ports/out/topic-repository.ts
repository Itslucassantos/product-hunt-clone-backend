import { Topic } from '../../../domain/entities/topic';
import { Locale } from '../../../domain/value-objects/locale';
import { Slug } from '../../../domain/value-objects/slug';

export interface TopicRepository {
  findById(id: string): Promise<Topic | null>;
  findAll(): Promise<Topic[]>;
  save(topic: Topic): Promise<void>;
  saveAll(topics: Topic[]): Promise<void>;
  delete(id: string): Promise<void>;
  existsByName(locale: Locale, name: string, excludeId?: string): Promise<boolean>;
  existsBySlug(slug: Slug): Promise<boolean>;
}
