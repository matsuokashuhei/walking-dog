# Plan: iOS 26 Liquid Glass Floating Tab Bar

## Context

`docs/design/walking-dog/project/Precise Full App.html` の `TabBar` (L464–500) は iOS 26 の Liquid Glass 仕様で描かれており、画面下部にフロートする丸ピル型・半透明ブラー・選択時の薄いチントピル背景が特徴。現行 `apps/mobile/app/(tabs)/_layout.tsx` は Expo Router `<Tabs>` のデフォルトに `tabBarStyle.backgroundColor = theme.material` を被せただけの「画面幅いっぱい・上辺ボーダー・矩形」で、デザインと乖離している。本変更で視覚のみを Precise 仕様に揃え、タブ構成・ナビゲーション・ハプティクス・`walk` 画面での非表示制御など現行挙動は維持する。

## User Request (verbatim)

> 「@docs/design/walking-dog/README.md タブバーのデザインをiOS26の見た目にしてください。詳細は @docs/design/walking-dog/project/Precise Full App.html をご確認ください。」

## Target Design Spec (from `Precise Full App.html:477–498`)

| 項目 | 値 |
|---|---|
| 位置 | 絶対配置、画面下から `bottom: 22 + safeInset.bottom` 相当、左右 inset 20 |
| サイズ | height 58、borderRadius 29（完全ピル） |
| 内側 padding | 横 8 |
| ブラー | `blur(30px) saturate(180%)` 相当 — iOS は `BlurView tint="systemChromeMaterial"` |
| Light 背景 | `linear-gradient(180deg, rgba(255,255,255,0.7)→rgba(245,245,250,0.55))` |
| Dark 背景 | `linear-gradient(180deg, rgba(60,60,65,0.55)→rgba(30,30,34,0.65))` |
| Hairline border | 0.5px — light `rgba(255,255,255,0.7)` / dark `rgba(255,255,255,0.14)` |
| 影（Light） | `0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)` |
| 影（Dark） | `0 8px 24px rgba(0,0,0,0.4)` |
| アクティブピル | `inset 4px 14%`、borderRadius 18、color `rgba(10,132,255,0.12)` (light) / `0.18` (dark) |
| アイコン | 24×24、アクティブ時 `#0a84ff` / 非アクティブ `onSurfaceVariant` |
| ラベル | 10px、fontWeight 600、letterSpacing 0.1 |
| アイコン↔ラベル gap | 1px |

## Scope

**In scope**
- `(tabs)/_layout.tsx` のタブバー視覚差し替え（Dogs / Walk / Me の 3 タブ、アイコン、ハプティクスは現状維持）
- 新コンポーネント `components/navigation/liquid-glass-tab-bar.tsx` 作成
- `expo-blur` 依存追加
- `walk.tsx` の記録中非表示 (`tabBarStyle: { display: 'none' }`) 互換維持
- スナップショット/スモークテスト追加

**Out of scope**
- 画面側コンテンツの paddingBottom 調整（フロートバー化で重なる領域は発生するが、既存 `paddingBottom: xxl` で実害がないことを目視確認したうえで、必要時は別タスク）
- アイコン意匠の差し替え（SF Symbols のまま。HTML は inline SVG だがピクセル換算で同等）
- その他画面のリデザイン

## Files to Modify / Create

| 種類 | パス | 役割 |
|---|---|---|
| NEW | `apps/mobile/components/navigation/liquid-glass-tab-bar.tsx` | iOS 26 仕様のフロートタブバー本体 |
| NEW | `apps/mobile/components/navigation/liquid-glass-tab-bar.test.tsx` | アクティブ指標・ハプティクス・`display:'none'` 非表示の単体テスト |
| EDIT | `apps/mobile/app/(tabs)/_layout.tsx` | `tabBarStyle` 設定を廃し、`tabBar={(props) => <LiquidGlassTabBar {...props} />}` へ差し替え |
| EDIT | `apps/mobile/package.json` | `expo-blur` を追加（`npx expo install expo-blur` 経由、バージョンは SDK 整合） |

既存の `HapticTab` (`apps/mobile/components/haptic-tab.tsx`) はタブバーボタン単位のハプティクスだが、カスタム `tabBar` 側でも同等の `Haptics.impactAsync(Light)` を `onPressIn` で呼ぶため、`tabBarButton` 経由の呼び出しは不要になる。コンポーネント自体は他用途がない場合にのみ削除。

