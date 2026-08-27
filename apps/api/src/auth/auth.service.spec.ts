/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../../generated/prisma';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let authTokenService: {
    buildAuthTokens: jest.Mock;
    hashRefreshToken: jest.Mock;
  };
  let passwordHasherService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };
  let googleTokenVerifierService: { verify: jest.Mock };
  let authEmailService: {
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
    sendSecurityAlert: jest.Mock;
  };
  let service: AuthService;

  const user: Pick<
    User,
    'id' | 'email' | 'name' | 'role' | 'onboardingCompletedAt'
  > = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: 'user',
    onboardingCompletedAt: null,
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    authTokenService = {
      buildAuthTokens: jest.fn(),
      hashRefreshToken: jest.fn(),
    };
    passwordHasherService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };
    googleTokenVerifierService = { verify: jest.fn() };
    authEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendSecurityAlert: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prisma as never,
      authTokenService as never,
      passwordHasherService as never,
      googleTokenVerifierService as never,
      authEmailService as never,
    );
  });

  it('registers an unverified password identity without issuing a session', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwordHasherService.hash.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(user);
    prisma.authActionToken.create.mockResolvedValue({ id: 'verify-1' });

    await expect(
      service.register({
        email: 'User@example.com',
        name: 'User',
        password: 's3cure-passphrase',
      }),
    ).resolves.toEqual({ status: 'verification_required' });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@example.com',
          authIdentities: {
            create: expect.objectContaining({
              provider: 'password',
              emailVerified: false,
            }),
          },
        }),
      }),
    );
    expect(authEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        actionTokenId: 'verify-1',
        token: expect.any(String),
      }),
    );
    expect(authTokenService.buildAuthTokens).not.toHaveBeenCalled();
  });

  it('returns the same registration response for an existing verified email', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        { provider: 'password', emailVerified: true, passwordHash: 'hash' },
      ],
    });

    await expect(
      service.register({
        email: user.email,
        name: user.name,
        password: 's3cure-passphrase',
      }),
    ).resolves.toEqual({ status: 'verification_required' });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(authEmailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('blocks password login until email ownership is verified', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        {
          provider: 'password',
          emailVerified: false,
          passwordHash: 'stored-hash',
        },
      ],
    });
    passwordHasherService.verify.mockResolvedValue(true);

    await expect(
      service.login({
        email: user.email,
        password: 's3cure-passphrase',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(authTokenService.buildAuthTokens).not.toHaveBeenCalled();
  });

  it('issues tokens for a verified password login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        {
          provider: 'password',
          emailVerified: true,
          passwordHash: 'stored-hash',
        },
      ],
    });
    passwordHasherService.verify.mockResolvedValue(true);
    mockBuiltTokens(authTokenService);

    await expect(
      service.login({
        email: user.email,
        password: 's3cure-passphrase',
      }),
    ).resolves.toMatchObject({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('verifies email with a single-use token', async () => {
    prisma.authActionToken.findUnique.mockResolvedValue({
      id: 'verify-1',
      userId: user.id,
      type: 'email_verification',
      consumedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      user,
    });
    prisma.authActionToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.authIdentity.updateMany.mockResolvedValue({ count: 1 });
    prisma.authSecurityEvent.create.mockResolvedValue({ id: 'event-1' });

    await expect(service.verifyEmail('v'.repeat(43))).resolves.toEqual({
      success: true,
    });
    expect(prisma.authIdentity.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerified: true } }),
    );
  });

  it('does not reveal whether a password reset account exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset('missing@example.com'),
    ).resolves.toEqual({ status: 'accepted' });
    expect(authEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('resets a password, verifies ownership, and revokes existing sessions', async () => {
    prisma.authActionToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: user.id,
      type: 'password_reset',
      consumedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      user,
    });
    prisma.authActionToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.authIdentity.updateMany.mockResolvedValue({ count: 1 });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    prisma.authSecurityEvent.create.mockResolvedValue({ id: 'event-1' });
    passwordHasherService.hash.mockResolvedValue('new-hash');

    await expect(
      service.resetPassword({
        token: 'r'.repeat(43),
        password: 'new-s3cure-passphrase',
      }),
    ).resolves.toEqual({ success: true });

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(authEmailService.sendSecurityAlert).toHaveBeenCalled();
  });

  it('rejects expired password reset tokens', async () => {
    prisma.authActionToken.findUnique.mockResolvedValue({
      id: 'reset-expired',
      userId: user.id,
      type: 'password_reset',
      consumedAt: null,
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      user,
    });

    await expect(
      service.resetPassword({
        token: 'e'.repeat(43),
        password: 'new-s3cure-passphrase',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(passwordHasherService.hash).not.toHaveBeenCalled();
  });

  it('rejects a password reset token consumed by a concurrent or prior request', async () => {
    prisma.authActionToken.findUnique.mockResolvedValue({
      id: 'reset-reused',
      userId: user.id,
      type: 'password_reset',
      consumedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      user,
    });
    prisma.authActionToken.updateMany.mockResolvedValue({ count: 0 });
    passwordHasherService.hash.mockResolvedValue('new-hash');

    await expect(
      service.resetPassword({
        token: 'u'.repeat(43),
        password: 'new-s3cure-passphrase',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.authIdentity.updateMany).not.toHaveBeenCalled();
  });

  it('does not silently attach Google to an existing email account', async () => {
    googleTokenVerifierService.verify.mockResolvedValue({
      subject: 'google-subject-1',
      email: user.email,
      email_verified: true,
    });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.loginWithGoogle({ id_token: 'google-id-token' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.authIdentity.create).not.toHaveBeenCalled();
  });

  it('links Google only after authenticated matching Google reauthentication', async () => {
    googleTokenVerifierService.verify.mockResolvedValue({
      subject: 'google-subject-1',
      email: user.email,
      email_verified: true,
    });
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        { provider: 'password', emailVerified: true, passwordHash: 'hash' },
      ],
    });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.authIdentity.create.mockResolvedValue({ id: 'google-identity' });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.authSecurityEvent.create.mockResolvedValue({ id: 'event-1' });

    await expect(
      service.linkGoogle(user.id, { id_token: 'fresh-google-id-token' }),
    ).resolves.toEqual({
      success: true,
      reauthentication_required: true,
    });
    expect(prisma.authIdentity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        provider: 'google',
        providerSubject: 'google-subject-1',
      }),
    });
  });

  it('rejects invalid password logins', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        {
          provider: 'password',
          emailVerified: true,
          passwordHash: 'stored-hash',
        },
      ],
    });
    passwordHasherService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    authActionToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    authSecurityEvent: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function mockBuiltTokens(authTokenService: { buildAuthTokens: jest.Mock }) {
  authTokenService.buildAuthTokens.mockResolvedValue({
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: '15m',
    refreshTokenHash: 'refresh-hash',
    refreshTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
  });
}
