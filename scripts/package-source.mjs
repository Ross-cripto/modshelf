import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';

const PROJECT_ROOT = process.cwd();
const SOURCE_DIRECTORIES = ['app', 'components', 'lib', 'public', 'scripts', 'tests', 'catalog', '.claude', '.github'];
const SOURCE_FILES = ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'vercel.json', '.gitignore', '.env.example', 'README.md', 'CONTRIBUTING.md', 'DESIGN.md', '.impeccable/design.json', 'LICENSE', 'ATTRIBUTION.md'];
const ARCHIVE_PATH = 'public/modshelf-source.zip';
const archiveEntries = {};

async function addFile(path) {
  const archiveName = relative(PROJECT_ROOT, path).replaceAll('\\', '/');
  if (archiveName === ARCHIVE_PATH) return;
  archiveEntries[`modshelf/${archiveName}`] = new Uint8Array(await readFile(path));
}

async function addDirectory(path) {
  const entries = await readdir(path, {withFileTypes: true});
  for (const entry of entries) {
    const childPath = join(path, entry.name);
    if (entry.isDirectory()) await addDirectory(childPath);
    if (entry.isFile()) await addFile(childPath);
  }
}

for (const directory of SOURCE_DIRECTORIES) await addDirectory(join(PROJECT_ROOT, directory));
for (const name of SOURCE_FILES) {
  try {
    await addFile(join(PROJECT_ROOT, name));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
await writeFile(join(PROJECT_ROOT, ARCHIVE_PATH), zipSync(archiveEntries, {level: 6}));
process.stdout.write('Source archive refreshed.\n');
