import { SessionStoreLifecycle } from './session.module';
import { SessionStoreHandle } from './session-store.factory';

describe('SessionStoreLifecycle', () => {
  it('closes the session store (and its Redis client) on application shutdown', async () => {
    const close = jest.fn(async () => undefined);
    const handle: SessionStoreHandle = {
      type: 'redis',
      store: undefined,
      connect: async () => undefined,
      ping: async () => true,
      close,
    };

    await new SessionStoreLifecycle(handle).onApplicationShutdown();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
