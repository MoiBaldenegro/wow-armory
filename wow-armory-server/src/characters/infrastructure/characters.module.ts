import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GetCharacterUseCase } from '../application/GetCharacterUseCase';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';
import {
  CHARACTER_REPOSITORY,
  CHARACTER_TOKEN_PROVIDER,
} from '../characters.tokens';
import { CharacterRepository } from '../domain/ports/CharacterRepository';
import { CharactersController } from '../presentation/CharactersController';
import { BlizzardCharacterAdapter } from './BlizzardCharacterAdapter';
import { BlizzardCharacterDetailsAdapter } from './BlizzardCharacterDetailsAdapter';
import { BlizzardCharacterExtrasAdapter } from './BlizzardCharacterExtrasAdapter';
import { BlizzardApiClient } from '../../shared/infrastructure/blizzard/blizzard-api-client';
import { BLIZZARD_APP_TOKEN_PROVIDER } from '../../shared/infrastructure/blizzard/blizzard.module';
import { resolveBlizzardApiSettings } from '../../shared/infrastructure/blizzard/blizzard-api-config';

@Module({
  imports: [ConfigModule],
  controllers: [CharactersController],
  providers: [
    {
      provide: CHARACTER_TOKEN_PROVIDER,
      useExisting: BLIZZARD_APP_TOKEN_PROVIDER,
    },
    {
      provide: CHARACTER_REPOSITORY,
      useFactory: (
        tokenProvider: ApplicationTokenProvider,
        config: ConfigService,
      ) => {
        const settings = resolveBlizzardApiSettings(config);

        return new BlizzardCharacterAdapter(tokenProvider, {
          region: settings.region,
          locale: settings.locale,
          namespace: settings.namespaces.classic,
          namespaces: settings.namespaces,
          staticNamespaces: settings.staticNamespaces,
        });
      },
      inject: [CHARACTER_TOKEN_PROVIDER, ConfigService],
    },
    {
      provide: BlizzardCharacterDetailsAdapter,
      useFactory: (client: BlizzardApiClient) =>
        new BlizzardCharacterDetailsAdapter(client),
      inject: [BlizzardApiClient],
    },
    {
      provide: BlizzardCharacterExtrasAdapter,
      useFactory: (client: BlizzardApiClient) =>
        new BlizzardCharacterExtrasAdapter(client),
      inject: [BlizzardApiClient],
    },
    {
      provide: GetCharacterUseCase,
      useFactory: (repository: CharacterRepository) =>
        new GetCharacterUseCase(repository),
      inject: [CHARACTER_REPOSITORY],
    },
  ],
  exports: [CHARACTER_REPOSITORY],
})
export class CharactersModule {}
