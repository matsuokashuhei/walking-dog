<!-- ERNE-GENERATED -->
<!-- erne-profile: standard -->
# mobile — ERNE Configuration

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
