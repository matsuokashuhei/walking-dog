# Mobile design-system hard-grep audit

Generated from hard-grep after Step 1 token expansion. Do not trust older audits; rerun the commands below when updating this checklist.

## Completion criteria

- All unchecked production-surface items below are resolved or moved to `apps/mobile/theme/overrides.ts` with rationale.
- The style/color/deprecated hard-grep commands return zero actionable production violations.
- Deprecated aliases are removed from `apps/mobile/theme/tokens.ts` only after the deprecated grep returns zero in app/components/hooks.

## Commands

```bash
rg -n "fontSize:\s*\d|fontWeight:\s*['\"]|letterSpacing:\s*-?\d|lineHeight:\s*\d|borderRadius:\s*\d|padding(?:Horizontal|Vertical|Top|Bottom|Left|Right)?:\s*\d|margin(?:Horizontal|Vertical|Top|Bottom|Left|Right)?:\s*\d|gap:\s*\d|shadowColor:|shadowOpacity:|shadowRadius:" \
  apps/mobile/app apps/mobile/components apps/mobile/hooks \
  -g '!*.test.tsx' -g '!__tests__/**' -g '!modules/**'

rg -n "#[0-9a-fA-F]{3,8}|rgba?\(" \
  apps/mobile/app apps/mobile/components apps/mobile/hooks \
  -g '!*.test.tsx'

rg -n "typography\.(hero|bodyMedium|h1|h2|h3|display|label|button)|surfaceContainer(High|Lowest)|cardBorder|primaryContainer" \
  apps/mobile/app apps/mobile/components apps/mobile/hooks
```

## Summary

- style: 204 matches across 53 files
- color: 22 matches across 9 files
- deprecated: 43 matches across 22 files

## Checklist

### apps/mobile/app

- [ ] `apps/mobile/app/(auth)/login.tsx` — 3 件 (types: style, lines: 53,72,79)
- [ ] `apps/mobile/app/(auth)/register.tsx` — 2 件 (types: style, lines: 87,88)
- [ ] `apps/mobile/app/(tabs)/dogs.tsx` — 3 件 (types: style, lines: 104,105,111)
- [ ] `apps/mobile/app/dogs/[id]/edit.tsx` — 1 件 (types: style, lines: 157)
- [ ] `apps/mobile/app/dogs/[id]/encounters.tsx` — 2 件 (types: deprecated, lines: 59,63)
- [ ] `apps/mobile/app/dogs/[id]/friends/[friendDogId].tsx` — 5 件 (types: deprecated/style, lines: 110,124,128,129,130)
- [ ] `apps/mobile/app/dogs/[id]/friends/index.tsx` — 2 件 (types: deprecated, lines: 63,67)
- [ ] `apps/mobile/app/dogs/[id]/index.tsx` — 4 件 (types: style, lines: 107,108,111,112)
- [ ] `apps/mobile/app/dogs/[id]/members.tsx` — 1 件 (types: style, lines: 133)
- [ ] `apps/mobile/app/dogs/new.tsx` — 1 件 (types: style, lines: 127)
- [ ] `apps/mobile/app/invite/[token].tsx` — 6 件 (types: deprecated/style, lines: 59,88,94,95,96,105)
- [ ] `apps/mobile/app/walks/[id].tsx` — 21 件 (types: deprecated/style, lines: 139,200,201,202,205,206,207,211,219,221,222,224,228,229,230,232,234,237,241,242,250)
- [ ] `apps/mobile/app/walks/_layout.tsx` — 3 件 (types: style, lines: 39,40,41)

### apps/mobile/components

