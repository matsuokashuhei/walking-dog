# Mobile Foundation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared infrastructure that all Phase 1 features depend on — testing setup, TypeScript types, auth wrapper, Zustand stores, TanStack Query hooks, and UI primitives.

**Architecture:** Auth tokens stored in `expo-secure-store`, restored on app startup and injected into the GraphQL client via `setAuthToken()`. Navigation guard in root `_layout.tsx` redirects unauthenticated users to `(auth)/login`. TanStack Query wraps all GraphQL calls via custom hooks. Zustand manages client-side auth state with SecureStore persistence.

**Tech Stack:** Expo 54, React Native 0.81, zustand@5, @tanstack/react-query@5, amazon-cognito-identity-js@6, expo-secure-store@15, graphql-request@7, TypeScript strict mode, Jest + jest-expo + RNTL

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/types/graphql.ts` | TypeScript interfaces for all GraphQL response shapes |
| Create | `apps/mobile/lib/auth/secure-storage.ts` | expo-secure-store wrapper (getToken, setToken, deleteToken) |
| Create | `apps/mobile/lib/auth/cognito.ts` | amazon-cognito-identity-js wrapper (signUp, confirmSignUp, signIn, signOut, getCurrentIdToken) |
| Create | `apps/mobile/stores/auth-store.ts` | Zustand store for auth state with SecureStore persistence |
| Create | `apps/mobile/hooks/use-auth.ts` | Exposes signIn, signUp, signOut, isAuthenticated |
| Create | `apps/mobile/lib/graphql/query-keys.ts` | TanStack Query key factories (meKeys, dogKeys, walkKeys) |
| Create | `apps/mobile/hooks/use-me.ts` | useQuery wrapping ME_QUERY |
| Create | `apps/mobile/hooks/use-dog.ts` | useQuery wrapping DOG_QUERY |
| Create | `apps/mobile/hooks/use-walks.ts` | useQuery wrapping MY_WALKS_QUERY and WALK_QUERY |
| Create | `apps/mobile/hooks/use-dog-mutations.ts` | useMutation for dog CRUD + photo upload |
| Create | `apps/mobile/hooks/use-walk-mutations.ts` | useMutation for walk lifecycle |
| Create | `apps/mobile/hooks/use-profile-mutation.ts` | useMutation for updateProfile |
| Create | `apps/mobile/theme/tokens.ts` | spacing, typography, radius tokens (extends existing Colors) |
| Create | `apps/mobile/components/ui/Button.tsx` | Themed button (primary/secondary/destructive, loading state) |
| Create | `apps/mobile/components/ui/TextInput.tsx` | Themed text input (label, error message, accessibilityLabel) |
| Create | `apps/mobile/components/ui/LoadingScreen.tsx` | Full-screen activity indicator |
| Create | `apps/mobile/components/ui/ErrorBoundary.tsx` | Class component error boundary with retry |
| Create | `apps/mobile/components/ui/EmptyState.tsx` | Empty state (icon + message + optional CTA) |
| Create | `apps/mobile/components/ui/ConfirmDialog.tsx` | Modal confirmation dialog |
| Modify | `apps/mobile/lib/providers.tsx` | Add auth store initialization on mount |
| Modify | `apps/mobile/app/_layout.tsx` | Add navigation guard (useSegments + useRouter) |
| Modify | `apps/compose.yml` | Add COGNITO_* env vars to mobile service |

---

## Task 1: Testing Infrastructure

**Files:**
- Modify: `apps/mobile/package.json` (add jest-expo, RNTL, jest config)

- [ ] **Step 1: Install test dependencies**

```bash
docker compose -f apps/compose.yml run --rm mobile npm install --save-dev jest-expo jest @testing-library/react-native @testing-library/jest-native @types/jest
```

- [ ] **Step 2: Add jest config to package.json**

Add to `apps/mobile/package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    },
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))"
    ]
  }
}
```

- [ ] **Step 3: Verify setup works**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed, 0 total`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json
git commit -m "chore(mobile): add Jest + jest-expo + RNTL test infrastructure"
```

---

## Task 2: GraphQL TypeScript Types

**Files:**
- Create: `apps/mobile/types/graphql.ts`
- Test: `apps/mobile/types/graphql.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/types/graphql.test.ts`:
```typescript
import type { Dog, User, Walk, WalkStats, BirthDate } from './graphql';

