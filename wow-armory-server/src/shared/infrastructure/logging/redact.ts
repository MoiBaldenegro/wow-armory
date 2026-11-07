export const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set(
  [
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'password',
    'authorization',
    'cookie',
    'code',
    'state',
  ].map((key) => key.toLowerCase()),
);

const MAX_DEPTH = 8;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

/**
 * Returns a deep copy of `value` where every sensitive key (case-insensitive)
 * is replaced by `[REDACTED]`. Used for every metadata object that is logged.
 */
export function redact<T>(value: T): T {
  return redactValue(value, 0, new WeakSet<object>()) as T;
}

function redactValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (seen.has(value) || depth >= MAX_DEPTH) {
    return '[Truncated]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSensitiveKey(key)
      ? REDACTED
      : redactValue(entry, depth + 1, seen);
  }

  return result;
}
