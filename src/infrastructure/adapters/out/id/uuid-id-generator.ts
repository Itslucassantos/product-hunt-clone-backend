import { v4 as uuidv4 } from 'uuid';
import { IdGenerator } from '../../../../application/ports/out/id-generator';

export class UuidIdGenerator implements IdGenerator {
  next(): string {
    return uuidv4();
  }
}
