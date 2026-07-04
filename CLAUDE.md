# walking-dog Agent Map

This repository exists to make dogs and owners happier through better walks.
Agents should keep this file small and use it as a map into the repository-local
system of record.

## Product Decision Axes

Every product change must explain its impact on:

- Dog experience: does it deepen encounters and relationships between dogs?
- Walk data: does the data improve future walk quality or insight?
- Owner contribution: does it make owners want to walk and care more?

Source of truth: [docs/product/principles.md](docs/product/principles.md)

## Required Reading By Task

- Harness process: [docs/harness/README.md](docs/harness/README.md)
- Domain rules: [docs/harness/domain-rules.md](docs/harness/domain-rules.md)
- Architecture overview: [docs/architecture/harness-first-development.md](docs/architecture/harness-first-development.md)
- Local runbook: [docs/runbooks/local-harness.md](docs/runbooks/local-harness.md)
- Local SonarQube: [scripts/sonar/README.md](scripts/sonar/README.md)
- Journey catalog: [docs/harness/journeys/](docs/harness/journeys/)
- Quality score: [docs/harness/quality-score.md](docs/harness/quality-score.md)
- Lessons learned: [docs/harness/lessons-learned.md](docs/harness/lessons-learned.md)
- API details: [apps/api/README.md](apps/api/README.md)
- Mobile details: [apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md)
- Legal publishing: [infra/sakura/README.md](infra/sakura/README.md)
- Cloudflare/Cognito email: [docs/cloudflare-cognito-email.md](docs/cloudflare-cognito-email.md)

## Mechanical Gates

Before claiming work is ready, run:

```bash
scripts/harness/validate-all.sh
```

For API changes, also run the API tests from the current worktree. Prefer the
bind-mounted Docker form when multiple worktrees may share compose volumes.

For Mobile changes, run from `apps/mobile`:

```bash
npm test
npm run typecheck
npm run lint
```

## Harness Commands

```bash
scripts/harness/validate-knowledge.sh
scripts/harness/validate-architecture.sh
scripts/harness/validate-all.sh
scripts/harness/dev-stack.sh up
scripts/harness/reset-local-data.sh
HARNESS_ACCESS_TOKEN=<token> scripts/harness/run-api-journey.sh walk-lifecycle
scripts/harness/query-observability.sh
scripts/harness/score-quality.sh
```

## Non-Negotiable Rules

- Do not hide errors with optionalization, fallback values, or catch-and-ignore fixes.
- Prefer whole-system consistency, simplicity, and extensibility over small diffs.
- Keep API storage details behind service gateways and repositories.
- Keep walk lifecycle/history semantics in service modules, not GraphQL resolvers.
- Cognito refresh uses `GetTokensFromRefreshToken` with refresh token rotation
  enabled. App clients must not include `ALLOW_REFRESH_TOKEN_AUTH`; API must
  reject Cognito refresh responses that omit access or refresh tokens.
- Keep Mobile UI aligned with Expo/React Native rules in `apps/mobile/CLAUDE.md`.
- When a bug, review comment, stale doc, or confusing pattern appears, promote the
  learning into docs, a harness validator, a journey, or a project skill.

## Skills

This project uses the Superpowers plugin. Check relevant skills before acting:

- Design: brainstorming, writing-plans
- Implementation: subagent-driven-development, executing-plans, test-driven-development
- Debugging: systematic-debugging
- Review: requesting-code-review, receiving-code-review
- Completion: verification-before-completion, finishing-a-development-branch

For Expo / React Native UI work, first read
[.codex/skills/expo-ui-docs-first/SKILL.md](.codex/skills/expo-ui-docs-first/SKILL.md).
