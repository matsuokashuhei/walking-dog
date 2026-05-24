```

TOKEN='xxx'

curl -sS http://localhost:3000 \
  -H "Authorization: Bearer $TOKEN" \
  -F 'operations={"query":"mutation ($input: UpdateUserInput!) { updateUser(input: $input) { id avatar } }","variables":{"input": {"name": "Shuhei", "avatar": null } }}' \
  -F 'map={"0":["variables.input.avatar"]}' \
  -F '0=@/walking-dog/image.jpg;type=image/jpeg'
```

```
cargo run --bin walking-dog & cargo run --bin track_point_worker
```

## SQL bind value logs

By default the API logs at `INFO` and does not print SQL bind values.

For local debugging only, enable SeaORM SQL logs with bind values injected:

```
API_SQL_BIND_LOG=1 cargo run --bin walking-dog
```

When `API_SQL_BIND_LOG=1` is set, the API uses `info,sea_orm=debug,sqlx::query=off`
unless `RUST_LOG` is also set. `RUST_LOG` is ignored for the HTTP API unless
`API_SQL_BIND_LOG=1` is set, so `RUST_LOG=sea_orm=debug` alone will not expose
bind values.

Bind values can include user IDs, email addresses, tokens, or other user data.
Do not enable this in shared, staging, or production environments.
