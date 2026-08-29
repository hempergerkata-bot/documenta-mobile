const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils/localization.ts'), 'utf8');
const files = [];
for (const directory of ['app', 'components', 'hooks']) {
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  visit(path.join(root, directory));
}
const baseBlock = source.match(/const de: TranslationDictionary = \{([\s\S]*?)\n\};/)?.[1] ?? '';
const catalogKeys = [...baseBlock.matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]);
const duplicates = catalogKeys.filter((key, index) => catalogKeys.indexOf(key) !== index);
const languageCodes = [...source.matchAll(/\{ code: '([^']+)', nativeName:/g)].map((match) => match[1]);
const catalogBlock = source.match(/export const translations:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const registeredCatalogs = [...catalogBlock.matchAll(/^\s{2}([a-z]{2})(?::|,)/gm)].map((match) => match[1]);
const missingCatalogs = languageCodes.filter((code) => !registeredCatalogs.includes(code));
const unexpectedCatalogs = registeredCatalogs.filter((code) => !languageCodes.includes(code));
const usage = files.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
const unknown = [...new Set(usage.filter((key) => !catalogKeys.includes(key)))];
const unused = [...new Set(catalogKeys.filter((key) => !usage.includes(key)))];

console.log(`Localization audit: ${catalogKeys.length} catalog keys, ${languageCodes.length} registered languages, ${new Set(usage).size} statically used keys.`);
console.log(`Catalog registry parity: ${missingCatalogs.length || unexpectedCatalogs.length ? `missing ${missingCatalogs.join(', ') || 'none'}; unexpected ${unexpectedCatalogs.join(', ') || 'none'}` : 'complete'}`);
console.log(`Duplicate keys: ${duplicates.length ? duplicates.join(', ') : 'none'}`);
console.log(`Unknown used keys: ${unknown.length ? unknown.join(', ') : 'none'}`);
console.log(`Currently unused/reserved keys: ${unused.length ? unused.join(', ') : 'none'}`);
if (languageCodes.length !== 15 || duplicates.length || unknown.length || missingCatalogs.length || unexpectedCatalogs.length) process.exit(1);