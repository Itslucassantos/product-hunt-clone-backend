import { UnitOfWork } from '../../../../../application/ports/out/shared/unit-of-work';

export class InMemoryUnitOfWork implements UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
