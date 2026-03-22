# Mobile Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement login and sign-up screens so users can authenticate via Cognito and be redirected to the main app.

**Architecture:** LoginForm and RegisterForm are pure UI components that delegate to `useAuth()`. On successful sign-in, the auth store sets the token and `_layout.tsx` navigation guard redirects to `(tabs)`. Register flow includes an email confirmation step (inline state in the register screen).

**Tech Stack:** amazon-cognito-identity-js, Zustand (auth-store), Expo Router, React Native StyleSheet

**Prerequisite:** Increment 0 (Foundation) must be complete — `useAuth`, `Button`, `TextInput`, `LoadingScreen` must exist.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/components/auth/LoginForm.tsx` | Email + password form, calls `useAuth().signIn()` |
| Create | `apps/mobile/components/auth/RegisterForm.tsx` | Email + password + display name form, calls `useAuth().signUp()` |
| Create | `apps/mobile/components/auth/ConfirmForm.tsx` | 6-digit code input, calls `useAuth().confirmSignUp()` |
| Modify | `apps/mobile/app/(auth)/login.tsx` | Replace placeholder with LoginForm |
| Modify | `apps/mobile/app/(auth)/register.tsx` | Replace placeholder with RegisterForm + ConfirmForm (step state) |

---

## Task 1: LoginForm Component

**Files:**
- Create: `apps/mobile/components/auth/LoginForm.tsx`
- Test: `apps/mobile/components/auth/LoginForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/auth/LoginForm.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

