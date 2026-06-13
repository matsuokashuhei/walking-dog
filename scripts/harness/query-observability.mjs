#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const query = process.argv.slice(2).join(' ').trim();
const journeyRoot = join(root, '.harness-runs', 'journeys');

if (!query) {
  console.error('Usage: node scripts/harness/query-observability.mjs <walk-id|operation|error text>');
  process.exit(2);
}

const matches = [];
if (existsSync(journeyRoot)) {
  for (const dir of readdirSync(journeyRoot)) {
    const fullDir = join(journeyRoot, dir);
    for (const file of readdirSync(fullDir).filter((name) => name.endsWith('.json'))) {
      const fullPath = join(fullDir, file);
      const content = readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        matches.push(fullPath);
      }
    }
  }
}

console.log(JSON.stringify({
  query,
  matches,
  note: 'Local OpenTelemetry backend queries should be added here when infra/observability is running.',
}, null, 2));
