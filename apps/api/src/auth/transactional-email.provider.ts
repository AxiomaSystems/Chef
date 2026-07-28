export const TRANSACTIONAL_EMAIL_PROVIDER = Symbol(
  'TRANSACTIONAL_EMAIL_PROVIDER',
);

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export interface TransactionalEmailProvider {
  send(message: TransactionalEmail): Promise<void>;
}