- [ ] `apps/mobile/components/auth/AppMark.tsx` — 4 件 (types: color/style, lines: 9,38,40,41)
- [ ] `apps/mobile/components/auth/ConfirmForm.tsx` — 4 件 (types: deprecated/style, lines: 70,137,138,150)
- [ ] `apps/mobile/components/auth/LoginForm.tsx` — 3 件 (types: style, lines: 131,145,146)
- [ ] `apps/mobile/components/auth/RegisterForm.tsx` — 3 件 (types: style, lines: 147,148,160)
- [ ] `apps/mobile/components/dogs/DogHeroNavBar.tsx` — 4 件 (types: color/style, lines: 16,17,46,82)
- [ ] `apps/mobile/components/dogs/DogListItem.tsx` — 11 件 (types: style, lines: 84,104,108,112,113,116,117,121,122,126,129)
- [ ] `apps/mobile/components/dogs/DogMembersList.tsx` — 6 件 (types: deprecated/style, lines: 42,83,85,86,87)
- [ ] `apps/mobile/components/dogs/DogStatsCard.tsx` — 1 件 (types: style, lines: 57)
- [ ] `apps/mobile/components/dogs/DogWalkRow.tsx` — 8 件 (types: style, lines: 98,114,115,119,124,127,130,135)
- [ ] `apps/mobile/components/dogs/DogWalksList.tsx` — 3 件 (types: style, lines: 79,84,88)
- [ ] `apps/mobile/components/dogs/EncounterCard.tsx` — 3 件 (types: deprecated/style, lines: 64,68,74)
- [ ] `apps/mobile/components/dogs/FriendCard.tsx` — 5 件 (types: deprecated/style, lines: 28,53,78,82,86)
- [ ] `apps/mobile/components/dogs/PackRollupCard.tsx` — 5 件 (types: style, lines: 80,87,88,92,95)
- [ ] `apps/mobile/components/settings/ProfileCard.tsx` — 12 件 (types: color/style, lines: 12,57,67,68,75,76,77,80,81,82,85,86)
- [ ] `apps/mobile/components/settings/SignOutRow.tsx` — 3 件 (types: style, lines: 61,68,69)
- [ ] `apps/mobile/components/ui/Button.tsx` — 6 件 (types: color/deprecated/style, lines: 71,73,127,130,131,132)
- [ ] `apps/mobile/components/ui/ConfirmDialog.tsx` — 3 件 (types: color/deprecated, lines: 32,53,64)
- [ ] `apps/mobile/components/ui/GroupedRow.tsx` — 3 件 (types: style, lines: 90,108,109)
- [ ] `apps/mobile/components/ui/Metric.tsx` — 10 件 (types: style, lines: 27,30,31,33,40,41,42,44,48,49)
- [ ] `apps/mobile/components/ui/OutlinedCard.test.tsx` — 1 件 (types: deprecated, lines: 19)
- [ ] `apps/mobile/components/ui/OutlinedCard.tsx` — 2 件 (types: deprecated, lines: 22,23)
- [ ] `apps/mobile/components/ui/RingProgress.tsx` — 1 件 (types: style, lines: 83)
- [ ] `apps/mobile/components/ui/SectionHeader.tsx` — 3 件 (types: style, lines: 60,61,62)
- [ ] `apps/mobile/components/ui/SegmentedControl.tsx` — 4 件 (types: deprecated/style, lines: 20,32,54,65)
- [ ] `apps/mobile/components/ui/Tag.tsx` — 11 件 (types: color/style, lines: 43,45,47,49,51,63,64,66,71,74,75)
- [ ] `apps/mobile/components/ui/TextInput.tsx` — 4 件 (types: deprecated/style, lines: 72,95,115,127)
- [ ] `apps/mobile/components/ui/ThemedView.tsx` — 1 件 (types: deprecated, lines: 6)
- [ ] `apps/mobile/components/walk/DogEventActionRow.tsx` — 5 件 (types: style, lines: 96,104,108,112,121)
- [ ] `apps/mobile/components/walk/DogPickerCard.tsx` — 9 件 (types: color/style, lines: 165,169,174,183,184,185,186,192,193)
- [ ] `apps/mobile/components/walk/EventPill.tsx` — 5 件 (types: style, lines: 53,59,62,66,67)
- [ ] `apps/mobile/components/walk/NoDogsBody.tsx` — 6 件 (types: deprecated/style, lines: 52,58,68,80,81,82)
- [ ] `apps/mobile/components/walk/PerDogSummaryCard.tsx` — 5 件 (types: style, lines: 104,125,129,136,137)
- [ ] `apps/mobile/components/walk/WalkControlsActions.tsx` — 5 件 (types: deprecated/style, lines: 36,75,79,80,84)
- [ ] `apps/mobile/components/walk/WalkEventActions.tsx` — 2 件 (types: deprecated/style, lines: 155,177)
- [ ] `apps/mobile/components/walk/WalkEventTimeline.tsx` — 3 件 (types: style, lines: 117,146,147)
- [ ] `apps/mobile/components/walk/WalkHistoryItem.tsx` — 4 件 (types: deprecated/style, lines: 37,96,101,105)
- [ ] `apps/mobile/components/walk/WalkIdentityHeader.tsx` — 2 件 (types: style, lines: 83,87)
- [ ] `apps/mobile/components/walk/WalkMap.tsx` — 1 件 (types: style, lines: 77)
- [ ] `apps/mobile/components/walk/WalkMinimizedControls.tsx` — 5 件 (types: style, lines: 107,118,124,125,126)
- [ ] `apps/mobile/components/walk/WalkQuickActions.tsx` — 1 件 (types: style, lines: 238)
- [ ] `apps/mobile/components/walk/WalkReadyStatsRow.tsx` — 7 件 (types: style, lines: 61,65,66,68,72,73,76)
- [ ] `apps/mobile/components/walk/WalkReadyView.tsx` — 6 件 (types: style, lines: 136,152,153,155,158,159)
- [ ] `apps/mobile/components/walk/WalkRoutePreview.tsx` — 2 件 (types: style, lines: 160,166)
- [ ] `apps/mobile/components/walk/WalkStartButton.tsx` — 7 件 (types: deprecated/style, lines: 52,59,62,65,66,67,68)
- [ ] `apps/mobile/components/walk/WalkSummaryCard.tsx` — 3 件 (types: style, lines: 197,198,199)
- [ ] `apps/mobile/components/walk/WalkTopChip.tsx` — 1 件 (types: style, lines: 89)

### apps/mobile/hooks

- [ ] `apps/mobile/hooks/use-colors.test.ts` — 10 件 (types: color/deprecated, lines: 15,16,25,26,29,35,38,44)
- [ ] `apps/mobile/hooks/use-themed-styles.test.ts` — 2 件 (types: color, lines: 19,35)

## Intentional overrides to route through `theme/overrides.ts`

- [ ] `apps/mobile/components/dogs/DogHeroNavBar.tsx` photo overlay -> `heroPhotoOverlay`
- [ ] `apps/mobile/components/ui/Button.tsx` Apple sign-in brand colors -> `appleButton`
- [ ] `apps/mobile/components/ui/ConfirmDialog.tsx` modal backdrop -> `confirmDialogBackdrop`
- [ ] `apps/mobile/components/dogs/PhotoPicker.tsx` camera badge geometry -> `cameraBadge`
- [ ] Native stack/header/sheet options in `apps/mobile/app/**` -> `nativeStackHeader`
