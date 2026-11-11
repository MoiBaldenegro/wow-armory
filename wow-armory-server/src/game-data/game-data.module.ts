import { Module } from '@nestjs/common';
import { BlizzardApiClient } from '../shared/infrastructure/blizzard/blizzard-api-client';
import { BlizzardCache } from '../shared/infrastructure/blizzard/blizzard-cache';
import { BlizzardAuctionsAdapter } from './BlizzardAuctionsAdapter';
import { BlizzardLeaderboardsAdapter } from './BlizzardLeaderboardsAdapter';
import { BlizzardRealmsAdapter } from './BlizzardRealmsAdapter';
import { GameDataController } from './GameDataController';

@Module({
  controllers: [GameDataController],
  providers: [
    {
      provide: BlizzardRealmsAdapter,
      useFactory: (client: BlizzardApiClient) =>
        new BlizzardRealmsAdapter(client),
      inject: [BlizzardApiClient],
    },
    {
      provide: BlizzardAuctionsAdapter,
      useFactory: (
        client: BlizzardApiClient,
        realms: BlizzardRealmsAdapter,
        cache: BlizzardCache,
      ) => new BlizzardAuctionsAdapter(client, realms, cache),
      inject: [BlizzardApiClient, BlizzardRealmsAdapter, BlizzardCache],
    },
    {
      provide: BlizzardLeaderboardsAdapter,
      useFactory: (client: BlizzardApiClient, cache: BlizzardCache) =>
        new BlizzardLeaderboardsAdapter(client, cache),
      inject: [BlizzardApiClient, BlizzardCache],
    },
  ],
})
export class GameDataModule {}
