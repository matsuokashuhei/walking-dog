#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const journey = process.argv[2];
const apiUrl = process.env.HARNESS_API_URL ?? 'http://localhost:3000/graphql';

const JOURNEYS = new Set([
  'auth-onboarding',
  'dog-profile',
  'walk-goal',
  'walk-lifecycle',
  'walk-events-photo',
  'walk-history-owner-contribution',
]);

if (!journey || !JOURNEYS.has(journey)) {
  console.error(`Usage: node scripts/harness/run-api-journey.mjs <${[...JOURNEYS].join('|')}>`);
  process.exit(2);
}

const steps = buildSteps(journey);
if (steps.some((step) => step.requiresAuth) && !process.env.HARNESS_ACCESS_TOKEN) {
  console.error(`Journey ${journey} requires HARNESS_ACCESS_TOKEN. Mint one with scripts/harness/local-auth.mjs and export it before running this journey.`);
  process.exit(2);
}

const runDir = join(root, '.harness-runs', 'journeys', `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${journey}`);
mkdirSync(runDir, { recursive: true });

const results = [];
for (const step of steps) {
  const startedAt = new Date().toISOString();
  const response = await graphql(step.query, step.variables);
  const finishedAt = new Date().toISOString();
  const record = { name: step.name, startedAt, finishedAt, request: step, response };
  results.push(record);
  writeFileSync(join(runDir, `${String(results.length).padStart(2, '0')}-${step.name}.json`), JSON.stringify(record, null, 2));
  if (response.errors?.length) {
    writeFileSync(join(runDir, 'result.json'), JSON.stringify({ ok: false, results }, null, 2));
    console.error(`Journey ${journey} failed at step ${step.name}`);
    process.exit(1);
  }
}

writeFileSync(join(runDir, 'result.json'), JSON.stringify({ ok: true, journey, apiUrl, results }, null, 2));
console.log(`Journey ${journey} evidence written to ${runDir}`);

async function graphql(query, variables = {}) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.HARNESS_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.HARNESS_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.text();
  try {
    return { status: response.status, ...JSON.parse(body) };
  } catch {
    return { status: response.status, errors: [{ message: body }] };
  }
}

function buildSteps(name) {
  const smoke = [{ name: 'schema-smoke', query: '{ __typename }' }];
  if (name === 'auth-onboarding') {
    return smoke.concat([
      {
        name: 'sign-up-contract',
        query: 'mutation HarnessSignUp($input: SignUpInput!) { signUp(input: $input) { success } }',
        variables: { input: { email: `harness-${Date.now()}@example.com`, password: 'HarnessPassw0rd!' } },
      },
    ]);
  }
  if (name === 'walk-lifecycle') {
    return smoke.concat([
      {
        name: 'user-query-contract',
        query: '{ user { id } }',
        requiresAuth: true,
      },
    ]);
  }
  return smoke;
}
