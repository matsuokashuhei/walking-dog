# Identity Errors

| Code | Retry | Meaning |
| --- | --- | --- |
| `INVALID_EMAIL` | after edit | normalized email is invalid |
| `OTP_INVALID` | yes, same challenge | code does not match |
| `OTP_EXPIRED` | request new | challenge expired |
| `OTP_ATTEMPTS_EXHAUSTED` | request new | verification attempts exhausted |
| `RATE_LIMITED` | after `retryAfter` | request or verification rate exceeded |
| `AUTHENTICATION_REJECTED` | no automatic retry | unknown/disabled identity |
| `EMAIL_ALREADY_IN_USE` | after edit | authenticated email change conflicts |
| `VERSION_CONFLICT` | reload | concurrent identity change |
| `PROVIDER_UNAVAILABLE` | yes | Cognito/JWKS unavailable |
| `TOKEN_RESPONSE_INCOMPLETE` | sign in again | rotated token response missing required token |

GraphQL transport errorsにprovider session、OTP、token、full emailを含めません。
