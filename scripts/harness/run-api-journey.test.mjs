import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('walk-lifecycle API journey uses the current user query field', () => {
  const source = readFileSync('scripts/harness/run-api-journey.mjs', 'utf8');

  assert.match(source, /query:\s*'\{ user \{ id \} \}'/);
  assert.doesNotMatch(source, /\{ me \{ id \} \}/);
});

test('authenticated API journeys fail fast when token is missing', () => {
  const source = readFileSync('scripts/harness/run-api-journey.mjs', 'utf8');

  assert.match(source, /requiresAuth:\s*true/);
  assert.match(source, /HARNESS_ACCESS_TOKEN/);
});
