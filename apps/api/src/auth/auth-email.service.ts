import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTIONAL_EMAIL_PROVIDER,
  type TransactionalEmailProvider,
} from './transactional-email.provider';

@Injectable()
export class AuthEmailService {
  constructor(
    @Inject(TRANSACTIONAL_EMAIL_PROVIDER)
    private readonly provider: TransactionalEmailProvider,
  ) {}

  async sendVerificationEmail(input: {
    to: string;
    token: string;
    actionTokenId: string;
  }) {
    const url = buildPublicUrl('/verify-email', input.token);

    await this.provider.send({
      to: input.to,
      subject: 'Verify your Preppie email',
      text: `Verify your Preppie email: ${url}`,
      html: `<p>Verify your Preppie email to activate your account.</p><p><a href="${escapeHtml(url)}">Verify email</a></p>`,
      idempotencyKey: `email-verification/${input.actionTokenId}`,
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    token: string;
    actionTokenId: string;
  }) {
    const url = buildPublicUrl('/reset-password', input.token);

    await this.provider.send({
      to: input.to,
      subject: 'Reset your Preppie password',
      text: `Reset your Preppie password: ${url}`,
      html: `<p>Use this link to reset your Preppie password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p>`,
      idempotencyKey: `password-reset/${input.actionTokenId}`,
    });
  }

  async sendSecurityAlert(input: {
    to: string;
    event: string;
    eventId: string;
  }) {
    await this.provider.send({
      to: input.to,
      subject: 'Security activity on your Preppie account',
      text: `Security activity: ${input.event}. If this was not you, reset your password immediately.`,
      html: `<p>Security activity: ${escapeHtml(input.event)}.</p><p>If this was not you, reset your password immediately.</p>`,
      idempotencyKey: `security-event/${input.eventId}`,
    });
  }
}

function buildPublicUrl(path: string, token: string) {
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();

  if (!publicAppUrl) {
    throw new Error('PUBLIC_APP_URL is required for authentication emails.');
  }

  const url = new URL(path, ensureTrailingSlash(publicAppUrl));
  url.searchParams.set('token', token);
  return url.toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
