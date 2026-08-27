import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthEmailService } from './auth-email.service';
import {
  AuthRateLimitGuard,
  AuthRateLimitService,
} from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { FakeEmailProvider } from './fake-email.provider';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordHasherService } from './password-hasher.service';
import { ResendEmailProvider } from './resend-email.provider';
import {
  ActorResolverService,
  OptionalRequestActorGuard,
  RequestActorGuard,
} from './request-actor.guard';
import { TRANSACTIONAL_EMAIL_PROVIDER } from './transactional-email.provider';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    AuthTokenService,
    PasswordHasherService,
    GoogleTokenVerifierService,
    JwtAuthGuard,
    ActorResolverService,
    RequestActorGuard,
    OptionalRequestActorGuard,
    {
      provide: TRANSACTIONAL_EMAIL_PROVIDER,
      useFactory: () => {
        if (process.env.AUTH_EMAIL_PROVIDER === 'resend') {
          const apiKey = process.env.RESEND_API_KEY?.trim();

          if (!apiKey) {
            throw new Error(
              'RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER=resend.',
            );
          }

          return new ResendEmailProvider(apiKey);
        }

        return new FakeEmailProvider();
      },
    },
  ],
  exports: [
    AuthTokenService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    PasswordHasherService,
    JwtAuthGuard,
    ActorResolverService,
    RequestActorGuard,
    OptionalRequestActorGuard,
  ],
})
export class AuthModule {}
