import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileExists, listFiles, printResultAndExit, rel } from './fs-utils.mjs';

const REQUIRED_QUALITY_DOCS = [
  'docs/harness/quality-score.md',
  'docs/harness/lessons-learned.md',
];

export function scoreQuality({ root = process.cwd(), today = new Date() } = {}) {
  const messages = [];

  for (const path of REQUIRED_QUALITY_DOCS) {
    if (!fileExists(join(root, path))) {
      messages.push(`missing required quality document: ${path}`);
    }
  }

  const planFiles = listFiles(join(root, 'docs/superpowers/plans'), { extensions: ['.md'] });
  const staleCutoffMs = 60 * 24 * 60 * 60 * 1000;
  for (const plan of planFiles) {
    const date = extractPlanDate(plan);
    if (!date) {
      continue;
    }
    const ageMs = today.getTime() - date.getTime();
    if (ageMs > staleCutoffMs) {
      messages.push(`old active plan should be completed or archived: ${rel(root, plan)}`);
    }
  }

  return { ok: messages.length === 0, messages };
}

function extractPlanDate(path) {
  const match = path.match(/(\d{4})-(\d{2})-(\d{2})-[^/]+\.md$/);
  if (!match) {
    return null;
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printResultAndExit(scoreQuality());
}
