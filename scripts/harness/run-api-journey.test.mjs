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
  assert.match(source, /real AWS Cognito access token/);
  assert.doesNotMatch(source, new RegExp(`local${'-'}auth`));
});

test('auth-onboarding API journey starts unified email one-time password auth', () => {
  const source = readFileSync('scripts/harness/run-api-journey.mjs', 'utf8');

  assert.match(source, /mutation HarnessRequestOneTimePassword\(\$input: RequestOneTimePasswordInput!\)/);
  assert.match(source, /requestOneTimePassword\(input: \$input\)/);
  assert.match(source, /session/);
  assert.doesNotMatch(source, /displayName/);
  assert.doesNotMatch(source, /purpose/);
  assert.doesNotMatch(source, /password\s*:/);
});
