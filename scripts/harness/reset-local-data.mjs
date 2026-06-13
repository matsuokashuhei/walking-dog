#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const runRoot = join(root, '.harness-runs');
const seedPath = join(root, 'scripts/harness/fixtures/seed-data.json');

mkdirSync(runRoot, { recursive: true });
if (existsSync(join(runRoot, 'journeys'))) {
  rmSync(join(runRoot, 'journeys'), { recursive: true, force: true });
}
mkdirSync(join(runRoot, 'journeys'), { recursive: true });
writeFileSync(join(runRoot, 'last-reset.json'), JSON.stringify({
  resetAt: new Date().toISOString(),
  seedPath,
}, null, 2));

const result = spawnSync('node', ['scripts/harness/dev-stack.mjs', 'down'], { cwd: root, stdio: 'inherit' });
if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Harness local data reset. Seed fixture: ${seedPath}`);
