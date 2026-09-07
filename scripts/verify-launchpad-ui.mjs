import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const componentRoot = path.join(root, 'components/commercetools-ui');
const manifest = JSON.parse(fs.readFileSync(path.join(componentRoot, 'source-manifest.json'), 'utf8'));
const errors = [];
for (const file of manifest.files) {
  if (!fs.existsSync(path.join(componentRoot, file))) errors.push(`Missing source component: ${file}`);
}
function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
}
const productionFiles = [...walk(componentRoot), ...walk(path.join(root, 'lib/launchpad'))]
  .filter(file => /\.(ts|tsx|js)$/.test(file) && !/\.(stories|spec|test)\./.test(file));
function exists(base) {
  return ['', '.ts', '.tsx', '.d.ts', '.js', '.json', '/index.ts', '/index.tsx', '/index.js'].some(suffix => {
    const candidate = base + suffix;
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  });
}
for (const file of productionFiles) {
  const imports = ts.preProcessFile(fs.readFileSync(file, 'utf8'), true, true).importedFiles;
  for (const { fileName: specifier } of imports) {
    const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : undefined;
    if (base && !exists(base)) errors.push(`Unresolved ${specifier} in ${path.relative(root, file)}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Verified ${manifest.fileCount} upstream UI files and local imports in ${productionFiles.length} production modules.`);
