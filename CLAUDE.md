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

- Product specification: [docs/spec/README.md](docs/spec/README.md)
- Product context map: [docs/spec/architecture/context-map.md](docs/spec/architecture/context-map.md)
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
- Development process: [docs/agents/development-process.md](docs/agents/development-process.md)
- Model routing: [docs/agents/model-routing.md](docs/agents/model-routing.md)

## Service Environments

Keep these differences in mind when changing configuration, authentication, storage, queues, or data access:

| Environment | Compose and service shape | External AWS resources | Cognito |
| --- | --- | --- | --- |
| Development and test | Testcontainers-owned, isolated services started by Rust integration tests | Deterministic fixtures only in required tests | No live Cognito |
| Production ([infra/sakura/compose.yml](infra/sakura/compose.yml)) | Caddy, PostgreSQL, and ECR-based API/worker | Cognito, DynamoDB, S3 (avatar/photo storage), SQS, and CloudFront | Undisclosed |

Never document or infer production Cognito identifiers or credentials from `infra/sakura/.env.example`; deployment secrets and configuration are authoritative.

## Mechanical Gates

Before claiming work is ready, run:

```bash
scripts/harness/validate-all.sh
```

This checks harness knowledge, architecture boundaries, quality score, and
`apps/mobile` Knip unused-code analysis.

For API changes, also run the API tests from the current worktree. Prefer the
bind-mounted Docker form when multiple worktrees may share compose volumes.

For Mobile changes, run from `apps/mobile`:

```bash
npm test
npm run typecheck
npm run lint
npm run knip
```

Mobile changes must also include Maestro journey evidence, or explicitly state
why no user journey is affected. User-facing UI, navigation, auth, walk, dog,
profile, API contract, persistence, or permission changes require the matching
Maestro flow from `apps/mobile/e2e/maestro/`. Broad journey-impacting changes
require running all current Maestro flows. Static tooling, type-only, or
unused-code cleanup may record "no affected journey" instead of running Maestro.

## Non-Negotiable Rules

- Do not hide errors with optionalization, fallback values, or catch-and-ignore fixes.
- Prefer whole-system consistency, simplicity, and extensibility over small diffs.
- Keep API storage details behind service gateways and repositories.
- Keep walk lifecycle/history semantics in service modules, not GraphQL resolvers.
- Cognito refresh uses `GetTokensFromRefreshToken` with refresh token rotation
  enabled. App clients must not include `ALLOW_REFRESH_TOKEN_AUTH`; API must
  reject Cognito refresh responses that omit access or refresh tokens.
- Keep Mobile UI aligned with Expo/React Native rules in `apps/mobile/CLAUDE.md`.
- For user-facing UI changes, create or present an HTML mockup, visual companion
  screen, or equivalent visual artifact before producing the implementation plan.
  Record the mockup artifact and user feedback outcome in the final plan. If the
  user explicitly opts out, record that opt-out instead.
- When a bug, review comment, stale doc, or confusing pattern appears, promote the
  learning into docs, a harness validator, a journey, or a project skill.
- Use one active change manifest for each base/head change and never track
  `.superpowers` scratch. See `docs/agents/development-process.md`.

## Skills

This project uses the Superpowers plugin. Check relevant skills before acting:

- Design: brainstorming, writing-plans
- Implementation: subagent-driven-development, executing-plans, test-driven-development
- Debugging: systematic-debugging
- Review: requesting-code-review, receiving-code-review
- Completion: verification-before-completion, finishing-a-development-branch

For Expo / React Native UI work, first read
[.codex/skills/expo-ui-docs-first/SKILL.md](.codex/skills/expo-ui-docs-first/SKILL.md).

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
