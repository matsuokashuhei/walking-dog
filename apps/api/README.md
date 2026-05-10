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
