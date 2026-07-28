import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import type {
  TransactionalEmail,
  TransactionalEmailProvider,
} from './transactional-email.provider';

@Injectable()
export class ResendEmailProvider implements TransactionalEmailProvider {
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: TransactionalEmail): Promise<void> {
    const { error } = await this.client.emails.send(
      {
        from: getAuthEmailFrom(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (error) {
      throw new Error(`Transactional email delivery failed: ${error.name}`);
    }
  }
}

function getAuthEmailFrom() {
  const from = process.env.AUTH_EMAIL_FROM?.trim();

  if (!from) {
    throw new Error('AUTH_EMAIL_FROM is required for Resend delivery.');
  }

  return from;
}