## Component Contract — `LiquidGlassTabBar`

```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export function LiquidGlassTabBar(props: BottomTabBarProps): ReactElement | null;
```

主な責務
1. `props.descriptors[route.key].options.tabBarStyle?.display === 'none'` なら `null` を返す（walk 記録中対応）
2. `useSafeAreaInsets().bottom` を加味し、外側コンテナを `position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom - 12, 10) + 12` などで配置（最低 22px 確保）
3. `BlurView`（iOS: `tint="systemChromeMaterial"`, intensity 80 / Android: 半透明 fallback 背景）+ 二段グラデ用の半透明オーバーレイ View
4. 各ボタンは `Pressable` で `onPress={() => navigation.emit + navigate}`, `onPressIn` でハプティクス、アクティブ判定で青ピル + tint を切替
5. `accessibilityRole="button"`, `accessibilityLabel` に現在の `options.title`（i18n 済）, `accessibilityState={{ selected: focused }}`

デザインに合わせた固有値は component 内 `StyleSheet` に集約。色は `useColors()` の `interactive` / `onSurfaceVariant` / `onSurface` を使い、グラス特有の rgba 値（白 0.7 等）は token 化せずインラインで持つ（用途限定のため）。

## `_layout.tsx` 変更概要

```tsx
import { LiquidGlassTabBar } from '@/components/navigation/liquid-glass-tab-bar';

<Tabs
  initialRouteName="dogs"
  screenOptions={{ headerShown: false }}
  tabBar={(props) => <LiquidGlassTabBar {...props} />}
>
  <Tabs.Screen name="dogs" options={{ title: t('tabs.dogs'), tabBarIcon: ... }} />
  <Tabs.Screen name="walk" options={{ title: t('tabs.walk'), tabBarIcon: ... }} />
  <Tabs.Screen name="settings" options={{ title: t('tabs.me'), tabBarIcon: ... }} />
</Tabs>
```

`tabBarStyle` / `tabBarLabelStyle` / `tabBarActiveTintColor` / `tabBarInactiveTintColor` / `tabBarButton: HapticTab` は削除（カスタムバー内で再現）。`tabBarIcon` の `size` は 24、color は `LiquidGlassTabBar` が渡す `props.descriptors[...].options.tabBarIcon({ focused, color, size })` の `color` 経由で切替。

## Tests

`apps/mobile/components/navigation/liquid-glass-tab-bar.test.tsx` — React Native Testing Library で:
1. 3 タブのラベル（i18n モック）と role=button がレンダーされる
2. 選択中タブの `accessibilityState.selected === true`、他は false
3. 非選択タブ押下で `navigation.navigate` が該当 route 名で呼ばれる
4. `options.tabBarStyle = { display: 'none' }` の状態で `null` を返す（`container` query empty）
5. `Haptics.impactAsync` が iOS 環境で `onPressIn` 時に呼ばれる（`process.env.EXPO_OS === 'ios'` をモック）

既存の `__tests__/app/tabs/dogs.test.tsx` 等はタブバー視覚に依存しないため変更不要見込み。影響があれば最小限で追従。

## Verification

1. `cd apps/mobile && npm test -- liquid-glass-tab-bar` で単体テスト 緑
2. `cd apps/mobile && npx tsc --noEmit` 型エラーなし
3. `cd apps/mobile && npm run lint` パス
4. iOS Simulator で起動し、Light / Dark の両モードで以下を目視:
   - タブバーがフロートしピル型になっている
   - ブラー越しに背面コンテンツが透けて見える
   - Dogs/Walk/Me いずれかを選択すると薄い青ピルが移動しアイコン tint が `#0a84ff` に変わる
   - Walk → 散歩開始（recording 遷移）でタブバーが非表示になり、Finish で戻ったら再表示される
   - ホームインジケータと被らない（bottom inset を消化できている）
5. Android エミュレータでブラー fallback が破綻していないこと（半透明背景で代替）

## Rollback

単一コンポーネント追加 + `_layout.tsx` の一点変更 + `expo-blur` 追加のみ。`_layout.tsx` を git revert、`components/navigation/liquid-glass-tab-bar.tsx` を削除、`expo-blur` を `package.json` から外せば従前のタブバーに復帰できる。
