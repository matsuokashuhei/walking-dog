import type { APIRequestContext } from '@playwright/test';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export class GraphQLClient {
  private token: string | null = null;

  constructor(
    private request: APIRequestContext,
    private baseURL: string,
  ) {}

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  async execute<T = any>(
    query: string,
    variables?: Record<string, any>,
  ): Promise<GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await this.request.post(`${this.baseURL}/graphql`, {
      headers,
      data: { query, variables },
    });

    return response.json();
  }
}
