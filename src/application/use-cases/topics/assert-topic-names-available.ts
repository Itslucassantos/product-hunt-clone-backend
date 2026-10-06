import { TopicTranslations } from '../../../domain/entities/topic';
import { TopicAlreadyExistsError } from '../../../domain/errors/topic-already-exists-error';
import { LOCALES } from '../../../domain/value-objects/locale';
import { TopicRepository } from '../../ports/out/topic-repository';

export async function assertTopicNamesAvailable(
  topics: TopicRepository,
  translations: TopicTranslations,
  excludeId?: string,
): Promise<void> {
  for (const locale of LOCALES) {
    if (await topics.existsByName(locale, translations[locale].name, excludeId)) {
      throw new TopicAlreadyExistsError(`translations.${locale}.name`);
    }
  }
}
