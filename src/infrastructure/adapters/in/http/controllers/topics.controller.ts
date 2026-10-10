import type { Request, Response } from 'express';
import { CreateTopicUseCase } from '../../../../../application/ports/in/topics/create-topic';
import { DeleteTopicUseCase } from '../../../../../application/ports/in/topics/delete-topic';
import { ListTopicsUseCase } from '../../../../../application/ports/in/topics/list-topics';
import { ReorderTopicsUseCase } from '../../../../../application/ports/in/topics/reorder-topics';
import { UpdateTopicUseCase } from '../../../../../application/ports/in/topics/update-topic';
import { actorOf } from '../middlewares/authenticate';
import { idParam, localeQuery } from '../schemas/common.schemas';
import { reorderTopicsBody, topicBody } from '../schemas/topic.schemas';

export interface TopicsUseCases {
  listTopics: ListTopicsUseCase;
  createTopic: CreateTopicUseCase;
  updateTopic: UpdateTopicUseCase;
  deleteTopic: DeleteTopicUseCase;
  reorderTopics: ReorderTopicsUseCase;
}

export function topicsController(useCases: TopicsUseCases) {
  return {
    async list(req: Request, res: Response) {
      const { locale } = localeQuery.parse(req.query);
      res.json(await useCases.listTopics.execute({ locale }));
    },

    async create(req: Request, res: Response) {
      const { translations } = topicBody.parse(req.body);
      const output = await useCases.createTopic.execute({ actor: actorOf(res), translations });
      res.status(201).json(output);
    },

    async update(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      const { translations } = topicBody.parse(req.body);
      await useCases.updateTopic.execute({ actor: actorOf(res), topicId: id, translations });
      res.status(204).end();
    },

    async remove(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      await useCases.deleteTopic.execute({ actor: actorOf(res), topicId: id });
      res.status(204).end();
    },

    async reorder(req: Request, res: Response) {
      const { ids } = reorderTopicsBody.parse(req.body);
      await useCases.reorderTopics.execute({ actor: actorOf(res), ids });
      res.status(204).end();
    },
  };
}
