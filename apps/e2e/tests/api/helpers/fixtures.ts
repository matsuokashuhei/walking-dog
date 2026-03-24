import { test as base } from '@playwright/test';
import { GraphQLClient } from './graphql-client';
import { registerAndSignIn } from './auth';

export { expect } from '@playwright/test';

type ApiFixtures = {
  graphql: GraphQLClient;
  authedGraphql: GraphQLClient;
};

export const test = base.extend<ApiFixtures>({
  graphql: async ({ request }, use) => {
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    await use(new GraphQLClient(request, baseURL));
  },

  authedGraphql: async ({ request }, use) => {
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const client = new GraphQLClient(request, baseURL);
    await registerAndSignIn(client);
    await use(client);
  },
});
