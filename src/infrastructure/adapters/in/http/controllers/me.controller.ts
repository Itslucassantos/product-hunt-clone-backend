import type { Request, Response } from 'express';
import { GetMeUseCase } from '../../../../../application/ports/in/users/get-me';
import { ListMyVotesUseCase } from '../../../../../application/ports/in/votes/list-my-votes';
import { ToggleVoteUseCase } from '../../../../../application/ports/in/votes/toggle-vote';
import { actorOf } from '../middlewares/authenticate';
import { idParam } from '../schemas/common.schemas';

export interface MeUseCases {
  getMe: GetMeUseCase;
  listMyVotes: ListMyVotesUseCase;
  toggleVote: ToggleVoteUseCase;
}

export function meController(useCases: MeUseCases) {
  return {
    async me(_req: Request, res: Response) {
      res.json(await useCases.getMe.execute({ userId: actorOf(res).id }));
    },

    async myVotes(_req: Request, res: Response) {
      res.json(await useCases.listMyVotes.execute({ userId: actorOf(res).id }));
    },

    async toggleVote(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      res.json(await useCases.toggleVote.execute({ userId: actorOf(res).id, productId: id }));
    },
  };
}
