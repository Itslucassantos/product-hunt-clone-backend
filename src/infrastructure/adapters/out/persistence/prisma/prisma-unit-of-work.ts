import { UnitOfWork } from '../../../../../application/ports/out/shared/unit-of-work';
import { PrismaContext } from './prisma-context';

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly context: PrismaContext) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.context.run(work);
  }
}
