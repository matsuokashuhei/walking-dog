# Phase 2a 続き: BLE パッケージインストール + アドバタイズ実装

## Context

Phase 2a「出会い検知」の PR #60 が作成済み。BLE Central mode（スキャン）のロジックは実装済みだが:
1. `react-native-ble-plx` がまだ npm install されていない
2. BLE Peripheral mode（アドバタイズ）が `scanner.ts` でプレースホルダーのまま

iOS では `CBPeripheralManager` の advertisement に manufacturer data を含められない制約があるため、**Walk ID を追加の Service UUID としてエンコードする方式**を採用する。

---

## Task 1: react-native-ble-plx インストール

```bash
cd apps/mobile
npx expo install react-native-ble-plx
```

`app.config.ts` の plugin 設定は既に追加済み。

---

## Task 2: カスタム Expo Module `ble-advertiser` 作成

`native-module-scaffold` スキルを使って scaffolding 後、iOS/Android のネイティブ実装を追加。

### ファイル構成（新規）
```
apps/mobile/modules/ble-advertiser/
  expo-module.config.json
  index.ts                    — TypeScript public API
  src/BleAdvertiserModule.ts  — TS 型定義
  ios/BleAdvertiserModule.swift   — CBPeripheralManager
  android/
    build.gradle
    src/main/java/expo/modules/bleadvertiser/
      BleAdvertiserModule.kt  — BluetoothLeAdvertiser
```

### TypeScript API
```ts
startAdvertising(serviceUuid: string, walkIdUuid: string): Promise<void>
stopAdvertising(): Promise<void>
isAdvertising(): boolean
```

### iOS 実装（CBPeripheralManager）
- Service UUID エンコード方式: `WALKING_DOG_SERVICE_UUID` + Walk ID を UUID 形式で advertise
- `CBAdvertisementDataServiceUUIDsKey` に 2 つの UUID を含める
- Walk ID は UUID 文字列をそのまま `CBUUID(string:)` で使用（16 bytes = 128-bit UUID）

```swift
let advertisementData: [String: Any] = [
  CBAdvertisementDataServiceUUIDsKey: [
    CBUUID(string: serviceUuid),   // WD000001-... (フィルタリング用)
    CBUUID(string: walkIdUuid),    // Walk ID そのもの
  ],
]
manager.startAdvertising(advertisementData)
```

### Android 実装（BluetoothLeAdvertiser）
- Android は manufacturer data が使えるが、iOS との**一貫性のため同じ Service UUID 方式を使用**
- `AdvertiseData.Builder().addServiceUuid(serviceUuid).addServiceUuid(walkIdUuid)`

### Scanner 側の変更
`scanner.ts` を更新: `manufacturerData` ではなく `serviceUUIDs` から Walk ID を抽出。

```ts
// 変更前: device.manufacturerData から decodeWalkId()
// 変更後: device.serviceUUIDs から WALKING_DOG_SERVICE_UUID 以外の UUID を Walk ID として取得
```

---

## Task 3: scanner.ts の更新

### 変更ファイル
- `apps/mobile/lib/ble/scanner.ts`
  - `startAdvertising()`: プレースホルダーを native module 呼び出しに置換
  - `startScanning()`: `manufacturerData` ではなく `serviceUUIDs` から Walk ID を抽出
  - `encodeWalkId()` / `decodeWalkId()`: 不要になる（Walk ID は UUID そのままなので変換不要）

### 新しいスキャンロジック
```ts
manager.startDeviceScan(
  [WALKING_DOG_SERVICE_UUID],  // フィルタリング用
  { allowDuplicates: true },
  (error, device) => {
    if (!device?.serviceUUIDs) return;
    // WALKING_DOG_SERVICE_UUID 以外の UUID が Walk ID
    const walkId = device.serviceUUIDs.find(
      (uuid) => uuid.toUpperCase() !== WALKING_DOG_SERVICE_UUID.toUpperCase()
    );
    if (walkId) onWalkIdDetected(walkId);
  },
);
```

---

## Task 4: テスト

### ユニットテスト
- `encounter-tracker.test.ts` — 既存7テスト（変更なし、通過済み）
- scanner.ts の `encodeWalkId`/`decodeWalkId` は削除されるためテスト不要

### 手動テスト（実機2台必要）
1. Device A/B で散歩を開始
2. BLE scanning が `WALKING_DOG_SERVICE_UUID` をフィルタリングしてデバイスを検出
3. Walk ID が `serviceUUIDs` から正しく抽出される
4. 30秒後に `EncounterTracker` が `onEncounterDetected` を発火
5. API `recordEncounter` mutation が成功

### 単一デバイステスト
- nRF Connect や LightBlue で advertisement を確認
- Service UUIDs に `WALKING_DOG_SERVICE_UUID` + Walk ID UUID が含まれることを検証

---

## 検証手順

```bash
# 1. パッケージインストール
cd apps/mobile
npx expo install react-native-ble-plx

# 2. Expo Module 作成（native-module-scaffold スキル使用）
npx create-expo-module@latest --local

# 3. ビルド
npx expo prebuild --clean
npx expo run:ios     # 実機 iOS
npx expo run:android # 実機 Android

# 4. 既存テスト確認
npx jest lib/ble/__tests__/encounter-tracker.test.ts
```

---

## 変更ファイルまとめ

| ファイル | 操作 | 内容 |
|---------|------|------|
| `modules/ble-advertiser/` | 新規 | Expo Module（Swift + Kotlin） |
| `lib/ble/scanner.ts` | 変更 | advertiser 呼び出し + serviceUUIDs からの Walk ID 抽出 |
| `lib/ble/constants.ts` | 変更不要 | Service UUID は既存のまま |
| `package.json` | 変更 | `react-native-ble-plx` 追加 |
| `app.config.ts` | 変更不要 | BLE plugin 設定は既存 |

## 再利用する既存コード

| コード | ファイル |
|-------|--------|
| BLE 定数（Service UUID 等） | `lib/ble/constants.ts` |
| EncounterTracker（変更なし） | `lib/ble/encounter-tracker.ts` |
| BLE パーミッション | `lib/ble/permissions.ts` |
| walk.tsx の BLE 統合（変更なし） | `app/(tabs)/walk.tsx` |
| `native-module-scaffold` スキル | scaffolding に使用 |
