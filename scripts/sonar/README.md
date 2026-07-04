# SonarQube Scripts

Docker compose examples assume the repository root. `scripts/sonar/run-analysis.sh`
resolves the repository root from its own location, so it can be invoked from any
working directory.

## Start SonarQube

```bash
docker compose -p walking_dog_sonar -f infra/sonarqube/compose.yml up -d
```

Open `http://localhost:9000`, sign in with the initial `admin` / `admin`
credentials, change the password, create a local project, and generate a token.
The compose file binds SonarQube to `127.0.0.1` only.

## Status And Logs

```bash
docker compose -p walking_dog_sonar -f infra/sonarqube/compose.yml ps
```

```bash
docker compose -p walking_dog_sonar -f infra/sonarqube/compose.yml logs --tail=200
```

## Stop SonarQube

```bash
docker compose -p walking_dog_sonar -f infra/sonarqube/compose.yml down
```

The `down` command stops and removes containers and the compose network. Named
volumes remain so the local SonarQube database survives between runs.

## Use Another Port

The compose file publishes port `9000` by default. Override it when port `9000`
is already in use:

```bash
WD_SONARQUBE_PORT=9001 docker compose -p walking_dog_sonar -f infra/sonarqube/compose.yml up -d
```

Then use the same URL in `scripts/sonar/local.env`:

```bash
SONAR_HOST_URL=http://localhost:9001
SONAR_TOKEN=<local_sonarqube_token>
```

## Configure Local Token

Store the token in an ignored local file:

```bash
mkdir -p scripts/sonar

cat > scripts/sonar/local.env <<'EOF'
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=<local_sonarqube_token>
EOF

chmod 600 scripts/sonar/local.env
```

Codex Automation worktrees may not have that ignored file. In that case, provide
`SONAR_HOST_URL` and `SONAR_TOKEN` through the automation environment instead.

## Run Analysis

```bash
scripts/sonar/run-analysis.sh
```

The script builds the API `sonar` Docker image stage so `cargo-llvm-cov` and
`llvm-tools-preview` stay out of the normal API development image.
The scanner uses `infra/sonarqube/sonar-project.properties`.

The analysis writes report paths under `.sonar/reports/`:

- `.sonar/reports/api-clippy.json`
- `.sonar/reports/api-lcov.info`
- `.sonar/reports/api-coverage.xml`
- `apps/mobile/coverage/lcov.info`

## Automation Gate

The daily Codex automation must also run the existing harness and E2E gates before
opening a draft PR:

```bash
scripts/harness/validate-all.sh
```

```bash
bash -n scripts/sonar/*.sh
bash scripts/sonar/run-analysis.test.sh
```

```bash
cd apps/mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage
```

```bash
maestro test apps/mobile/e2e/maestro/*.yaml
```

Maestro flows expect the simulator to keep saved Cognito auth state from a normal
app login. If the simulator is not logged in, stop without creating a PR and report
the missing prerequisite.
