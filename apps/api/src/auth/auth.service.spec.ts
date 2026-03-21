import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { User } from '../../generated/prisma';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    authIdentity: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let authTokenService: {
    buildAuthTokens: jest.Mock;
    hashRefreshToken: jest.Mock;
  };
  let passwordHasherService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };
  let googleTokenVerifierService: {
    verify: jest.Mock;
  };
  let service: AuthService;

  const user: Pick<User, 'id' | 'email' | 'role'> = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      authIdentity: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    authTokenService = {
      buildAuthTokens: jest.fn(),
      hashRefreshToken: jest.fn(),
    };
    passwordHasherService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };
    googleTokenVerifierService = {
      verify: jest.fn(),
    };

    service = new AuthService(
      prisma as never,
      authTokenService as never,
      passwordHasherService as never,
      googleTokenVerifierService as never,
    );
  });

  it('registers a new password user and persists a refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwordHasherService.hash.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(user);
    authTokenService.buildAuthTokens.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      refreshTokenHash: 'refresh-hash',
      refreshTokenExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    await expect(
      service.register({
        email: 'User@example.com',
        name: 'User',
        password: 's3cure-passphrase',
      }),
    ).resolves.toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      onboarding_completed_at: undefined,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@example.com',
        }),
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: 'refresh-hash',
        expiresAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    });
  });

  it('rejects register when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        email: 'user@example.com',
        name: 'User',
        password: 's3cure-passphrase',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in a password user with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        {
          provider: 'password',
          passwordHash: 'stored-hash',
        },
      ],
    });
    passwordHasherService.verify.mockResolvedValue(true);
    authTokenService.buildAuthTokens.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      refreshTokenHash: 'refresh-hash',
      refreshTokenExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 's3cure-passphrase',
      }),
    ).resolves.toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      onboarding_completed_at: undefined,
    });
  });

  it('links a Google identity to an existing user by verified email', async () => {
    googleTokenVerifierService.verify.mockResolvedValue({
      subject: 'google-subject-1',
      email: 'user@example.com',
      email_verified: true,
      name: 'User',
    });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(user);
    authTokenService.buildAuthTokens.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      refreshTokenHash: 'refresh-hash',
      refreshTokenExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    await expect(
      service.loginWithGoogle({ id_token: 'google-id-token' }),
    ).resolves.toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: '15m',
      onboarding_completed_at: undefined,
    });

    expect(prisma.authIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        provider: 'google',
        providerSubject: 'google-subject-1',
        email: 'user@example.com',
        emailVerified: true,
      },
    });
  });

  it('rotates refresh tokens during refresh', async () => {
    authTokenService.hashRefreshToken.mockReturnValue('current-hash');
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      revokedAt: null,
      expiresAt: new Date('2026-04-01T00:00:00.000Z'),
      user,
    });
    authTokenService.buildAuthTokens.mockResolvedValue({
      access_token: 'next-access',
      refresh_token: 'next-refresh',
      expires_in: '15m',
      refreshTokenHash: 'next-hash',
      refreshTokenExpiresAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    prisma.$transaction.mockImplementation(async (callback: never) =>
      callback({
        refreshToken: {
          create: jest.fn().mockResolvedValue({ id: 'refresh-2' }),
          update: jest.fn().mockResolvedValue({}),
        },
      }),
    );

    await expect(
      service.refresh({ refresh_token: 'current-refresh-token' }),
    ).resolves.toEqual({
      access_token: 'next-access',
      refresh_token: 'next-refresh',
      expires_in: '15m',
    });
  });

  it('rejects invalid password logins', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user,
      authIdentities: [
        {
          provider: 'password',
          passwordHash: 'stored-hash',
        },
      ],
    });
    passwordHasherService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
