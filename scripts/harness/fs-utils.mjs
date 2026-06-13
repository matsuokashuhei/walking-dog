import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function fileExists(path) {
  return existsSync(path) && statSync(path).isFile();
}

export function listFiles(root, options = {}) {
  const {
    extensions = null,
    include = () => true,
    ignoreDirs = new Set(['.git', '.claude', 'node_modules', 'target', 'ios', 'android', '.harness-runs']),
  } = options;
  const files = [];

  function visit(dir) {
    if (!existsSync(dir)) {
      return;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          visit(join(dir, entry.name));
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const path = join(dir, entry.name);
      if (extensions && !extensions.includes(extname(entry.name))) {
        continue;
      }
      if (include(path)) {
        files.push(path);
      }
    }
  }

  visit(root);
  return files;
}

export function rel(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

export function stripRustTestModules(source) {
  return source.replaceAll(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{[\s\S]*?\n\}/g, '');
}

export function printResultAndExit(result) {
  for (const message of result.messages) {
    console.error(message);
  }
  process.exit(result.ok ? 0 : 1);
}
