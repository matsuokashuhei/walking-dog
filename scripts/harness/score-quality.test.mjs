import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { scoreQuality } from './score-quality.mjs';

test('scoreQuality flags stale completed plans and missing harness docs', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-quality-'));
  mkdirSync(join(root, 'docs/superpowers/plans'), { recursive: true });
  writeFileSync(join(root, 'docs/superpowers/plans/2025-01-01-old.md'), '# Old\n');

  const result = scoreQuality({ root, today: new Date('2026-06-13T00:00:00Z') });

  assert.equal(result.ok, false);
  assert.match(result.messages.join('\n'), /missing required quality document/);
  assert.match(result.messages.join('\n'), /old active plan/);
});
