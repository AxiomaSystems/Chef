import type { UserRole } from '../../generated/prisma';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  onboarding_completed_at?: string;
};

export type GoogleIdentityPayload = {
  subject: string;
  email: string;
  email_verified: boolean;
  name?: string;
};