describe('graphql types', () => {
  it('Dog type has required fields', () => {
    const dog: Dog = {
      id: '1',
      name: 'Pochi',
      breed: null,
      gender: null,
      birthDate: null,
      photoUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(dog.id).toBe('1');
  });

  it('BirthDate allows partial dates', () => {
    const bd: BirthDate = { year: 2020, month: null, day: null };
    expect(bd.year).toBe(2020);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="types/graphql"
```

Expected: FAIL — `Cannot find module './graphql'`

- [ ] **Step 3: Create the types file**

Create `apps/mobile/types/graphql.ts`:
```typescript
export type WalkStatus = 'ACTIVE' | 'FINISHED';

export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export interface BirthDate {
  year: number;
  month: number | null;
  day: number | null;
}

export interface Dog {
  id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  birthDate: BirthDate | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface DogWithStats extends Dog {
  walkStats: WalkStats;
  walks: Walk[];
}

export interface WalkStats {
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
}

export interface WalkPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface Walk {
  id: string;
  dogs: Pick<Dog, 'id' | 'name' | 'photoUrl'>[];
  status: WalkStatus;
  distanceM: number;
  durationSec: number;
  startedAt: string;
  endedAt: string | null;
}

export interface WalkWithPoints extends Walk {
  points: WalkPoint[];
}

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserWithDogs extends User {
  dogs: Dog[];
}

export interface PresignedUrlOutput {
  url: string;
  key: string;
  expiresAt: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="types/graphql"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/types/graphql.ts apps/mobile/types/graphql.test.ts
git commit -m "feat(mobile): add GraphQL TypeScript type definitions"
```

---

## Task 3: Secure Storage Wrapper

**Files:**
- Create: `apps/mobile/lib/auth/secure-storage.ts`
- Test: `apps/mobile/lib/auth/secure-storage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/lib/auth/secure-storage.test.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, deleteToken } from './secure-storage';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure-storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setToken stores idToken and refreshToken', async () => {
    await setToken('id-token-value', 'refresh-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_id_token', 'id-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh-token-value');
  });

  it('getToken retrieves stored tokens', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(key === 'auth_id_token' ? 'stored-id' : 'stored-refresh')
    );
    const result = await getToken();
    expect(result).toEqual({ idToken: 'stored-id', refreshToken: 'stored-refresh' });
  });

  it('getToken returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('deleteToken removes both keys', async () => {
    await deleteToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_id_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/auth/secure-storage"
```

Expected: FAIL

- [ ] **Step 3: Implement secure storage wrapper**

Create `apps/mobile/lib/auth/secure-storage.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';

const ID_TOKEN_KEY = 'auth_id_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export interface StoredTokens {
  idToken: string;
  refreshToken: string;
}

export async function setToken(idToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getToken(): Promise<StoredTokens | null> {
  const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!idToken || !refreshToken) return null;
  return { idToken, refreshToken };
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/auth/secure-storage"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/auth/secure-storage.ts apps/mobile/lib/auth/secure-storage.test.ts
git commit -m "feat(mobile): add expo-secure-store wrapper for auth tokens"
```

---

## Task 4: Cognito Local Setup + Auth Wrapper

**Files:**
- Create: `apps/mobile/lib/auth/cognito.ts`
- Modify: `apps/compose.yml` (add COGNITO env vars to mobile service)

**Note:** `amazon-cognito-identity-js` v6 supports a custom `endpoint` option in `CognitoUserPool` for local dev.

- [ ] **Step 1: Start cognito-local and create user pool**

```bash
# Start cognito-local only
docker compose -f apps/compose.yml up -d cognito-local

# Create user pool via AWS CLI (using localhost endpoint)
aws --endpoint-url http://localhost:9229 \
  cognito-idp create-user-pool \
  --region ap-northeast-1 \
  --pool-name WalkingDogLocal \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":false,"RequireNumbers":false,"RequireSymbols":false}}' \
  --auto-verified-attributes email
```

Note the `Id` field from the output (e.g., `local_abc12345`).

- [ ] **Step 2: Create user pool client**

```bash
aws --endpoint-url http://localhost:9229 \
  cognito-idp create-user-pool-client \
  --region ap-northeast-1 \
  --user-pool-id local_abc12345 \
  --client-name walking-dog-mobile \
  --no-generate-secret
```

Note the `ClientId` from the output.

- [ ] **Step 3: Add COGNITO env vars to compose.yml mobile service**

Modify `apps/compose.yml`, under `mobile: > environment:`, add:
```yaml
COGNITO_USER_POOL_ID: "local_abc12345"   # replace with actual ID
COGNITO_CLIENT_ID: "XXXXXXXXXXXX"        # replace with actual client ID
COGNITO_ENDPOINT_URL: "http://cognito-local:9229"
COGNITO_REGION: "ap-northeast-1"
```

- [ ] **Step 4: Add cognitoEndpointUrl to app.config.ts extra**

Modify `apps/mobile/app.config.ts`, add to `extra`:
```typescript
cognitoEndpointUrl: process.env.COGNITO_ENDPOINT_URL ?? '',
```

- [ ] **Step 5: Implement Cognito auth wrapper**

Create `apps/mobile/lib/auth/cognito.ts`:
```typescript
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type IAuthenticationCallback,
} from 'amazon-cognito-identity-js';
import Constants from 'expo-constants';

function getPool(): CognitoUserPool {
  const { cognitoUserPoolId, cognitoClientId, cognitoEndpointUrl } =
    Constants.expoConfig?.extra ?? {};

  return new CognitoUserPool({
    UserPoolId: cognitoUserPoolId as string,
    ClientId: cognitoClientId as string,
    // endpoint option routes requests to cognito-local in dev
    ...(cognitoEndpointUrl ? { endpoint: cognitoEndpointUrl as string } : {}),
  });
}

export interface SignInResult {
  idToken: string;
  refreshToken: string;
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const callbacks: IAuthenticationCallback = {
      onSuccess: (session) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => reject(err),
    };

    user.authenticateUser(authDetails, callbacks);
  });
}

