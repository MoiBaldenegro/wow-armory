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
import { ClientCredentialsTokenProvider } from './ClientCredentialsTokenProvider';

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
      ) =>
        new BlizzardCharacterAdapter(tokenProvider, {
          region: config.get<string>('BLIZZARD_REGION', 'us'),
          namespace: config.get<string>(
            'BLIZZARD_NAMESPACE',
            'profile-classic-us',
          ),
          namespaces: {
            classic: config.get<string>(
              'BLIZZARD_NAMESPACE_CLASSIC',
              config.get<string>('BLIZZARD_NAMESPACE', 'profile-classic-us'),
            ),
            retail: config.get<string>(
              'BLIZZARD_NAMESPACE_RETAIL',
              'profile-us',
            ),
          },
        }),
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
