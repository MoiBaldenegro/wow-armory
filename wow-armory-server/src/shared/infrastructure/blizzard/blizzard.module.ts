import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApplicationTokenProvider } from '../../../characters/application/ports/ApplicationTokenProvider';
import { ClientCredentialsTokenProvider } from '../../../characters/infrastructure/ClientCredentialsTokenProvider';
import { BlizzardApiClient } from './blizzard-api-client';
import { resolveBlizzardApiSettings } from './blizzard-api-config';
import { BlizzardCache } from './blizzard-cache';

export const BLIZZARD_APP_TOKEN_PROVIDER = 'BLIZZARD_APP_TOKEN_PROVIDER';

/**
 * Provides a single application token provider, response cache and Blizzard
 * HTTP client to every module so tokens and cached data are shared.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BLIZZARD_APP_TOKEN_PROVIDER,
      useFactory: (config: ConfigService) =>
        new ClientCredentialsTokenProvider(config),
      inject: [ConfigService],
    },
    { provide: BlizzardCache, useFactory: () => new BlizzardCache() },
    {
      provide: BlizzardApiClient,
      useFactory: (
        tokenProvider: ApplicationTokenProvider,
        config: ConfigService,
        cache: BlizzardCache,
      ) =>
        new BlizzardApiClient(
          tokenProvider,
          resolveBlizzardApiSettings(config),
          cache,
        ),
      inject: [BLIZZARD_APP_TOKEN_PROVIDER, ConfigService, BlizzardCache],
    },
  ],
  exports: [BLIZZARD_APP_TOKEN_PROVIDER, BlizzardCache, BlizzardApiClient],
})
export class BlizzardModule {}
