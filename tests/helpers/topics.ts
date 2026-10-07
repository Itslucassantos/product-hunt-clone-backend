import { Actor } from '../../src/application/ports/in/shared/actor';
import { TopicTranslations } from '../../src/domain/entities/topic';

export const admin: Actor = { id: 'admin-1', role: 'ADMIN' };
export const regularUser: Actor = { id: 'user-1', role: 'USER' };

export const translations = (en: string, ptBR: string = en): TopicTranslations => ({
  en: { name: en, description: `${en} description` },
  'pt-BR': { name: ptBR, description: null },
});
