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
import { ClientCredentialsTokenProvider } from './ClientCredentialsTokenProvider';
import { resolveBlizzardApiSettings } from '../../shared/infrastructure/blizzard/blizzard-api-config';

@Module({
  imports: [ConfigModule],
  controllers: [CharactersController],
  providers: [
    {
      provide: CHARACTER_TOKEN_PROVIDER,
      useFactory: (config: ConfigService) =>
        new ClientCredentialsTokenProvider(config),
      inject: [ConfigService],
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
      useFactory: (
        tokenProvider: ApplicationTokenProvider,
        config: ConfigService,
      ) => {
        const settings = resolveBlizzardApiSettings(config);

        return new BlizzardCharacterDetailsAdapter(tokenProvider, {
          region: settings.region,
          locale: settings.locale,
          namespace: settings.namespaces.classic,
          namespaces: settings.namespaces,
        });
      },
      inject: [CHARACTER_TOKEN_PROVIDER, ConfigService],
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
