import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateArchitecture } from './validate-architecture.mjs';

function writeFixture(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

test('validateArchitecture rejects AWS SDK usage in GraphQL resolvers', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-architecture-'));
  writeFixture(root, {
    'apps/api/src/graphql/mutation/dog.rs': 'use aws_sdk_s3::Client;\n',
    'apps/api/src/service/dog_walk_goal.rs': 'pub const MIN_DAILY_GOAL_MINUTES: i32 = 0;\npub const MAX_DAILY_GOAL_MINUTES: i32 = 120;\n',
    'apps/mobile/constants/walk.ts': 'export const MIN_DAILY_GOAL_MINUTES = 0;\nexport const MAX_DAILY_GOAL_MINUTES = 120;\n',
  });

  const result = validateArchitecture({ root });

  assert.equal(result.ok, false);
  assert.match(result.messages.join('\n'), /GraphQL resolver boundary/);
});

test('validateArchitecture rejects API and Mobile walk goal range drift', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-architecture-'));
  writeFixture(root, {
    'apps/api/src/service/dog_walk_goal.rs': 'pub const MIN_DAILY_GOAL_MINUTES: i32 = 0;\npub const MAX_DAILY_GOAL_MINUTES: i32 = 120;\n',
    'apps/mobile/constants/walk.ts': 'export const MIN_DAILY_GOAL_MINUTES = 5;\nexport const MAX_DAILY_GOAL_MINUTES = 120;\n',
  });

  const result = validateArchitecture({ root });

  assert.equal(result.ok, false);
  assert.match(result.messages.join('\n'), /walk goal minute bounds drift/);
});

test('validateArchitecture accepts clean resolver boundaries and matching walk goal bounds', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'wd-architecture-'));
  writeFixture(root, {
    'apps/api/src/graphql/mutation/dog.rs': 'use crate::service::dog;\n',
    'apps/api/src/service/dog_walk_goal.rs': 'pub const MIN_DAILY_GOAL_MINUTES: i32 = 0;\npub const MAX_DAILY_GOAL_MINUTES: i32 = 120;\n',
    'apps/mobile/constants/walk.ts': 'export const MIN_DAILY_GOAL_MINUTES = 0;\nexport const MAX_DAILY_GOAL_MINUTES = 120;\n',
  });

  const result = validateArchitecture({ root });

  assert.equal(result.ok, true, result.messages.join('\n'));
});
