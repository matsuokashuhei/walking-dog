import { Kind, parse } from 'graphql';
import { WALK_QUERY, WALKS_QUERY } from './walk';

describe('walk queries', () => {
  it.each([
    ['WALK_QUERY', WALK_QUERY],
    ['WALKS_QUERY', WALKS_QUERY],
  ])('%s is a valid GraphQL document with the expected operation', (name, query) => {
    const document = parse(query);
    const operations = document.definitions.filter(
      definition => definition.kind === Kind.OPERATION_DEFINITION,
    );

    expect(operations).toHaveLength(1);
    expect(operations[0].name?.value).toBe(name === 'WALK_QUERY' ? 'Walk' : 'Walks');
  });
});
