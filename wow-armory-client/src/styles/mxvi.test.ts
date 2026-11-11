// La copia del design system MXVI (src/styles/mxvi/) no se edita a mano: se regenera con
// `node scripts/sync-mxvi.mjs`. Este test compara cada archivo con el sha256 de manifest.json.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const MXVI = join(process.cwd(), 'src', 'styles', 'mxvi');
const manifest = JSON.parse(readFileSync(join(MXVI, 'manifest.json'), 'utf8')) as {
  source: string;
  files: Record<string, string>;
};
const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

describe('MXVI design system copy', () => {
  it('declares its origin', () => {
    expect(manifest.source).toMatch(/^(github:MoiBaldenegro\/mxvi-design-system@[0-9a-f]{40}|local:mxvi)$/);
  });

  it('matches manifest.json file by file', () => {
    for (const [file, hash] of Object.entries(manifest.files)) {
      const actual = createHash('sha256').update(readFileSync(join(MXVI, file))).digest('hex');
      expect(actual, `${file} no coincide con manifest.json: no se edita a mano`).toBe(hash);
    }
  });

  it('has no files outside the manifest', () => {
    const onDisk = listFiles(MXVI)
      .map((path) => relative(MXVI, path).split('\\').join('/'))
      .filter((file) => file !== 'manifest.json')
      .sort();
    expect(onDisk).toEqual(Object.keys(manifest.files).sort());
  });
});