export function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const attributes = [
      new CognitoUserAttribute({ Name: 'name', Value: displayName }),
    ];
    pool.signUp(email, password, attributes, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signOut(): void {
  const pool = getPool();
  const user = pool.getCurrentUser();
  user?.signOut();
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib/auth/cognito.ts apps/mobile/app.config.ts apps/compose.yml
git commit -m "feat(mobile): add Cognito auth wrapper and cognito-local setup"
```

---

## Task 5: Auth Store (Zustand)

**Files:**
- Create: `apps/mobile/stores/auth-store.ts`
- Test: `apps/mobile/stores/auth-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/stores/auth-store.test.ts`:
```typescript
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from './auth-store';
import * as secureStorage from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';

jest.mock('@/lib/auth/secure-storage');
jest.mock('@/lib/graphql/client');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockSetAuthToken = setAuthToken as jest.Mock;

describe('auth-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  });

  it('initialize: sets token from SecureStore and calls setAuthToken', async () => {
    mockSecureStorage.getToken.mockResolvedValue({
      idToken: 'test-id-token',
      refreshToken: 'test-refresh',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(mockSetAuthToken).toHaveBeenCalledWith('test-id-token');
    expect(result.current.token).toBe('test-id-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('initialize: does nothing when no token stored', async () => {
    mockSecureStorage.getToken.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('setAuth: stores token and updates state', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.setAuth('id-token', 'refresh-token');
    });

    expect(mockSecureStorage.setToken).toHaveBeenCalledWith('id-token', 'refresh-token');
    expect(mockSetAuthToken).toHaveBeenCalledWith('id-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clearAuth: removes token and resets state', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.clearAuth();
    });

    expect(mockSecureStorage.deleteToken).toHaveBeenCalled();
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="stores/auth-store"
```

Expected: FAIL

- [ ] **Step 3: Implement auth store**

Create `apps/mobile/stores/auth-store.ts`:
```typescript
import { create } from 'zustand';
import { getToken, setToken, deleteToken } from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setAuth: (idToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const stored = await getToken();
      if (stored) {
        setAuthToken(stored.idToken);
        set({ token: stored.idToken, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (idToken, refreshToken) => {
    await setToken(idToken, refreshToken);
    setAuthToken(idToken);
    set({ token: idToken, isAuthenticated: true });
  },

  clearAuth: async () => {
    await deleteToken();
    setAuthToken(null);
    set({ token: null, isAuthenticated: false });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="stores/auth-store"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/auth-store.ts apps/mobile/stores/auth-store.test.ts
git commit -m "feat(mobile): add auth Zustand store with SecureStore persistence"
```

---

## Task 6: use-auth Hook

**Files:**
- Create: `apps/mobile/hooks/use-auth.ts`
- Test: `apps/mobile/hooks/use-auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/hooks/use-auth.test.ts`:
```typescript
import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from './use-auth';
import * as cognitoLib from '@/lib/auth/cognito';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/lib/auth/cognito');
jest.mock('@/stores/auth-store');

const mockCognito = cognitoLib as jest.Mocked<typeof cognitoLib>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('use-auth', () => {
  const mockSetAuth = jest.fn();
  const mockClearAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      setAuth: mockSetAuth,
      clearAuth: mockClearAuth,
      initialize: jest.fn(),
    });
  });

  it('signIn calls cognito then sets auth', async () => {
    mockCognito.signIn.mockResolvedValue({ idToken: 'id', refreshToken: 'refresh' });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn('user@example.com', 'password');
    });

    expect(mockCognito.signIn).toHaveBeenCalledWith('user@example.com', 'password');
    expect(mockSetAuth).toHaveBeenCalledWith('id', 'refresh');
  });

  it('signOut calls cognito then clears auth', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockCognito.signOut).toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="hooks/use-auth"
```

- [ ] **Step 3: Implement use-auth hook**

Create `apps/mobile/hooks/use-auth.ts`:
```typescript
import { useAuthStore } from '@/stores/auth-store';
import * as cognito from '@/lib/auth/cognito';

export function useAuth() {
  const { isAuthenticated, isLoading, token, setAuth, clearAuth } = useAuthStore();

  async function signIn(email: string, password: string): Promise<void> {
    const result = await cognito.signIn(email, password);
    await setAuth(result.idToken, result.refreshToken);
  }

  async function signUp(email: string, password: string, displayName: string): Promise<void> {
    await cognito.signUp(email, password, displayName);
  }

  async function confirmSignUp(email: string, code: string): Promise<void> {
    await cognito.confirmSignUp(email, code);
  }

  async function signOut(): Promise<void> {
    cognito.signOut();
    await clearAuth();
  }

  return { isAuthenticated, isLoading, token, signIn, signUp, confirmSignUp, signOut };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="hooks/use-auth"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/use-auth.ts apps/mobile/hooks/use-auth.test.ts
git commit -m "feat(mobile): add useAuth hook"
```

---

## Task 7: Query Keys + Data Fetching Hooks

**Files:**
- Create: `apps/mobile/lib/graphql/query-keys.ts`
- Create: `apps/mobile/hooks/use-me.ts`
- Create: `apps/mobile/hooks/use-dog.ts`
- Create: `apps/mobile/hooks/use-walks.ts`

- [ ] **Step 1: Create query key factories**

Create `apps/mobile/lib/graphql/query-keys.ts`:
```typescript
export const meKeys = {
  all: ['me'] as const,
  detail: () => ['me', 'detail'] as const,
};

export const dogKeys = {
  all: ['dogs'] as const,
  detail: (id: string, period?: string) => ['dogs', id, period] as const,
};

export const walkKeys = {
  all: ['walks'] as const,
  lists: () => ['walks', 'list'] as const,
  list: (limit?: number, offset?: number) => ['walks', 'list', limit, offset] as const,
  detail: (id: string) => ['walks', id] as const,
};
```

- [ ] **Step 2: Create use-me hook**

Create `apps/mobile/hooks/use-me.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { ME_QUERY } from '@/lib/graphql/queries';
import { meKeys } from '@/lib/graphql/query-keys';
import type { UserWithDogs } from '@/types/graphql';

interface MeQueryResult {
  me: UserWithDogs;
}

export function useMe() {
  return useQuery({
    queryKey: meKeys.detail(),
    queryFn: async () => {
      const data = await graphqlClient.request<MeQueryResult>(ME_QUERY);
      return data.me;
    },
  });
}
```

- [ ] **Step 3: Create use-dog hook**

Create `apps/mobile/hooks/use-dog.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { DOG_QUERY } from '@/lib/graphql/queries';
import { dogKeys } from '@/lib/graphql/query-keys';
import type { DogWithStats, StatsPeriod } from '@/types/graphql';

interface DogQueryResult {
  dog: DogWithStats;
}

export function useDog(id: string, statsPeriod: StatsPeriod = 'ALL') {
  return useQuery({
    queryKey: dogKeys.detail(id, statsPeriod),
    queryFn: async () => {
      const data = await graphqlClient.request<DogQueryResult>(DOG_QUERY, {
        id,
        statsPeriod,
      });
      return data.dog;
    },
    enabled: !!id,
  });
}
```

- [ ] **Step 4: Create use-walks hook**

Create `apps/mobile/hooks/use-walks.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { MY_WALKS_QUERY, WALK_QUERY } from '@/lib/graphql/queries';
import { walkKeys } from '@/lib/graphql/query-keys';
import type { Walk, WalkWithPoints } from '@/types/graphql';

interface MyWalksResult {
  myWalks: Walk[];
}

interface WalkResult {
  walk: WalkWithPoints;
}

export function useMyWalks(limit = 20, offset = 0) {
  return useQuery({
    queryKey: walkKeys.list(limit, offset),
    queryFn: async () => {
      const data = await graphqlClient.request<MyWalksResult>(MY_WALKS_QUERY, {
        limit,
        offset,
      });
      return data.myWalks;
    },
  });
}

export function useWalk(id: string) {
  return useQuery({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<WalkResult>(WALK_QUERY, { id });
      return data.walk;
    },
    enabled: !!id,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/graphql/query-keys.ts apps/mobile/hooks/use-me.ts apps/mobile/hooks/use-dog.ts apps/mobile/hooks/use-walks.ts
git commit -m "feat(mobile): add TanStack Query hooks for user, dog, and walk data"
```

---

## Task 8: Mutation Hooks

**Files:**
- Create: `apps/mobile/hooks/use-dog-mutations.ts`
- Create: `apps/mobile/hooks/use-walk-mutations.ts`
- Create: `apps/mobile/hooks/use-profile-mutation.ts`

- [ ] **Step 1: Create dog mutation hooks**

Create `apps/mobile/hooks/use-dog-mutations.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  CREATE_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  DELETE_DOG_MUTATION,
  GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
} from '@/lib/graphql/mutations';
import { meKeys, dogKeys } from '@/lib/graphql/query-keys';
import type { Dog, PresignedUrlOutput } from '@/types/graphql';

interface CreateDogInput {
  name: string;
  breed?: string;
  gender?: string;
  birthDate?: { year: number; month?: number; day?: number };
}

interface UpdateDogInput extends Partial<CreateDogInput> {}

export function useCreateDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDogInput) =>
      graphqlClient
        .request<{ createDog: Dog }>(CREATE_DOG_MUTATION, { input })
        .then((d) => d.createDog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

export function useUpdateDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDogInput }) =>
      graphqlClient
        .request<{ updateDog: Dog }>(UPDATE_DOG_MUTATION, { id, input })
        .then((d) => d.updateDog),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
      queryClient.invalidateQueries({ queryKey: dogKeys.detail(id) });
    },
  });
}

export function useDeleteDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      graphqlClient.request<{ deleteDog: boolean }>(DELETE_DOG_MUTATION, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

export function useGeneratePhotoUploadUrl() {
  return useMutation({
    mutationFn: (dogId: string) =>
      graphqlClient
        .request<{ generateDogPhotoUploadUrl: PresignedUrlOutput }>(
          GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
          { dogId }
        )
        .then((d) => d.generateDogPhotoUploadUrl),
  });
}
```

- [ ] **Step 2: Create walk mutation hooks**

Create `apps/mobile/hooks/use-walk-mutations.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  ADD_WALK_POINTS_MUTATION,
  FINISH_WALK_MUTATION,
} from '@/lib/graphql/mutations';
import { walkKeys } from '@/lib/graphql/query-keys';
import type { Walk } from '@/types/graphql';

interface WalkPointInput {
  lat: number;
  lng: number;
  recordedAt: string;
}

export function useStartWalk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dogIds: string[]) =>
      graphqlClient
        .request<{ startWalk: Walk }>(START_WALK_MUTATION, { dogIds })
        .then((d) => d.startWalk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.lists() });
    },
  });
}

