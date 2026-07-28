import { Injectable } from '@nestjs/common';
import type {
  TransactionalEmail,
  TransactionalEmailProvider,
} from './transactional-email.provider';

@Injectable()
export class FakeEmailProvider implements TransactionalEmailProvider {
  readonly messages: TransactionalEmail[] = [];

  send(message: TransactionalEmail): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}
