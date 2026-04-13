---
description: Expo Router navigation conventions and patterns
globs: "app/**/*.{ts,tsx}"
alwaysApply: false
---

# Navigation

## Expo Router File Conventions
- File-based routing in `app/` directory
- `_layout.tsx` for layout definitions (Stack, Tabs, Drawer)
- `[param].tsx` for dynamic routes
- `[...catchAll].tsx` for catch-all routes
- `+not-found.tsx` for 404 handling
- `(group)` parentheses for layout groups (no URL impact)

```
app/
  _layout.tsx          # Root layout (Stack)
  index.tsx            # / (home)
  (tabs)/
    _layout.tsx        # Tab layout
    home.tsx           # /home tab
    profile.tsx        # /profile tab
  (auth)/
    _layout.tsx        # Auth stack (no tabs)
    login.tsx          # /login
    register.tsx       # /register
  settings/
    _layout.tsx        # Settings stack
    index.tsx          # /settings
    [section].tsx      # /settings/notifications
```

## Typed Routes
- Use `href` with type-safe route paths
- Define route params with `useLocalSearchParams<{ id: string }>()`
- Use `router.push()` / `router.replace()` / `router.back()`
- Prefer `<Link>` component for declarative navigation

## Deep Linking
- Define scheme in `app.json` (`expo.scheme`)
- Map deep links to file routes
- Validate incoming URLs before navigating
- Test deep links: `npx uri-scheme open [url] --ios/--android`

## Modal Patterns
- Use `presentation: 'modal'` in layout options
- Full-screen modals: separate route in layout group
- Bottom sheets: `@gorhom/bottom-sheet` (not navigation)

## Group-only Path (禁止事項)
- `(tabs)` や `(auth)` のような group segment だけを指すパス
  （例: `/(tabs)`, `/(auth)`）を `router.push` / `router.replace` に
  渡してはならない。group は URL を持たないため Unmatched Route になる。
- 必ず具体的な子ルート（例: `/(tabs)/walk`, `/(auth)/login`）を指定する。
- 型チェックを `as never` で握りつぶさない（eslint で error になる）。
- typed routes の生成型は `.expo/types/router.d.ts` にある。Metro/expo を再起動すると最新化される。

## Best Practices
- Keep navigation state minimal (pass IDs, not full objects)
- Prefetch data for likely next screens
- Use `initialRouteName` for proper back navigation
- Handle "not found" routes gracefully
