import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileExists, listFiles, printResultAndExit, readText, rel, stripRustTestModules } from './fs-utils.mjs';

const FORBIDDEN_RESOLVER_PATTERNS = [
  { regex: /\baws_sdk_[a-z0-9_]+/g, reason: 'AWS SDK belongs behind service gateways' },
  { regex: /\bAttributeValue\b/g, reason: 'DynamoDB item shape belongs behind TrackPointRepository' },
  { regex: /\bstd::env::var\b|\benv::var\b/g, reason: 'resolver env access belongs behind service/config builders' },
  { regex: /\bS3[A-Za-z]*Gateway\b|\bDynamoDb[A-Za-z]*Repository\b/g, reason: 'resolvers should depend on shared service contracts, not concrete storage clients' },
];

const RESOLVER_DIRS = [
  'apps/api/src/graphql/mutation',
  'apps/api/src/graphql/query',
  'apps/api/src/graphql/object',
];

const TRACK_POINT_WORKER_PATH = 'apps/api/src/bin/track_point_worker.rs';
const FORBIDDEN_TRACK_POINT_WORKER_ENV_CONFIG_PATTERNS = [
  /\bstruct\s+WorkerRuntimeConfig\b/,
  /\bimpl\s+WorkerRuntimeConfig\b/,
  /\bfn\s+[a-z0-9_]*env[a-z0-9_]*value\b/,
  /\bwarn_invalid_env_value\b/,
];

export function validateArchitecture({ root = process.cwd() } = {}) {
  const messages = [];

  for (const dir of RESOLVER_DIRS) {
    const files = listFiles(join(root, dir), { extensions: ['.rs'] });
    for (const file of files) {
      const content = stripRustTestModules(readText(file));
      for (const pattern of FORBIDDEN_RESOLVER_PATTERNS) {
        if (pattern.regex.test(content)) {
          messages.push(`GraphQL resolver boundary violation in ${rel(root, file)}: ${pattern.reason}`);
        }
        pattern.regex.lastIndex = 0;
      }
    }
  }

  validateMobileNavigationImports(root, messages);
  validateWalkGoalBounds(root, messages);
  validateTrackPointWorkerEnvConfig(root, messages);

  return { ok: messages.length === 0, messages };
}

function validateMobileNavigationImports(root, messages) {
  const files = listFiles(join(root, 'apps/mobile'), {
    extensions: ['.ts', '.tsx'],
    ignoreDirs: new Set(['node_modules', 'ios', 'android']),
  });
  for (const file of files) {
    const content = readText(file);
    if (content.includes("from '@react-navigation/") || content.includes('from "@react-navigation/')) {
      messages.push(`mobile navigation boundary violation in ${rel(root, file)}: import navigation APIs from expo-router`);
    }
  }
}

function validateWalkGoalBounds(root, messages) {
  const apiPath = join(root, 'apps/api/src/service/dog_walk_goal.rs');
  const mobilePath = join(root, 'apps/mobile/constants/walk.ts');
  if (!fileExists(apiPath) || !fileExists(mobilePath)) {
    messages.push('walk goal minute bounds contract files are missing');
    return;
  }

  const api = readText(apiPath);
  const mobile = readText(mobilePath);
  const apiMin = extractNumber(api, /MIN_DAILY_GOAL_MINUTES:\s*i32\s*=\s*(\d+)/);
  const apiMax = extractNumber(api, /MAX_DAILY_GOAL_MINUTES:\s*i32\s*=\s*(\d+)/);
  const mobileMin = extractNumber(mobile, /MIN_DAILY_GOAL_MINUTES\s*=\s*(\d+)/);
  const mobileMax = extractNumber(mobile, /MAX_DAILY_GOAL_MINUTES\s*=\s*(\d+)/);

  if (apiMin === null || apiMax === null || mobileMin === null || mobileMax === null) {
    messages.push('walk goal minute bounds drift: could not parse API/Mobile constants');
    return;
  }
  if (apiMin !== mobileMin || apiMax !== mobileMax) {
    messages.push(`walk goal minute bounds drift: API ${apiMin}-${apiMax}, Mobile ${mobileMin}-${mobileMax}`);
  }
}

function validateTrackPointWorkerEnvConfig(root, messages) {
  const workerPath = join(root, TRACK_POINT_WORKER_PATH);
  if (!fileExists(workerPath)) {
    return;
  }

  const content = stripRustTestModules(readText(workerPath));
  if (FORBIDDEN_TRACK_POINT_WORKER_ENV_CONFIG_PATTERNS.some((pattern) => pattern.test(content))) {
    messages.push(
      `${TRACK_POINT_WORKER_PATH}: track point worker env config should read env/defaults directly at the ConsumerOptions call site; avoid wrapper structs and custom validation fallback helpers`,
    );
  }
}

function extractNumber(source, regex) {
  const match = source.match(regex);
  return match ? Number(match[1]) : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printResultAndExit(validateArchitecture());
}
