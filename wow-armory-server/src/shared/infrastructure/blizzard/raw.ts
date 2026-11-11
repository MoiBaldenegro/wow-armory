/**
 * Defensive readers for Blizzard JSON payloads. Every helper returns
 * `undefined` instead of throwing when the shape is not the expected one.
 */
export type RawRecord = Record<string, unknown>;

export function asRecord(value: unknown): RawRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RawRecord)
    : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** `{ name }` or `{ display_string }` objects, common in Blizzard payloads. */
export function displayString(value: unknown): string | undefined {
  const record = asRecord(value);
  return (
    asString(record?.display_string) ??
    asString(asRecord(record?.display)?.display_string) ??
    asString(record?.name)
  );
}

/** Epoch milliseconds to ISO string. */
export function asIsoDate(value: unknown): string | undefined {
  const timestamp = asNumber(value);

  if (timestamp === undefined || timestamp <= 0) {
    return undefined;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Last path segment of a Blizzard `href` (query string removed). */
export function hrefTail(href: unknown): string | undefined {
  const value = asString(href);

  if (!value) {
    return undefined;
  }

  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    return segments[segments.length - 1];
  } catch {
    return undefined;
  }
}
