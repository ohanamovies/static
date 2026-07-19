# User/list persistence

User state is optional and token-based. Anonymous browsing works without it.

## Local identity

`src/stores/user.js` keeps the current user token in local storage:

```text
ohanatv_user_token
```

A user document has roughly this shape:

```json
{
  "name": "Alex",
  "listTokens": ["..."],
  "watched": ["tt0111161"],
  "customProviders": [],
  "filterPrefs": null
}
```

A list document has this shape:

```json
{
  "name": "Family night",
  "movies": ["tt0111161"]
}
```

## KV backend

`src/lib/kvStore.js` talks to a Lambda URL with two endpoints:

- `GET /read` with `x-write-token`
- `PUT /write` with `x-write-token` and JSON body

The backend returns `x-etag` on reads. Writes can pass:

- `x-if-match` to update only the version that was read.
- `x-if-none-match: *` to create only if missing.

A `409` is treated as a conflict and retried by `safeMutate`, so field-level updates avoid silently clobbering concurrent changes.

## Local mode

`LOCAL` in `src/lib/kvStore.js` can switch the KV helpers to `localStorage` during development, but it is currently disabled.
