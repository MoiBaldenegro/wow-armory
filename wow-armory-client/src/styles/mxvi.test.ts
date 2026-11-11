// La copia del design system MXVI (src/styles/mxvi/) no se edita a mano: se regenera con
// `node scripts/sync-mxvi.mjs`. Este test compara cada hoja con el sha256 de manifest.json.
// Usa import.meta.glob y Web Crypto para no depender de los tipos de Node (las fuentes, que
// son binarias, solo se comprueban por nombre).
import { describe, expect, it } from 'vitest';

const sheets = import.meta.glob<string>('./mxvi/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const allFiles = Object.keys(import.meta.glob('./mxvi/**/*'));
const manifestSource = Object.values(
  import.meta.glob<string>('./mxvi/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)[0];
const manifest = JSON.parse(manifestSource) as {
  source: string;
  files: Record<string, string>;
};

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('MXVI design system copy', () => {
  it('declares its origin', () => {
    expect(manifest.source).toMatch(
      /^(github:MoiBaldenegro\/mxvi-design-system@[0-9a-f]{40}|local:mxvi)$/,
    );
  });

  it('matches manifest.json sheet by sheet', async () => {
    const cssFiles = Object.keys(manifest.files).filter((file) => file.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(10);

    for (const file of cssFiles) {
      const content = sheets[`./mxvi/${file}`];
      expect(content, `${file} falta en la copia`).toBeTypeOf('string');
      expect(
        await sha256(content),
        `${file} no coincide con manifest.json: no se edita a mano`,
      ).toBe(manifest.files[file]);
    }
  });

  it('has no files outside the manifest', () => {
    const onDisk = allFiles
      .map((path) => path.replace('./mxvi/', ''))
      .filter((file) => file !== 'manifest.json')
      .sort();
    expect(onDisk).toEqual(Object.keys(manifest.files).sort());
  });
});
