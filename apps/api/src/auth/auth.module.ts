import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordHasherService } from './password-hasher.service';
import {
  ActorResolverService,
  OptionalRequestActorGuard,
  RequestActorGuard,
} from './request-actor.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordHasherService,
    GoogleTokenVerifierService,
    JwtAuthGuard,
    ActorResolverService,
    RequestActorGuard,
    OptionalRequestActorGuard,
  ],
  exports: [
    AuthTokenService,
    PasswordHasherService,
    JwtAuthGuard,
    ActorResolverService,
    RequestActorGuard,
    OptionalRequestActorGuard,
  ],
})
export class AuthModule {}