export function useAddWalkPoints() {
  return useMutation({
    mutationFn: ({ walkId, points }: { walkId: string; points: WalkPointInput[] }) =>
      graphqlClient.request(ADD_WALK_POINTS_MUTATION, { walkId, points }),
  });
}

export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walkId: string) =>
      graphqlClient
        .request<{ finishWalk: Walk }>(FINISH_WALK_MUTATION, { walkId })
        .then((d) => d.finishWalk),
    onSuccess: (walk) => {
      queryClient.invalidateQueries({ queryKey: walkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: walkKeys.detail(walk.id) });
    },
  });
}
```

- [ ] **Step 3: Create profile mutation hook**

Create `apps/mobile/hooks/use-profile-mutation.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/mutations';
import { meKeys } from '@/lib/graphql/query-keys';
import type { User } from '@/types/graphql';

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      graphqlClient
        .request<{ updateProfile: User }>(UPDATE_PROFILE_MUTATION, { input })
        .then((d) => d.updateProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/use-dog-mutations.ts apps/mobile/hooks/use-walk-mutations.ts apps/mobile/hooks/use-profile-mutation.ts
git commit -m "feat(mobile): add mutation hooks for dog CRUD, walk lifecycle, and profile update"
```

---

## Task 9: Theme Tokens + UI Primitives

**Files:**
- Create: `apps/mobile/theme/tokens.ts`
- Create: `apps/mobile/components/ui/Button.tsx`
- Create: `apps/mobile/components/ui/TextInput.tsx`
- Create: `apps/mobile/components/ui/LoadingScreen.tsx`
- Create: `apps/mobile/components/ui/ErrorBoundary.tsx`
- Create: `apps/mobile/components/ui/EmptyState.tsx`
- Create: `apps/mobile/components/ui/ConfirmDialog.tsx`

- [ ] **Step 1: Create theme tokens**

Create `apps/mobile/theme/tokens.ts`:
```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
} as const;
```

- [ ] **Step 2: Create Button component**

Create `apps/mobile/components/ui/Button.tsx`:
```typescript
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDisabled = disabled || loading;

  const bgColor = {
    primary: colors.primary,
    secondary: 'transparent',
    destructive: colors.error,
  }[variant];

  const textColor = variant === 'secondary' ? colors.primary : '#FFFFFF';
  const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: bgColor, borderColor, opacity: isDisabled ? 0.5 : 1 },
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.button,
  },
});
```

- [ ] **Step 3: Create TextInput component**

Create `apps/mobile/components/ui/TextInput.tsx`:
```typescript
import { StyleSheet, Text, TextInput as RNTextInput, View, type TextInputProps as RNTextInputProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
}

