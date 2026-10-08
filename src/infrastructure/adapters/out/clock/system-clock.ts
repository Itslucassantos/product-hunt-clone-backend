import { Clock } from '../../../../application/ports/out/shared/clock';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
