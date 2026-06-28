# Maestro E2E tests

This directory contains Maestro flows for iOS Simulator. The main auth journey is
`auth-onboarding.yaml`, which verifies that a simulator with saved Cognito auth
state can launch directly into the authenticated app.

## Prerequisites

- Maestro CLI is installed.
- Xcode Simulator is available and `iPhone 17 Pro` can be started.
- Simulator language is English. Maestro selectors use English UI text.
- `apps/mobile` dependencies are installed.
- The harness dev stack API is running with the same Cognito configuration used
  when the simulator logged in.
- The simulator already has a valid Cognito access token and refresh token saved
  by normal app login.

```bash
cd apps/mobile
npm ci
cd ../..
node scripts/harness/dev-stack.mjs up
```

The API port is worktree-specific. After starting the dev stack, read it from:

```bash
cat .harness-runs/dev-stack/env.json
```

## Install the app on Simulator

Maestro flows preserve app state so they can reuse the saved Cognito auth state.
Use a Release build for the installed app that Maestro launches.

From the repo root, read the API port, then build from `apps/mobile`:

```bash
export WD_API_PORT="$(node -p "require('./.harness-runs/dev-stack/env.json').ports.api")"

cd apps/mobile
npm run metro:kill
npm run ios:clean
EXPO_PUBLIC_E2E=1 \
EXPO_PUBLIC_API_URL="http://127.0.0.1:${WD_API_PORT}" \
npx expo run:ios --configuration Release --device "iPhone 17 Pro"
```

After the build, `com.walkingdog.app` is installed on Simulator. Open the app once
and complete the normal Cognito email one-time password login manually. Do not
uninstall the app or clear app state after login. Keep the Expo/Metro terminal
open and run Maestro from another terminal.

## Run Maestro

The flows assume the simulator is already logged in. They intentionally do not
request or enter an email one-time password.

```bash
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

To run every flow:

```bash
maestro test apps/mobile/e2e/maestro/*.yaml
```

Flows other than `auth-onboarding.yaml` may require an authenticated owner,
registered dog, location permission, photo permission, or other seeded harness state.
Read each YAML file's `Harness preconditions` before running it.

If Java runtime is not found, pass `JAVA_HOME` and `PATH` to Maestro. Example with
Homebrew OpenJDK:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk \
PATH=/opt/homebrew/opt/openjdk/bin:$PATH \
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

## Cleanup

Stop the Expo/Metro terminal with `Ctrl-C`. Stop the harness dev stack if it is no
longer needed.

```bash
node scripts/harness/dev-stack.mjs down
```

Flows with `takeScreenshot` generate `harness-*.png` in the current directory.
Keep them only when they are needed as evidence.

## Common failures

- The wrong app opens: reinstall a Release build for `com.walkingdog.app`.
- API connection fails: verify `.harness-runs/dev-stack/env.json` `ports.api` matches
  `EXPO_PUBLIC_API_URL`.
- The app shows the auth screen: saved Cognito auth state is missing or expired.
  Log in manually once, then rerun Maestro without clearing state.
- Text selector is not found: verify Simulator language is English and the required
  harness state exists.
