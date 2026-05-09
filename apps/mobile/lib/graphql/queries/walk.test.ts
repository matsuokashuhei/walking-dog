import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSchema, parse, validate } from 'graphql';
import { WALK_QUERY, WALKS_QUERY } from './walk';

const schemaPath = resolve(__dirname, '../../../../api/schema.graphql');
const schema = buildSchema(readFileSync(schemaPath, 'utf8'));

describe('walk queries', () => {
  it.each([
    ['WALK_QUERY', WALK_QUERY],
    ['WALKS_QUERY', WALKS_QUERY],
  ])('%s is valid against the API schema', (_name, query) => {
    const errors = validate(schema, parse(query));
    expect(errors).toEqual([]);
  });
});
