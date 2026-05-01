import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const scopedComponentDirs = [
  join(__dirname),
  join(__dirname, '..', 'settings'),
  join(__dirname, '..', 'dogs'),
];

const productionComponentFiles = scopedComponentDirs.flatMap((dir) =>
  readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.tsx') && !fileName.endsWith('.test.tsx'))
    .map((fileName) => join(dir, fileName)),
);

const deprecatedColorAliasPattern = new RegExp(
  [
    'surfaceContainer' + 'Lowest',
    'surfaceContainer' + 'High',
    'card' + 'Border',
    'primary' + 'Container',
  ].join('|'),
);

const forbiddenPatterns = [
  { label: 'inline style objects', pattern: /style=\{\{/ },
  { label: 'hard-coded hex colors', pattern: /#[0-9A-Fa-f]{3,8}|color=".*#[0-9A-Fa-f]{3,8}/ },
  { label: 'hard-coded rgba colors', pattern: /rgba\(/ },
  {
    label: 'deprecated typography aliases',
    pattern: /typography\.(display|hero|h1|h2|h3|bodyMedium|label)/,
  },
  {
    label: 'deprecated color aliases',
    pattern: deprecatedColorAliasPattern,
  },
  {
    label: 'hard-coded font styles',
    pattern:
      /fontSize:\s*\d|fontSize=\{\d|fontWeight:\s*['"]|letterSpacing:\s*-?\d|lineHeight:\s*\d/,
  },
  {
    label: 'hard-coded spacing styles',
    pattern:
      /padding[A-Za-z]*:\s*\d|margin[A-Za-z]*:\s*\d|gap:\s*\d|borderRadius:\s*\d/,
  },
  {
    label: 'hard-coded shadow styles',
    pattern: /shadow(Color|Offset|Opacity|Radius):|elevation:\s*\d/,
  },
];

describe('design-system scoped production components', () => {
  test.each(forbiddenPatterns)('avoid %s', ({ pattern }) => {
    const violations = productionComponentFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => pattern.test(line))
        .map(({ line, number }) => `${filePath}:${number}: ${line.trim()}`);
    });

    expect(violations).toEqual([]);
  });
});
