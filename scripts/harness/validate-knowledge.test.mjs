import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateKnowledge } from './validate-knowledge.mjs';

function writeFixture(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

test('validateKnowledge reports missing local markdown links', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-knowledge-'));
  writeFixture(root, {
    'AGENTS.md': '# Agents\n\n- [Missing](docs/missing.md)\n',
    'docs/harness/index.md': '# Harness\n',
    'docs/harness/journeys/walk-lifecycle.md': [
      '# Walk Lifecycle',
      '- 犬の体験: yes',
      '- データによる散歩の最大化: yes',
      '- 飼い主の貢献心: yes',
    ].join('\n'),
  });

  const result = validateKnowledge({ root });

  assert.equal(result.ok, false);
  assert.match(result.messages.join('\n'), /missing local link/);
  assert.match(result.messages.join('\n'), /docs\/missing\.md/);
});

test('validateKnowledge accepts a compact AGENTS map and required harness docs', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-knowledge-'));
  writeFixture(root, {
    'AGENTS.md': [
      '# Agents',
      '- [Harness](docs/harness/README.md)',
      '- [Quality](docs/harness/quality-score.md)',
    ].join('\n'),
    'CLAUDE.md': '# Compatibility\n\nSee [AGENTS.md](AGENTS.md).\n',
    'docs/harness/README.md': '# Harness\n',
    'docs/product/principles.md': '# Product\n',
    'docs/harness/domain-rules.md': '# Domain\n',
    'docs/architecture/harness-first-development.md': '# Architecture\n',
    'docs/runbooks/local-harness.md': '# Runbook\n',
    'docs/harness/quality-score.md': '# Quality Score\n',
    'docs/harness/lessons-learned.md': '# Lessons Learned\n',
    'docs/harness/journeys/auth-onboarding.md': '# Auth\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
    'docs/harness/journeys/dog-profile.md': '# Dog\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
    'docs/harness/journeys/walk-goal.md': '# Goal\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
    'docs/harness/journeys/walk-lifecycle.md': '# Walk\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
    'docs/harness/journeys/walk-events-photo.md': '# Events\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
    'docs/harness/journeys/walk-history-owner-contribution.md': '# History\n犬の体験\nデータによる散歩の最大化\n飼い主の貢献心\n',
  });

  const result = validateKnowledge({ root });

  assert.equal(result.ok, true, result.messages.join('\n'));
});
