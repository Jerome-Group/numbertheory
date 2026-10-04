import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

// Node module contract testing only: no browser, DOM rendering, host compatibility claim.
export async function loadRepositoryModule(root, entry) {
  const require = createRequire(join(root, 'package.json'));
  const ts = require('@typescript/typescript6');
  const uris = new Map();
  async function uri(file) {
    file = resolve(file);
    if (uris.has(file)) return uris.get(file);
    if (file.endsWith('.json')) {
      const code = `export default ${readFileSync(file, 'utf8')};`;
      const value = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
      uris.set(file, value);
      return value;
    }
    let code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const imports = [
      ...code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g),
    ];
    for (const match of imports) {
      const specifier = match[1];
      if (!specifier.startsWith('.'))
        throw new Error(`Unsupported contract-test import ${specifier}`);
      const base = resolve(dirname(file), specifier);
      const dependency = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.json`,
      ].find(existsSync);
      if (!dependency) throw new Error(`Unresolved ${specifier} in ${file}`);
      code = code
        .replaceAll(`'${specifier}'`, `'${await uri(dependency)}'`)
        .replaceAll(`"${specifier}"`, `"${await uri(dependency)}"`);
    }
    code = code.replace(/\s+with\s*\{\s*type:\s*['"]json['"]\s*\}/g, '');
    const value = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
    uris.set(file, value);
    return value;
  }
  return import(await uri(join(root, entry)));
}
