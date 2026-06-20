import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('compose ports are parameterized for per-worktree harness isolation', () => {
  const compose = readFileSync('apps/compose.yml', 'utf8');

  for (const variable of [
    'WD_API_PORT',
    'WD_POSTGRES_PORT',
    'WD_DYNAMODB_PORT',
    'WD_MINIO_PORT',
    'WD_MINIO_CONSOLE_PORT',
    'WD_ELASTICMQ_PORT',
    'WD_ELASTICMQ_UI_PORT',
  ]) {
    assert.match(compose, new RegExp(`\\$\\{${variable}:-\\d+\\}`));
  }
});

test('dev-stack does not use compose override files for port replacement', () => {
  const source = readFileSync('scripts/harness/dev-stack.mjs', 'utf8');

  assert.doesNotMatch(source, /compose\.override\.ya?ml/);
});
