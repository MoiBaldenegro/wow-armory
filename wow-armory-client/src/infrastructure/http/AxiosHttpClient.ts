import axios, { type AxiosInstance } from 'axios';
import { getServerUri } from '../config/env';
import type { HttpClient } from './HttpClient';
import { toHttpError } from './HttpError';

const REQUEST_TIMEOUT_MS = 10_000;

export function validateBaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid API base URL: "${value}".`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`API base URL must use http or https: "${value}".`);
  }

  return value.replace(/\/+$/, '');
}

export function createAxiosInstance(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL: validateBaseUrl(baseURL),
    withCredentials: true,
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export class AxiosHttpClient implements HttpClient {
  private readonly client: AxiosInstance;

  constructor(
    baseURL: string = getServerUri(),
    client: AxiosInstance = createAxiosInstance(baseURL),
  ) {
    this.client = client;
  }

  async get<T>(path: string): Promise<T> {
    try {
      const response = await this.client.get<T>(path);
      return response.data;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await this.client.post<T>(path, body);
      return response.data;
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
