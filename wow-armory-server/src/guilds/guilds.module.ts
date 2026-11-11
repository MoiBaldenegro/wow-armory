import { Module } from '@nestjs/common';
import { BlizzardApiClient } from '../shared/infrastructure/blizzard/blizzard-api-client';
import { BlizzardGuildAdapter } from './BlizzardGuildAdapter';
import { GuildsController } from './GuildsController';

@Module({
  controllers: [GuildsController],
  providers: [
    {
      provide: BlizzardGuildAdapter,
      useFactory: (client: BlizzardApiClient) =>
        new BlizzardGuildAdapter(client),
      inject: [BlizzardApiClient],
    },
  ],
})
export class GuildsModule {}