const mockSignIn = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders email and password inputs', () => {
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });

  it('disables submit button when fields are empty', () => {
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'ログイン' });
    expect(button).toBeDisabled();
  });

  it('calls signIn with email and password on submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on sign-in failure', async () => {
    mockSignIn.mockRejectedValue(new Error('UserNotFoundException'));
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'wrong@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'wrongpass');
    fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/auth/LoginForm"
```

Expected: FAIL — `Cannot find module './LoginForm'`

- [ ] **Step 3: Implement LoginForm**

Create `apps/mobile/components/auth/LoginForm.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterPress: () => void;
}

export function LoginForm({ onSuccess, onRegisterPress }: LoginFormProps) {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        label="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="ログイン"
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label="アカウントを作成"
        variant="secondary"
        onPress={onRegisterPress}
        style={styles.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/auth/LoginForm"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/auth/LoginForm.tsx apps/mobile/components/auth/LoginForm.test.tsx
git commit -m "feat(mobile): add LoginForm component"
```

---

## Task 2: RegisterForm + ConfirmForm Components

**Files:**
- Create: `apps/mobile/components/auth/RegisterForm.tsx`
- Create: `apps/mobile/components/auth/ConfirmForm.tsx`
- Test: `apps/mobile/components/auth/RegisterForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/auth/RegisterForm.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterForm } from './RegisterForm';

const mockSignUp = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders required fields', () => {
    render(<RegisterForm onSuccess={jest.fn()} onLoginPress={jest.fn()} />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
    expect(screen.getByLabelText('表示名')).toBeTruthy();
  });

  it('calls signUp with form values', async () => {
    mockSignUp.mockResolvedValue(undefined);
    render(<RegisterForm onSuccess={jest.fn()} onLoginPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'password123');
    fireEvent.changeText(screen.getByLabelText('表示名'), 'Taro');
    fireEvent.press(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'Taro');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/auth/RegisterForm"
```

- [ ] **Step 3: Implement RegisterForm**

Create `apps/mobile/components/auth/RegisterForm.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface RegisterFormProps {
  onSuccess: (email: string) => void;
  onLoginPress: () => void;
}

export function RegisterForm({ onSuccess, onLoginPress }: RegisterFormProps) {
  const { signUp } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.length > 0 && password.length >= 8 && displayName.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      onSuccess(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登録に失敗しました';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="表示名"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
      />
      <TextInput
        label="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        label="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        error={password.length > 0 && password.length < 8 ? '8文字以上で入力してください' : undefined}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="アカウントを作成"
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label="ログインはこちら"
        variant="secondary"
        onPress={onLoginPress}
        style={styles.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  error: { ...typography.caption, marginBottom: spacing.md, textAlign: 'center' },
  secondaryButton: { marginTop: spacing.sm },
});
```

- [ ] **Step 4: Implement ConfirmForm**

Create `apps/mobile/components/auth/ConfirmForm.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface ConfirmFormProps {
  email: string;
  onSuccess: () => void;
}

export function ConfirmForm({ email, onSuccess }: ConfirmFormProps) {
  const { confirmSignUp } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      onSuccess();
    } catch {
      setError('確認コードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {email} に確認コードを送りました
      </Text>
      <TextInput
        label="確認コード"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="確認"
        onPress={handleSubmit}
        loading={loading}
        disabled={code.length !== 6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  description: { ...typography.body, marginBottom: spacing.lg, textAlign: 'center' },
  error: { ...typography.caption, marginBottom: spacing.md, textAlign: 'center' },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/auth/RegisterForm"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/components/auth/
git commit -m "feat(mobile): add RegisterForm and ConfirmForm components"
```

---

## Task 3: Wire Up Login Screen

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Replace placeholder with LoginForm**

Replace entire content of `apps/mobile/app/(auth)/login.tsx`:
```typescript
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Walking Dog</ThemedText>
        <ThemedText style={styles.subtitle}>
          散歩の記録と犬の友情を大切に
        </ThemedText>
      </View>
      <LoginForm
        onSuccess={() => {
          // Navigation guard in _layout.tsx handles redirect to (tabs)
        }}
        onRegisterPress={() => router.push('/(auth)/register')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Verify login screen renders**

Start Docker stack and open the app. The login screen should show:
- "Walking Dog" title
- Email and password inputs
- "ログイン" button (disabled until fields filled)
- "アカウントを作成" button

```bash
docker compose -f apps/compose.yml up
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(auth)/login.tsx
git commit -m "feat(mobile): implement login screen with LoginForm"
```

---

## Task 4: Wire Up Register Screen

**Files:**
- Modify: `apps/mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Replace placeholder with multi-step register screen**

Replace entire content of `apps/mobile/app/(auth)/register.tsx`:
```typescript
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ConfirmForm } from '@/components/auth/ConfirmForm';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

type Step = 'register' | 'confirm';

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState<Step>('register');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');

  function handleRegisterSuccess(email: string) {
    setPendingEmail(email);
    setStep('confirm');
  }

  async function handleConfirmSuccess() {
    // Auto sign-in after confirmation
    // (cognito-local auto-confirms, so pendingPassword must be stored)
    // Navigation guard will redirect to (tabs) on success
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <ThemedText type="title">
          {step === 'register' ? 'アカウント作成' : 'メール確認'}
        </ThemedText>
      </View>

      {step === 'register' ? (
        <RegisterForm
          onSuccess={handleRegisterSuccess}
          onLoginPress={() => router.back()}
        />
      ) : (
        <ConfirmForm email={pendingEmail} onSuccess={handleConfirmSuccess} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
});
```

- [ ] **Step 2: End-to-end auth test**

With Docker stack running and cognito-local configured:

1. Open app → lands on Login screen
2. Press "アカウントを作成" → navigates to Register screen
3. Fill in display name, email, password (8+ chars) → press "アカウントを作成"
4. **cognito-local note:** cognito-local may auto-confirm or require a code. For local dev, use any 6-digit code (cognito-local accepts them). Or check cognito-local logs for the code.
5. After confirmation → auto-navigates to Login → login with same credentials → lands on Home tab

- [ ] **Step 3: Verify auto-login after registration**

On successful register + confirm flow, user is redirected to `/(auth)/login`. User logs in manually. Navigation guard detects `isAuthenticated = true` and redirects to `/(tabs)`.

Future improvement: auto sign-in after confirmation (requires storing password temporarily).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(auth)/register.tsx
git commit -m "feat(mobile): implement register screen with two-step Cognito sign-up flow"
```

---

## Verification Checklist

- [ ] Login with valid credentials → redirected to Home tab
- [ ] Login with wrong password → error message shown
- [ ] Register new user → confirm code → redirected to Login
- [ ] App restart → auto-login if token stored
- [ ] Sign out (from settings) → redirected to Login
- [ ] All tests pass: `docker compose -f apps/compose.yml run --rm mobile npm test`
