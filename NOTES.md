Full `cd apps/mobile && npx jest --runInBand && npx tsc --noEmit` did not complete successfully because the existing `apps/mobile/lib/graphql/request-log.test.ts` suite fails outside the dog-detail scope.

Observed failure:

```text
FAIL lib/graphql/request-log.test.ts
logReproducibleRequest › logs a reproducible request block in development
Expected substring: "{\n  \"id\": \"user-id\"\n}"
Received string contains the variables block indented under "variables:":
"    {\n      \"id\": \"user-id\"\n    }"
```

Dog-detail focused verification passed:

```text
cd apps/mobile && npx jest __tests__/app/dogs/dog-detail.test.tsx --runInBand
```

Type-check passed:

```text
cd apps/mobile && npx tsc --noEmit
```
