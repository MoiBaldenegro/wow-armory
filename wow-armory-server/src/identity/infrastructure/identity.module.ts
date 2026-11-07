import { REQUEST } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module, Scope } from '@nestjs/common';
import { Request } from 'express';
import { CheckSession } from '../application/CheckSession';
import { CompleteLogin } from '../application/CompleteLogin';
import { Logout } from '../application/Logout';
import { RefreshToken } from '../application/RefreshToken';
import { StartLogin } from '../application/StartLogin';
import { OAuthProvider } from '../domain/ports/OAuthProvider';
import { SessionRepository } from '../domain/ports/SessionRepository';
import {
  OAUTH_PROVIDER,
  SESSION_REPOSITORY,
  TOKEN_PROVIDER,
} from '../identity.tokens';
import { AuthController } from '../presentation/AuthController';
import { BattleNetOAuthAdapter } from './BattleNetOAuthAdapter';
import { ExpressSessionRepository } from './ExpressSessionRepository';
import { SessionTokenProvider } from './SessionTokenProvider';

const DEFAULT_REFRESH_MARGIN_MS = 60_000;

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    {
      provide: OAUTH_PROVIDER,
      useFactory: (config: ConfigService) =>
        new BattleNetOAuthAdapter({
          clientId: config.get<string>('BLIZZARD_CLIENT_ID') ?? '',
          clientSecret: config.get<string>('BLIZZARD_CLIENT_SECRET') ?? '',
          redirectUri: config.get<string>('BLIZZARD_REDIRECT_URI') ?? '',
        }),
      inject: [ConfigService],
    },
    {
      provide: SESSION_REPOSITORY,
      useFactory: (request: Request) => new ExpressSessionRepository(request),
      inject: [REQUEST],
      scope: Scope.REQUEST,
    },
    {
      provide: StartLogin,
      useFactory: (
        oauthProvider: OAuthProvider,
        sessionRepository: SessionRepository,
      ) => new StartLogin(oauthProvider, sessionRepository),
      inject: [OAUTH_PROVIDER, SESSION_REPOSITORY],
      scope: Scope.REQUEST,
    },
    {
      provide: CompleteLogin,
      useFactory: (
        oauthProvider: OAuthProvider,
        sessionRepository: SessionRepository,
      ) => new CompleteLogin(oauthProvider, sessionRepository),
      inject: [OAUTH_PROVIDER, SESSION_REPOSITORY],
      scope: Scope.REQUEST,
    },
    {
      provide: RefreshToken,
      useFactory: (
        oauthProvider: OAuthProvider,
        sessionRepository: SessionRepository,
      ) => new RefreshToken(oauthProvider, sessionRepository),
      inject: [OAUTH_PROVIDER, SESSION_REPOSITORY],
      scope: Scope.REQUEST,
    },
    {
      provide: CheckSession,
      useFactory: (
        sessionRepository: SessionRepository,
        refreshToken: RefreshToken,
        config: ConfigService,
      ) =>
        new CheckSession(
          sessionRepository,
          refreshToken,
          config.get<number>(
            'TOKEN_REFRESH_MARGIN_MS',
            DEFAULT_REFRESH_MARGIN_MS,
          ),
        ),
      inject: [SESSION_REPOSITORY, RefreshToken, ConfigService],
      scope: Scope.REQUEST,
    },
    {
      provide: Logout,
      useFactory: (sessionRepository: SessionRepository) =>
        new Logout(sessionRepository),
      inject: [SESSION_REPOSITORY],
      scope: Scope.REQUEST,
    },
    {
      provide: TOKEN_PROVIDER,
      useFactory: (
        sessionRepository: SessionRepository,
        refreshToken: RefreshToken,
        config: ConfigService,
      ) =>
        new SessionTokenProvider(
          sessionRepository,
          refreshToken,
          config.get<number>(
            'TOKEN_REFRESH_MARGIN_MS',
            DEFAULT_REFRESH_MARGIN_MS,
          ),
        ),
      inject: [SESSION_REPOSITORY, RefreshToken, ConfigService],
      scope: Scope.REQUEST,
    },
  ],
  exports: [TOKEN_PROVIDER],
})
export class IdentityModule {}
