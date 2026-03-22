<!-- ERNE-GENERATED -->
<!-- erne-profile: standard -->
# mobile — Development Rules

## npm コマンドはすべて Docker 経由で実行する

- `npm install`, `npm run`, `npx` などは直接実行しない
- Docker Compose の `mobile` サービス経由で実行する:
  ```bash
  docker compose -f apps/compose.yml run --rm mobile npm install
  docker compose -f apps/compose.yml run --rm mobile npx expo start
  ```
- または既存コンテナで実行:
  ```bash
  docker compose -f apps/compose.yml exec mobile npm test
  ```

## Expo QR コードの確認方法

- ターミナルでは QR コードが表示されないため、ブラウザで以下の URL を開く:
  ```
  https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp%3A%2F%2F192.168.68.66%3A8081
  ```
- `192.168.68.66` はホストマシンの LAN IP。変わった場合は `REACT_NATIVE_PACKAGER_HOSTNAME` も更新する。

---

# ERNE Configuration

## Project Stack
- **Framework**: React Native with Expo (managed)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: None
- **Styling**: StyleSheet.create
- **Lists**: FlatList (built-in)
- **Images**: expo-image
- **Testing**: None configured
- **Build**: Manual

## Key Rules
- Functional components only with `const` + arrow functions
- Named exports only (no default exports)
- Use Expo Router file-based routing — no manual navigation config
- Use secure storage for tokens — avoid AsyncStorage for sensitive data
- Conventional Commits: feat:, fix:, refactor:, test:, docs:, chore:

## Available Commands
/plan, /code-review, /tdd, /build-fix, /perf, /upgrade, /debug, /deploy,
/component, /navigate, /animate, /quality-gate, /code, /feature, /learn, /retrospective, /setup-device

## Rules
@import .claude/rules/common/
@import .claude/rules/expo/

## Skills
@import .claude/skills/
