#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const command = process.argv[2] ?? 'help';
const runRoot = join(root, '.harness-runs', 'dev-stack');
const projectName = makeProjectName(root);
const ports = makePorts(root);

function main() {
  mkdirSync(runRoot, { recursive: true });
  writeFileSync(join(runRoot, 'env.json'), JSON.stringify({ projectName, ports }, null, 2));

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const argsByCommand = {
    up: ['up', '-d', 'postgres', 'dynamodb-local', 'minio', 'minio-init', 'elasticmq', 'cognito-local', 'api', 'track-point-worker'],
    down: ['down'],
    status: ['ps'],
    logs: ['logs', '--tail=200'],
  };
  const composeArgs = argsByCommand[command];
  if (!composeArgs) {
    console.error(`Unknown harness dev-stack command: ${command}`);
    printHelp();
    process.exit(2);
  }

  run('docker', [
    'compose',
    '-p',
    projectName,
    '-f',
    'apps/compose.yml',
    ...composeArgs,
  ]);
}

function makeProjectName(path) {
  const hash = createHash('sha1').update(path).digest('hex').slice(0, 8);
  return `walking_dog_${basename(path).replaceAll(/[^a-zA-Z0-9]/g, '_')}_${hash}`.toLowerCase();
}

function makePorts(path) {
  const hash = Number.parseInt(createHash('sha1').update(path).digest('hex').slice(0, 4), 16);
  const offset = hash % 3000;
  return {
    api: 3000 + offset,
    postgres: 5432 + offset,
    dynamodb: 8000 + offset,
    minio: 9000 + offset,
    minioConsole: 9001 + offset,
    elasticmq: 9324 + offset,
    elasticmqUi: 9325 + offset,
    cognito: 9229 + offset,
  };
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: composeEnv() });
  process.exit(result.status ?? 1);
}

function composeEnv() {
  return {
    ...process.env,
    WD_API_PORT: String(ports.api),
    WD_POSTGRES_PORT: String(ports.postgres),
    WD_DYNAMODB_PORT: String(ports.dynamodb),
    WD_MINIO_PORT: String(ports.minio),
    WD_MINIO_CONSOLE_PORT: String(ports.minioConsole),
    WD_ELASTICMQ_PORT: String(ports.elasticmq),
    WD_ELASTICMQ_UI_PORT: String(ports.elasticmqUi),
    WD_COGNITO_PORT: String(ports.cognito),
  };
}

function printHelp() {
  console.log(`walking-dog harness dev stack

Usage:
  node scripts/harness/dev-stack.mjs up
  node scripts/harness/dev-stack.mjs down
  node scripts/harness/dev-stack.mjs status
  node scripts/harness/dev-stack.mjs logs

Project: ${projectName}
Ports: ${JSON.stringify(ports)}
`);
}

main();
