import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const assetRoot = join(projectRoot, 'public', 'assets', 'dcss-preview');
const outputPath = join(assetRoot, 'sprite-manifest.json');

async function pngPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pngPaths(path);
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.png')) return [];
    return [relative(assetRoot, path).split('\\').join('/')];
  }));
  return nested.flat();
}

const paths = (await pngPaths(assetRoot)).sort((left, right) => left.localeCompare(right));
const manifest = { version: 1, count: paths.length, paths };
await writeFile(outputPath, `${JSON.stringify(manifest)}\n`, 'utf8');
console.log(`Generated ${relative(projectRoot, outputPath)} with ${paths.length} sprites.`);
