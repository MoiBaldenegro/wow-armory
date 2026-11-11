import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { BLIZZARD_APP_TOKEN_PROVIDER } from '../src/shared/infrastructure/blizzard/blizzard.module';
import { mockBlizzardRoutes } from '../src/shared/infrastructure/blizzard/testing';

describe('Blizzard integrations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BLIZZARD_APP_TOKEN_PROVIDER)
      .useValue({ getAccessToken: async () => 'app-token' })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it.each([
    '/characters/Bad Realm/billiemoi/statistics',
    '/characters/grobbulus/bil.lie/talents',
    '/guilds/grobbulus/bad%2Fslug',
    '/auctions/grobbulus/prices?items=abc',
    '/auctions/grobbulus/prices?items=1&faction=pirates',
    '/leaderboards/pvp/1v1',
  ])('rejects invalid input on %s with 400', async (path) => {
    const get = jest.spyOn(axios, 'get');

    await request(app.getHttpServer()).get(path).expect(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing guild', async () => {
    mockBlizzardRoutes(axios, {});

    await request(app.getHttpServer())
      .get('/guilds/grobbulus/missing-guild')
      .expect(404);
  });

  it('serves statistics and an empty pet list for non hunters', async () => {
    mockBlizzardRoutes(axios, {
      '/profile/wow/character/grobbulus/billiemoi/statistics': { health: 100 },
    });

    const stats = await request(app.getHttpServer())
      .get('/characters/grobbulus/Billiemoi/statistics')
      .expect(200);
    expect(stats.body.stats).toEqual([
      { key: 'health', group: 'general', value: 100, kind: 'number' },
    ]);

    const pets = await request(app.getHttpServer())
      .get('/characters/grobbulus/billiemoi/hunter-pets')
      .expect(200);
    expect(pets.body).toEqual({ pets: [] });
  });

  it('lists realms with the dynamic namespace of the mode', async () => {
    const get = mockBlizzardRoutes(axios, {
      '/data/wow/realm/index': {
        realms: [{ name: 'Grobbulus', slug: 'grobbulus' }],
      },
    });

    const response = await request(app.getHttpServer())
      .get('/realms?mode=retail')
      .expect(200);

    expect(response.body).toEqual({
      realms: [{ name: 'Grobbulus', slug: 'grobbulus' }],
    });
    expect(get.mock.calls[0][1]).toMatchObject({
      params: { namespace: 'dynamic-us' },
    });
  });
});
