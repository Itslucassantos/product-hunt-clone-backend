import { Actor } from '../application/ports/in/shared/actor';
import type { Container } from './container';

const seedActor: Actor = { id: 'seed', role: 'ADMIN' };

const topicSeeds = [
  { en: 'AI', pt: 'IA' },
  { en: 'SaaS', pt: 'SaaS' },
  { en: 'Developer Tools', pt: 'Ferramentas para Desenvolvedores' },
  { en: 'Productivity', pt: 'Produtividade' },
];

const productSeeds = [
  {
    title: 'Lumen',
    description: 'AI notes that organize themselves',
    url: 'https://lumen.example.com',
    topics: [0, 3],
    review: { rating: 5, summary: 'Fast, clean and surprisingly smart.' },
  },
  {
    title: 'Pipeline',
    description: 'Visual CI for small teams',
    url: 'https://pipeline.example.com',
    topics: [1, 2],
  },
  {
    title: 'Orbit',
    description: 'Calendar that protects your focus time',
    url: 'https://orbit.example.com',
    topics: [3],
    status: 'COMING_SOON' as const,
  },
];

export async function seed({ useCases }: Container): Promise<void> {
  const topicIds: string[] = [];
  for (const topic of topicSeeds) {
    const { id } = await useCases.createTopic.execute({
      actor: seedActor,
      translations: {
        en: { name: topic.en, description: null },
        'pt-BR': { name: topic.pt, description: null },
      },
    });
    topicIds.push(id);
  }

  for (const product of productSeeds) {
    const { id } = await useCases.createProduct.execute({
      actor: seedActor,
      title: product.title,
      description: product.description,
      url: product.url,
      status: product.status,
      topicIds: product.topics.map((index) => topicIds[index] as string),
    });
    if (product.review) {
      await useCases.saveProductReview.execute({
        actor: seedActor,
        productId: id,
        ...product.review,
      });
    }
  }
}
