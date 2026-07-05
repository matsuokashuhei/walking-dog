---
name: maestro-e2e
description: Use when Codex needs to run, update, or debug Maestro end-to-end tests for the walking-dog Expo mobile app, especially flows under apps/mobile/e2e/maestro, iOS Simulator Release builds, saved Cognito auth state, harness dev stack setup, or Maestro selector/test failures.
---

# Maestro E2E

## Overview

Use the repo-local Maestro harness for mobile E2E confidence. Treat this skill and the target YAML flow's `Harness preconditions` comments as the source of truth before running or changing flows.

The main auth smoke journey is `auth-onboarding.yaml`; it verifies that a simulator with saved Cognito auth state can launch directly into the authenticated app.

Maestro flows preserve iOS app state and assume the simulator is already logged in through the normal Cognito email OTP path. Do not uninstall the app, clear app state, or rewrite flows to bypass auth unless the requested test explicitly covers authentication setup.

## Workflow

1. From the repo root, read the target flow before acting:

```bash
sed -n '1,100p' apps/mobile/e2e/maestro/<flow>.yaml
```

2. Verify prerequisites that affect selectors and connectivity:

- Maestro CLI is installed.
- `jq` is installed for harness scripts and reading `.harness-runs/dev-stack/env.json`.
- Xcode Simulator can start `iPhone 17 Pro`.
- Simulator language is English because selectors use English UI text.
- `apps/mobile` dependencies are installed.
- The harness dev stack API is running with the same Cognito configuration used for simulator login.
- The simulator has valid saved Cognito access and refresh tokens from normal app login.

3. Install mobile dependencies when needed:

```bash
cd apps/mobile
npm ci
cd ../..
```

4. Start the harness dev stack when it is not already running:

```bash
scripts/harness/dev-stack.sh up
```

5. Read the worktree-specific API port:

```bash
jq -r '.ports.api' .harness-runs/dev-stack/env.json
```

6. Install a Release build on the simulator with the working directory set to `apps/mobile`, substituting the literal API port from step 5. Codex shell calls do not preserve exports between separate commands, so do not rely on `WD_API_PORT` from a previous command unless using the same shell session:

```bash
npm run metro:kill
npm run ios:clean
EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_API_URL="http://127.0.0.1:<api-port>" npx expo run:ios --configuration Release --device "iPhone 17 Pro"
```

After the build, `com.walkingdog.app` is installed on Simulator.

7. Open the installed app once and complete normal Cognito email OTP login manually if saved auth state is missing. Keep app state intact after login. Keep the Expo/Metro terminal open and run Maestro from another terminal.

8. Run Maestro from the repo root:

```bash
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
maestro test apps/mobile/e2e/maestro/*.yaml
```

Flows intentionally do not request or enter an email one-time password.

For Homebrew OpenJDK when Java is not found:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk PATH=/opt/homebrew/opt/openjdk/bin:$PATH maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

## Flow Preconditions

Read each YAML's `Harness preconditions` comments before running it. Current flows expect:

- `auth-onboarding.yaml`: installed `com.walkingdog.app`, English simulator, saved Cognito auth state.
- `dog-profile.yaml`: authenticated owner; dog named `Harness Coco` absent or duplicate names acceptable.
- `walk-lifecycle.yaml`: dog named `Harness Walker`; location permission; GPS replay or simulator location before `START WALK`.
- `walk-events-photo.yaml`: dog named `Harness Event Dog`; camera permission; local storage service when photo upload is exercised.
- `walk-goal.yaml`: dog named `Harness Goal Dog`; goal controls visible in edit mode.
- `walk-history-owner-contribution.yaml`: seeded completed walk for `Harness History Dog` with duration, distance, points, and at least one event.

## Debugging Rules

- If the wrong app opens, reinstall the Release build for `com.walkingdog.app`.
- If the API connection fails, compare `.harness-runs/dev-stack/env.json` `ports.api` with the `EXPO_PUBLIC_API_URL` used at build time.
- If the auth screen appears, saved Cognito auth state is missing or expired; log in manually once, then rerun without clearing state.
- If a text selector is not found, check simulator language first, then verify the flow's seeded harness state.
- If screenshots are produced, keep `harness-*.png` only when they are useful evidence.
- Do not hide failures with optional selectors, fallback values, or catch-and-ignore behavior. Fix the app, harness state, or flow preconditions explicitly.

## Cleanup

Stop the Expo/Metro terminal with `Ctrl-C`. Stop and remove the harness dev
stack, including its named volumes, if it is no longer needed:

```bash
scripts/harness/dev-stack.sh down
```

## Changing Flows

When adding or editing Maestro flows:

- Keep `appId: com.walkingdog.app` and `launchApp.clearState: false` for authenticated flows unless the test is deliberately about first-run state.
- Add or update `Harness preconditions` at the top of the YAML whenever the flow depends on auth, seeded dogs, completed walks, permissions, location, storage, or simulator language.
- Prefer stable accessibility ids for fragile controls; if mobile UI changes are needed, use `$expo-ui-docs-first` before editing Expo/React Native UI.
- Explain the product impact of new coverage across dog experience, walk data, and owner contribution when the change affects behavior or a harness journey.
- Promote confusing failures or new setup requirements into this skill, a harness validator, or a journey.