export function TextInput({ label, error, style, ...props }: TextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text
        style={[styles.label, { color: colors.text }]}
        accessibilityRole="none"
      >
        {label}
      </Text>
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.error : colors.border,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyMedium,
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 4: Create LoadingScreen component**

Create `apps/mobile/components/ui/LoadingScreen.tsx`:
```typescript
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function LoadingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5: Create ErrorBoundary component**

Create `apps/mobile/components/ui/ErrorBoundary.tsx`:
```typescript
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { spacing, typography } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.message}>
            {this.props.fallbackMessage ?? 'エラーが発生しました'}
          </Text>
          <Button label="再試行" onPress={this.handleRetry} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    ...typography.body,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
```

- [ ] **Step 6: Create EmptyState + ConfirmDialog**

Create `apps/mobile/components/ui/EmptyState.tsx`:
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ message, ctaLabel, onCta }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
```

Create `apps/mobile/components/ui/ConfirmDialog.tsx`:
```typescript
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            <View style={styles.spacer} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
  },
  spacer: {
    width: spacing.sm,
  },
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/theme/tokens.ts apps/mobile/components/ui/
git commit -m "feat(mobile): add theme tokens and UI primitive components"
```

---

## Task 10: Wire Navigation Guard + Auth Init

**Files:**
- Modify: `apps/mobile/lib/providers.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Update providers.tsx to initialize auth on mount**

Modify `apps/mobile/lib/providers.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function AuthInitializer({ children }: PropsWithChildren) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>{children}</AuthInitializer>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update _layout.tsx to add navigation guard**

Modify `apps/mobile/app/_layout.tsx`:
```typescript
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/lib/providers';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AppProviders>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NavigationGuard />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="dogs" options={{ headerShown: false }} />
          <Stack.Screen name="walks" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}
```

- [ ] **Step 3: Start the app and verify redirect behavior**

```bash
docker compose -f apps/compose.yml up mobile
```

Open Expo in browser or device. Verify:
- App starts on `(auth)/login` screen (shows "Walking Dog" + "Login screen" placeholder)
- No crash in console

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/providers.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add auth initialization and navigation guard to root layout"
```

---

## Verification Checklist

- [ ] `npm test` passes with no test failures
- [ ] App starts and immediately redirects to `(auth)/login` (no token stored)
- [ ] Types compile: `npx tsc --noEmit` in Docker reports 0 errors
- [ ] All UI components render without crash in isolation
