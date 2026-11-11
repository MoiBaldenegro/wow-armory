// Sincroniza el design system MXVI en src/styles/mxvi/: tokens, fuentes, base y componentes.
// La copia no se edita a mano; manifest.json guarda el origen (commit) y el sha256 de cada archivo.
// Para cambiar un componente se cambia en el design system y se vuelve a ejecutar este script.
//
// Uso:
//   node scripts/sync-mxvi.mjs                       # desde GitHub, rama main
//   node scripts/sync-mxvi.mjs --ref <commit|rama>   # desde GitHub, otra referencia
//   node scripts/sync-mxvi.mjs ../mxvi-design-system/mxvi   # desde una carpeta local
//   ... --out <carpeta>                              # destino (por defecto src/styles/mxvi)

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'MoiBaldenegro/mxvi-design-system';
const ENTRIES = ['tokens.css', 'fonts.css', 'base.css', 'components.css'];
const FONTS = [
  'fonts/Geist-Variable.woff2',
  'fonts/Geist-Italic-Variable.woff2',
  'fonts/GeistMono-Variable.woff2',
  'fonts/GeistPixel-Circle.woff2',
  'fonts/LICENSE.txt',
];

function parseArgs(argv) {
  const args = { source: undefined, out: join(ROOT, 'src', 'styles', 'mxvi'), ref: 'main' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = resolve(argv[(i += 1)]);
    else if (argv[i] === '--ref') args.ref = argv[(i += 1)];
    else args.source = resolve(argv[i]);
  }
  return args;
}

async function remoteReader(ref) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/commits/${ref}`);
  if (!response.ok) throw new Error(`No se pudo resolver ${REPO}@${ref}: HTTP ${response.status}`);
  const { sha } = await response.json();
  return {
    origin: `github:${REPO}@${sha}`,
    async read(file) {
      const url = `https://raw.githubusercontent.com/${REPO}/${sha}/mxvi/${file}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}

function localReader(source) {
  return { origin: 'local:mxvi', read: async (file) => readFileSync(join(source, file)) };
}

// Sigue los @import relativos (solo hojas del propio paquete).
async function collect(reader, file, files) {
  if (files.has(file)) return;
  const content = await reader.read(file);
  files.set(file, content);
  if (!file.endsWith('.css')) return;
  for (const match of content.toString('utf8').matchAll(/@import\s+'([^']+)';/g)) {
    const next = posix.normalize(posix.join(posix.dirname(file), match[1]));
    if (next.startsWith('..')) throw new Error(`${file}: import fuera del paquete (${match[1]})`);
    await collect(reader, next, files);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reader = args.source ? localReader(args.source) : await remoteReader(args.ref);
  const files = new Map();
  for (const entry of [...ENTRIES, ...FONTS]) await collect(reader, entry, files);

  rmSync(args.out, { recursive: true, force: true });
  const manifest = { source: reader.origin, files: {} };
  for (const [file, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const target = join(args.out, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    manifest.files[file] = createHash('sha256').update(content).digest('hex');
  }
  writeFileSync(join(args.out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`MXVI ✔ ${files.size} archivos copiados en ${args.out} desde ${reader.origin}`);
}

main().catch((error) => {
  console.error(`MXVI ✘ ${error.message}`);
  process.exit(1);
});
