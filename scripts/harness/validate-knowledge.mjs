import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileExists, listFiles, printResultAndExit, readText, rel } from './fs-utils.mjs';

const REQUIRED_DOCS = [
  'docs/harness/README.md',
  'docs/product/principles.md',
  'docs/harness/domain-rules.md',
  'docs/architecture/harness-first-development.md',
  'docs/runbooks/local-harness.md',
  'docs/harness/quality-score.md',
  'docs/harness/lessons-learned.md',
  'docs/harness/journeys/auth-onboarding.md',
  'docs/harness/journeys/dog-profile.md',
  'docs/harness/journeys/walk-goal.md',
  'docs/harness/journeys/walk-lifecycle.md',
  'docs/harness/journeys/walk-events-photo.md',
  'docs/harness/journeys/walk-history-owner-contribution.md',
];

const REQUIRED_AXES = ['犬の体験', 'データによる散歩の最大化', '飼い主の貢献心'];

export function validateKnowledge({ root = process.cwd() } = {}) {
  const messages = [];
  const agentsPath = join(root, 'AGENTS.md');
  const claudePath = join(root, 'CLAUDE.md');

  if (!fileExists(agentsPath)) {
    messages.push('missing AGENTS.md');
  } else {
    const lineCount = readText(agentsPath).split('\n').length;
    if (lineCount > 130) {
      messages.push(`AGENTS.md must stay compact as a table of contents; found ${lineCount} lines`);
    }
  }

  if (!fileExists(claudePath)) {
    messages.push('missing CLAUDE.md compatibility entrypoint');
  }

  for (const path of REQUIRED_DOCS) {
    if (!fileExists(join(root, path))) {
      messages.push(`missing required knowledge document: ${path}`);
    }
  }

  for (const journey of REQUIRED_DOCS.filter((path) => path.includes('/journeys/'))) {
    const fullPath = join(root, journey);
    if (!fileExists(fullPath)) {
      continue;
    }
    const content = readText(fullPath);
    for (const axis of REQUIRED_AXES) {
      if (!content.includes(axis)) {
        messages.push(`${journey} is missing product axis: ${axis}`);
      }
    }
  }

  const markdownFiles = listFiles(root, { extensions: ['.md'] });
  for (const file of markdownFiles) {
    const content = readText(file);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim();
      if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('#')) {
        continue;
      }
      const target = rawTarget.split('#')[0];
      if (!target) {
        continue;
      }
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved)) {
        messages.push(`${rel(root, file)} has missing local link: ${rawTarget}`);
      }
    }
  }

  return { ok: messages.length === 0, messages };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printResultAndExit(validateKnowledge());
}
