import type { AxiosInstance } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  AxiosHttpClient,
  createAxiosInstance,
  validateBaseUrl,
} from './AxiosHttpClient';

describe('AxiosHttpClient', () => {
  it('configures base URL, credentials and timeout', () => {
    const instance = createAxiosInstance('https://api.example.com/');

    expect(instance.defaults.baseURL).toBe('https://api.example.com');
    expect(instance.defaults.withCredentials).toBe(true);
    expect(instance.defaults.timeout).toBe(10_000);
  });

  it('rejects invalid base URLs', () => {
    expect(() => validateBaseUrl('ftp://example.com')).toThrow(/http or https/);
    expect(() => validateBaseUrl('not-a-url')).toThrow(/Invalid API base URL/);
  });

  it('normalizes request failures into HttpError', async () => {
    const client = {
      get: async () => {
        throw {
          isAxiosError: true,
          response: { status: 503, headers: {}, data: {} },
        };
      },
    } as unknown as AxiosInstance;

    const http = new AxiosHttpClient('http://localhost:3000', client);

    await expect(http.get('/health')).rejects.toMatchObject({ status: 503 });
  });
});
