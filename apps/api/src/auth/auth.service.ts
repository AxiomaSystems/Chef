import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEmailService } from './auth-email.service';
import { AddPasswordDto } from './dto/add-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RemovePasswordDto } from './dto/remove-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UnlinkGoogleDto } from './dto/unlink-google.dto';
import { AuthTokenService } from './auth-token.service';
import { PasswordHasherService } from './password-hasher.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly googleTokenVerifierService: GoogleTokenVerifierService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async register(input: RegisterDto) {
    const normalizedEmail = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { authIdentities: true },
    });

    if (existingUser) {
      const passwordIdentity = existingUser.authIdentities.find(
        (identity) => identity.provider === 'password',
      );

      if (passwordIdentity && !passwordIdentity.emailVerified) {
        await this.sendVerification(existingUser.id, normalizedEmail).catch(
          () => {
            this.logger.warn(
              'Unable to deliver an email verification message.',
            );
          },
        );
      }

      return { status: 'verification_required' as const };
    }

    const passwordHash = await this.passwordHasherService.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        authIdentities: {
          create: {
            provider: 'password',
            providerSubject: normalizedEmail,
            email: normalizedEmail,
            emailVerified: false,
            passwordHash,
          },
        },
      },
    });

    await this.sendVerification(user.id, normalizedEmail).catch(() => {
      this.logger.warn('Unable to deliver an email verification message.');
    });

    return { status: 'verification_required' as const };
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { authIdentities: true },
    });

    const identity = user?.authIdentities.find(
      (candidate) => candidate.provider === 'password',
    );

    if (!user || !identity?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordHasherService.verify(
      input.password,
      identity.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!identity.emailVerified) {
      throw new ForbiddenException({
        code: 'email_verification_required',
        message: 'Verify your email before signing in.',
      });
    }

    return this.issueTokensForUser(user);
  }

  async loginWithGoogle(input: GoogleLoginDto) {
    const identityPayload = await this.googleTokenVerifierService.verify(
      input.id_token,
    );

    if (!identityPayload.email_verified) {
      throw new UnauthorizedException('Google email must be verified');
    }

    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: 'google',
          providerSubject: identityPayload.subject,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      return this.issueTokensForUser(existingIdentity.user);
    }

    const normalizedEmail = identityPayload.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'identity_link_required',
        message:
          'Sign in with your existing method before connecting Google. If you did not create the account, reset its password first.',
      });
    }

    const linkedUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: identityPayload.name ?? normalizedEmail.split('@')[0],
        authIdentities: {
          create: {
            provider: 'google',
            providerSubject: identityPayload.subject,
            email: normalizedEmail,
            emailVerified: true,
          },
        },
      },
    });

    return this.issueTokensForUser(linkedUser);
  }

  async verifyEmail(token: string) {
    const storedToken = await this.findUsableActionToken(
      token,
      'email_verification',
    );
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authActionToken.updateMany({
        where: {
          id: storedToken.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw invalidActionToken();
      }

      const verifiedIdentity = await tx.authIdentity.updateMany({
        where: {
          userId: storedToken.userId,
          provider: 'password',
          email: storedToken.user.email,
        },
        data: { emailVerified: true },
      });

      if (verifiedIdentity.count !== 1) {
        throw invalidActionToken();
      }

      await tx.authSecurityEvent.create({
        data: {
          userId: storedToken.userId,
          type: 'email_verified',
        },
      });
    });

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { authIdentities: true },
    });
    const passwordIdentity = user?.authIdentities.find(
      (identity) => identity.provider === 'password',
    );

    if (!user || !passwordIdentity?.passwordHash) {
      return { status: 'accepted' as const };
    }

    const actionToken = await this.createActionToken(user.id, 'password_reset');

    await this.authEmailService
      .sendPasswordResetEmail({
        to: normalizedEmail,
        token: actionToken.rawToken,
        actionTokenId: actionToken.id,
      })
      .catch(() => {
        this.logger.warn('Unable to deliver a password reset message.');
      });

    return { status: 'accepted' as const };
  }

  async resetPassword(input: ResetPasswordDto) {
    const storedToken = await this.findUsableActionToken(
      input.token,
      'password_reset',
    );
    const passwordHash = await this.passwordHasherService.hash(input.password);
    const now = new Date();
    const securityEvent = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authActionToken.updateMany({
        where: {
          id: storedToken.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw invalidActionToken();
      }

      const updatedIdentity = await tx.authIdentity.updateMany({
        where: {
          userId: storedToken.userId,
          provider: 'password',
        },
        data: {
          passwordHash,
          emailVerified: true,
        },
      });

      if (updatedIdentity.count !== 1) {
        throw invalidActionToken();
      }

      await tx.refreshToken.updateMany({
        where: {
          userId: storedToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return tx.authSecurityEvent.create({
        data: {
          userId: storedToken.userId,
          type: 'password_reset',
        },
      });
    });

    await this.authEmailService
      .sendSecurityAlert({
        to: storedToken.user.email,
        event: 'Your password was reset and existing sessions were revoked',
        eventId: securityEvent.id,
      })
      .catch(() => {
        this.logger.warn('Unable to deliver a password reset security alert.');
      });

    return { success: true };
  }

  async linkGoogle(userId: string, input: GoogleLoginDto) {
    const identityPayload = await this.googleTokenVerifierService.verify(
      input.id_token,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: true },
    });

    if (
      !user ||
      !identityPayload.email_verified ||
      identityPayload.email.toLowerCase() !== user.email
    ) {
      throw new ForbiddenException({
        code: 'identity_reauthentication_failed',
        message: 'Google reauthentication did not match this account.',
      });
    }

    const subjectIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: 'google',
          providerSubject: identityPayload.subject,
        },
      },
    });

    if (subjectIdentity && subjectIdentity.userId !== userId) {
      throw new ConflictException({
        code: 'identity_already_linked',
        message:
          'That Google identity is already connected to another account.',
      });
    }

    const existingGoogle = user.authIdentities.find(
      (identity) => identity.provider === 'google',
    );
    if (existingGoogle) {
      return { success: true };
    }

    const securityEvent = await this.prisma.$transaction(async (tx) => {
      await tx.authIdentity.create({
        data: {
          userId,
          provider: 'google',
          providerSubject: identityPayload.subject,
          email: user.email,
          emailVerified: true,
        },
      });
      await revokeUserSessions(tx, userId);
      return tx.authSecurityEvent.create({
        data: {
          userId,
          type: 'identity_linked',
          metadata: { provider: 'google' },
        },
      });
    });

    await this.sendSecurityAlert(
      user.email,
      'Google sign-in was connected and existing sessions were revoked',
      securityEvent.id,
    );
    return { success: true, reauthentication_required: true };
  }

  async unlinkGoogle(userId: string, input: UnlinkGoogleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: true },
    });
    const passwordIdentity = user?.authIdentities.find(
      (identity) => identity.provider === 'password',
    );
    const googleIdentity = user?.authIdentities.find(
      (identity) => identity.provider === 'google',
    );

    if (!user || !passwordIdentity?.passwordHash || !googleIdentity) {
      throw new BadRequestException({
        code: 'identity_change_not_allowed',
        message: 'Google cannot be removed from this account.',
      });
    }

    const passwordMatches = await this.passwordHasherService.verify(
      input.password,
      passwordIdentity.passwordHash,
    );
    if (!passwordMatches) {
      throw new ForbiddenException({
        code: 'identity_reauthentication_failed',
        message: 'Current password is incorrect.',
      });
    }

    const securityEvent = await this.prisma.$transaction(async (tx) => {
      await tx.authIdentity.delete({ where: { id: googleIdentity.id } });
      await revokeUserSessions(tx, userId);
      return tx.authSecurityEvent.create({
        data: {
          userId,
          type: 'identity_unlinked',
          metadata: { provider: 'google' },
        },
      });
    });

    await this.sendSecurityAlert(
      user.email,
      'Google sign-in was removed and existing sessions were revoked',
      securityEvent.id,
    );
    return { success: true, reauthentication_required: true };
  }

  async addPassword(userId: string, input: AddPasswordDto) {
    const identityPayload = await this.googleTokenVerifierService.verify(
      input.id_token,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: true },
    });
    const googleIdentity = user?.authIdentities.find(
      (identity) =>
        identity.provider === 'google' &&
        identity.providerSubject === identityPayload.subject,
    );

    if (
      !user ||
      !googleIdentity ||
      !identityPayload.email_verified ||
      identityPayload.email.toLowerCase() !== user.email
    ) {
      throw new ForbiddenException({
        code: 'identity_reauthentication_failed',
        message: 'Google reauthentication did not match this account.',
      });
    }

    if (
      user.authIdentities.some((identity) => identity.provider === 'password')
    ) {
      throw new ConflictException({
        code: 'identity_already_linked',
        message: 'Password sign-in is already connected.',
      });
    }

    const passwordHash = await this.passwordHasherService.hash(input.password);
    const securityEvent = await this.prisma.$transaction(async (tx) => {
      await tx.authIdentity.create({
        data: {
          userId,
          provider: 'password',
          providerSubject: user.email,
          email: user.email,
          emailVerified: true,
          passwordHash,
        },
      });
      await revokeUserSessions(tx, userId);
      return tx.authSecurityEvent.create({
        data: {
          userId,
          type: 'password_added',
        },
      });
    });

    await this.sendSecurityAlert(
      user.email,
      'Password sign-in was added and existing sessions were revoked',
      securityEvent.id,
    );
    return { success: true, reauthentication_required: true };
  }

  async removePassword(userId: string, input: RemovePasswordDto) {
    const identityPayload = await this.googleTokenVerifierService.verify(
      input.id_token,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: true },
    });
    const googleIdentity = user?.authIdentities.find(
      (identity) =>
        identity.provider === 'google' &&
        identity.providerSubject === identityPayload.subject,
    );
    const passwordIdentity = user?.authIdentities.find(
      (identity) => identity.provider === 'password',
    );

    if (
      !user ||
      !googleIdentity ||
      !passwordIdentity ||
      !identityPayload.email_verified ||
      identityPayload.email.toLowerCase() !== user.email
    ) {
      throw new ForbiddenException({
        code: 'identity_reauthentication_failed',
        message: 'Google reauthentication did not match this account.',
      });
    }

    const securityEvent = await this.prisma.$transaction(async (tx) => {
      await tx.authIdentity.delete({ where: { id: passwordIdentity.id } });
      await revokeUserSessions(tx, userId);
      return tx.authSecurityEvent.create({
        data: {
          userId,
          type: 'password_removed',
        },
      });
    });

    await this.sendSecurityAlert(
      user.email,
      'Password sign-in was removed and existing sessions were revoked',
      securityEvent.id,
    );
    return { success: true, reauthentication_required: true };
  }

  async refresh(input: RefreshTokenDto) {
    const refreshTokenHash = this.authTokenService.hashRefreshToken(
      input.refresh_token,
    );

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextTokens = await this.authTokenService.buildAuthTokens({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    await this.prisma.$transaction(async (tx) => {
      const nextRefreshToken = await tx.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: nextTokens.refreshTokenHash,
          expiresAt: nextTokens.refreshTokenExpiresAt,
        },
      });

      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: nextRefreshToken.id,
        },
      });
    });

    return {
      access_token: nextTokens.access_token,
      refresh_token: nextTokens.refresh_token,
      expires_in: nextTokens.expires_in,
    };
  }

  async logout(userId: string, input: RefreshTokenDto) {
    const refreshTokenHash = this.authTokenService.hashRefreshToken(
      input.refresh_token,
    );

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      select: { id: true, userId: true, revokedAt: true },
    });

    if (
      !storedToken ||
      storedToken.userId !== userId ||
      storedToken.revokedAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private async sendVerification(userId: string, email: string) {
    const actionToken = await this.createActionToken(
      userId,
      'email_verification',
    );

    await this.authEmailService.sendVerificationEmail({
      to: email,
      token: actionToken.rawToken,
      actionTokenId: actionToken.id,
    });
  }

  private async createActionToken(
    userId: string,
    type: 'email_verification' | 'password_reset',
  ) {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashActionToken(rawToken);
    const ttlMinutes =
      type === 'email_verification'
        ? getPositiveIntegerEnv('AUTH_EMAIL_VERIFICATION_TTL_MINUTES', 1440)
        : getPositiveIntegerEnv('AUTH_PASSWORD_RESET_TTL_MINUTES', 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const token = await this.prisma.$transaction(async (tx) => {
      await tx.authActionToken.updateMany({
        where: {
          userId,
          type,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });

      return tx.authActionToken.create({
        data: {
          userId,
          type,
          tokenHash,
          expiresAt,
        },
      });
    });

    return { id: token.id, rawToken };
  }

  private async findUsableActionToken(
    rawToken: string,
    type: 'email_verification' | 'password_reset',
  ) {
    const token = await this.prisma.authActionToken.findUnique({
      where: { tokenHash: hashActionToken(rawToken) },
      include: { user: true },
    });

    if (
      !token ||
      token.type !== type ||
      token.consumedAt ||
      token.expiresAt <= new Date()
    ) {
      throw invalidActionToken();
    }

    return token;
  }

  private async sendSecurityAlert(
    email: string,
    event: string,
    eventId: string,
  ) {
    await this.authEmailService
      .sendSecurityAlert({
        to: email,
        event,
        eventId,
      })
      .catch(() => {
        this.logger.warn('Unable to deliver an identity security alert.');
      });
  }

  private async issueTokensForUser(
    user: Pick<User, 'id' | 'email' | 'role' | 'onboardingCompletedAt'>,
  ) {
    const tokens = await this.authTokenService.buildAuthTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokens.refreshTokenHash,
        expiresAt: tokens.refreshTokenExpiresAt,
      },
    });

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      onboarding_completed_at:
        user.onboardingCompletedAt?.toISOString() ?? undefined,
    };
  }
}

function hashActionToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex');
}

function invalidActionToken() {
  return new BadRequestException({
    code: 'invalid_or_expired_auth_token',
    message: 'This authentication link is invalid or has expired.',
  });
}

function getPositiveIntegerEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function revokeUserSessions(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
