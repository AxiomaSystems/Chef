import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokenService } from './auth-token.service';
import { PasswordHasherService } from './password-hasher.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly googleTokenVerifierService: GoogleTokenVerifierService,
  ) {}

  async register(input: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordHasherService.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        authIdentities: {
          create: {
            provider: 'password',
            providerSubject: input.email.toLowerCase(),
            email: input.email.toLowerCase(),
            emailVerified: false,
            passwordHash,
          },
        },
      },
    });

    return this.issueTokensForUser(user);
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

    const linkedUser =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name: identityPayload.name ?? normalizedEmail.split('@')[0],
        },
      }));

    await this.prisma.authIdentity.create({
      data: {
        userId: linkedUser.id,
        provider: 'google',
        providerSubject: identityPayload.subject,
        email: normalizedEmail,
        emailVerified: true,
      },
    });

    return this.issueTokensForUser(linkedUser);
  }

  async refresh(input: RefreshTokenDto) {
    const refreshTokenHash = this.authTokenService.hashRefreshToken(
      input.refresh_token,
    );

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
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

    if (!storedToken || storedToken.userId !== userId || storedToken.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
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
