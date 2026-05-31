---
name: expo-ui-docs-first
description: Use when designing, implementing, or refactoring UI in Expo or React Native apps, especially with @expo/ui, @expo/ui/swift-ui, native-feeling controls, sheets, forms, lists, widgets, Live Activity UI, or platform UI.
---

# Expo UI Docs First

## Core Rule

Before planning or editing Expo UI code, read the relevant official Expo UI docs and state what you read. Do not guess component APIs from memory.

## Workflow

1. Read the relevant overview first:
   - [SwiftUI](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/)
   - [Universal](https://docs.expo.dev/versions/latest/sdk/ui/universal/)
2. Pick the surface:
   - Prefer Universal (`@expo/ui`) for cross-platform UI.
   - Use SwiftUI (`@expo/ui/swift-ui`) when the UI needs SwiftUI-specific views, modifiers, widgets, Live Activity UI, or iOS-only presentation.
3. Read every component page you plan to use before implementation.
4. Before code edits, write a short plan listing:
   - docs read
   - selected components
   - import paths
   - `Host` / `RNHostView` wrapper structure
   - verification steps
5. Every Expo UI tree must be wrapped in `Host`. Use `RNHostView` when embedding React Native components inside a native UI tree.
6. If required docs are unavailable because browsing or network access is blocked, stop and say which docs could not be read instead of inventing the API.

## Component Docs

### SwiftUI

- [AccessoryWidgetBackground](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/accessorywidgetbackground/)
- [Alert](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/alert/)
- [BottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/bottomsheet/)
- [Button](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/button/)
- [ColorPicker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/colorpicker/)
- [ConfirmationDialog](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/confirmationdialog/)
- [ContextMenu](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/contextmenu/)
- [ControlGroup](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/controlgroup/)
- [DatePicker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/datepicker/)
- [DisclosureGroup](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/disclosuregroup/)
- [Divider](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/divider/)
- [Form](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/form/)
- [Gauge](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/gauge/)
- [Group](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/group/)
- [Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host/)
- [HStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/hstack/)
- [Image](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/image/)
- [Label](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/label/)
- [LazyHStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/lazyhstack/)
- [LazyVStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/lazyvstack/)
- [Link](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/link/)
- [List](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list/)
- [Menu](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/menu/)
- [Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers/)
- [Namespace](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/namespace/)
- [Overlay](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/overlay/)
- [Picker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/picker/)
- [Popover](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/popover/)
- [ProgressView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/)
- [RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/)
- [ScrollView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/scrollview/)
- [Section](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/section/)
- [SecureField](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/securefield/)
- [Slider](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/slider/)
- [Spacer](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/spacer/)
- [SwipeActions](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/swipeactions/)
- [TabView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/tabview/)
- [Text](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/text/)
- [TextField](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/textfield/)
- [Toggle](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/toggle/)
- [useNativeState](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate/)
- [VStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/vstack/)
- [ZStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/zstack/)

### Universal

- [BottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/universal/bottomsheet/)
- [Button](https://docs.expo.dev/versions/latest/sdk/ui/universal/button/)
- [Checkbox](https://docs.expo.dev/versions/latest/sdk/ui/universal/checkbox/)
- [Collapsible](https://docs.expo.dev/versions/latest/sdk/ui/universal/collapsible/)
- [Column](https://docs.expo.dev/versions/latest/sdk/ui/universal/column/)
- [FieldGroup](https://docs.expo.dev/versions/latest/sdk/ui/universal/fieldgroup/)
- [Host](https://docs.expo.dev/versions/latest/sdk/ui/universal/host/)
- [Icon](https://docs.expo.dev/versions/latest/sdk/ui/universal/icon/)
- [List](https://docs.expo.dev/versions/latest/sdk/ui/universal/list/)
- [Picker](https://docs.expo.dev/versions/latest/sdk/ui/universal/picker/)
- [RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/universal/rnhostview/)
- [Row](https://docs.expo.dev/versions/latest/sdk/ui/universal/row/)
- [ScrollView](https://docs.expo.dev/versions/latest/sdk/ui/universal/scrollview/)
- [Slider](https://docs.expo.dev/versions/latest/sdk/ui/universal/slider/)
- [Spacer](https://docs.expo.dev/versions/latest/sdk/ui/universal/spacer/)
- [Switch](https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/)
- [Text](https://docs.expo.dev/versions/latest/sdk/ui/universal/text/)
- [TextInput](https://docs.expo.dev/versions/latest/sdk/ui/universal/textinput/)

## Common Mistakes

- Starting implementation before reading the component docs.
- Choosing SwiftUI when Universal covers the cross-platform need.
- Forgetting `Host` around the native UI tree.
- Embedding React Native components directly instead of wrapping them with `RNHostView`.
