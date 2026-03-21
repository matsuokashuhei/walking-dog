# Walking Dog App — Design Spec
**Date**: 2026-03-21
**Status**: Approved

---

## 1. Overview

### Concept
「犬の友達作り」を軸に、飼い主の幸福度を最大化する散歩・交流プラットフォーム。

### Problem & Solution
現代の飼い主の多くは犬を「家族」と捉えているが、散歩中の交流は一時的なものに留まりがちです。本アプリはGPSによる散歩記録に加え、出会った犬同士の「親密度の深化」を可視化し、再会を特別なイベントに変えます。

### Positioning
- 既存の記録アプリ（onedog等）: 健康管理が主目的
- 既存の交流アプリ（Dogmate等）: 「出会い」に留まる
- **本アプリ**: 「関係性の継続と深化」をゲーミフィケーション化

### Target Users
犬の飼い主全般。1アカウントで複数の犬を管理可能。**1回の散歩で複数の犬を同時に登録可能**。

---

## 2. Phase Plan

| Phase | 期間 | 内容 |
|-------|------|------|
| **Phase 1** | 2-3週間 | 散歩記録 + 犬プロフィール + 認証 → App Store初回リリース |
| **Phase 2** | 2-3週間 | GPS/BLE出会い検知 + 友達機能 + 親密度 |
| **Phase 3** | 1-2週間 | ゲーミフィケーション（統計・実績・バッジ） |
| **Phase 4** | 将来 | リアルタイム地図表示・チャット等 |

---

## 3. Architecture

```
Mobile App (Expo/React Native)
    │  HTTPS  GraphQL
    ▼
API Server (Rust / Axum + async-graphql)
    ├─ Cognito JWT検証
    ├─ SeaORM → RDS PostgreSQL
    └─ aws-sdk → DynamoDB / S3
```

### AWS Infrastructure

| サービス | 用途 | 無料枠 |
|---------|------|--------|
| Cognito | 認証 | 5万ユーザー/月 |
| ECS Fargate | APIホスティング (0.25 vCPU, 0.5GB RAM) | — |
| RDS PostgreSQL | メインDB (db.t4g.micro) | 12ヶ月無料 |
| DynamoDB | 散歩ルートポイント | 25GB/250万req |
| S3 + CloudFront | 犬の写真 | 5GB/月 |

---

## 4. Authentication

### Providers
- **Apple Sign-In** (App Store要件のため必須)
- **Google Sign-In**
- **Email + Password** (Cognito User Pool ネイティブ認証)

### Flow
```
# Apple / Google
Mobile → Cognito SDK (Federated Identity) → JWT取得

# Email / Password
Mobile → Cognito SDK (signIn / signUp / confirmSignUp) → JWT取得

# 共通
Mobile → POST /graphql (Authorization: Bearer <JWT>)
       → Axumミドルウェアで検証 → user_idをContextに注入
```

### Email認証フロー
1. サインアップ: メールアドレス + パスワード入力
2. Cognitoが確認コードをメール送信
3. ユーザーが6桁コードを入力して確認完了
4. サインイン → JWT取得

### Token Refresh
- Cognitoのリフレッシュトークンを`expo-secure-store`に保存
- アクセストークン期限切れ時に自動リフレッシュ

---

## 5. Data Model

### PostgreSQL (メタデータ・リレーショナル)

```sql
users
  id              UUID PK DEFAULT gen_random_uuid()
  cognito_sub     VARCHAR UNIQUE NOT NULL
  display_name    VARCHAR
  avatar_url      VARCHAR
  created_at      TIMESTAMPTZ DEFAULT now()

dogs
  id              UUID PK DEFAULT gen_random_uuid()
  user_id         UUID FK → users NOT NULL ON DELETE CASCADE
  name            VARCHAR NOT NULL
  breed           VARCHAR
  gender          VARCHAR        -- male/female/neutered_male/spayed_female
  birth_date      JSONB          -- {"year":2020,"month":5,"day":15} / {"year":2020} / {}
  photo_url       VARCHAR
  created_at      TIMESTAMPTZ DEFAULT now()

-- 1回の散歩で複数の犬をサポート
walks
  id              UUID PK DEFAULT gen_random_uuid()
  user_id         UUID FK → users NOT NULL
  status          VARCHAR        -- 'active' / 'finished'
  distance_m      INT
  duration_sec    INT
  started_at      TIMESTAMPTZ NOT NULL
  ended_at        TIMESTAMPTZ

walk_dogs                        -- 散歩に参加した犬 (多対多)
  walk_id         UUID FK → walks NOT NULL ON DELETE CASCADE
  dog_id          UUID FK → dogs NOT NULL ON DELETE CASCADE
  PK(walk_id, dog_id)
```

**削除ルール**: 犬を削除すると、`ON DELETE CASCADE`でその犬の`walk_dogs`レコードが削除される。散歩の全参加犬が削除された場合は、アプリケーション層（`deleteDog`サービス）で`walk_dogs`が0件になった`walks`レコードを合わせて削除する。

**バリデーション**: `startWalk(dogIds: [ID!]!)` はサーバー側で`dogIds`が1件以上であることを検証し、空の場合は`BAD_USER_INPUT`エラーを返す。

**ユーザーレベル統計**: Homeスクリーンのサマリーは`myWalks`クエリの結果をクライアント側で集計する。将来的にパフォーマンス問題が生じたらサーバー側クエリ（`userWalkStats`）を追加する。

### DynamoDB (高頻度書き込み)

**WalkPoints テーブル**

| Key | 属性 | 説明 |
|-----|------|------|
| PK: `WALK#<walk_id>` | SK: `PT#<seq>` | lat, lng, recorded_at |

- Sequenceは0始まりの連番
- バッチ書き込み: 30秒ごとにモバイルからまとめて送信
- 最大ポイント数: 散歩1回あたり7200ポイント(6時間×5秒間隔)

### Phase 2以降 (設計予定)
- `dog_personality_tags`
- `friendships` (encounter_count, total_interaction_sec, first_met_at, last_met_at)
- `encounters` (detection_method: gps/ble)

---

## 6. GraphQL API

### Technology Stack
- **Rust** + **Axum** (HTTPサーバー)
- **async-graphql** (GraphQLライブラリ)
- **SeaORM** (PostgreSQL ORM)
- **aws-sdk-dynamodb** (DynamoDB)
- **aws-sdk-s3** (写真アップロード)
- **jsonwebtoken** (Cognito JWT検証)

### Schema (Phase 1)

```graphql
type User {
  id: ID!
  displayName: String
  avatarUrl: String
  dogs: [Dog!]!
  createdAt: DateTime!
}

type Dog {
  id: ID!
  name: String!
  breed: String
  gender: String
  birthDate: BirthDate
  photoUrl: String
  walks(limit: Int, offset: Int): [Walk!]!
  walkStats(period: StatsPeriod!): WalkStats!
  createdAt: DateTime!
}

type BirthDate {
  year: Int
  month: Int
  day: Int
}

type Walk {
  id: ID!
  dogs: [Dog!]!           # 複数犬対応
  status: WalkStatus!
  distanceM: Int
  durationSec: Int
  startedAt: DateTime!
  endedAt: DateTime
  points: [WalkPoint!]!
}

type WalkPoint {
  lat: Float!
  lng: Float!
  recordedAt: DateTime!
}

type WalkStats {
  totalWalks: Int!
  totalDistanceM: Int!
  totalDurationSec: Int!
}

type PresignedUrl {
  url: String!
  key: String!
  expiresAt: DateTime!
}

enum WalkStatus { ACTIVE FINISHED }
enum StatsPeriod { WEEK MONTH YEAR ALL }

type Query {
  me: User!
  dog(id: ID!): Dog
  walk(id: ID!): Walk
  myWalks(limit: Int, offset: Int): [Walk!]!
}

type Mutation {
  updateProfile(input: UpdateProfileInput!): User!

  createDog(input: CreateDogInput!): Dog!
  updateDog(id: ID!, input: UpdateDogInput!): Dog!
  deleteDog(id: ID!): Boolean!
  generateDogPhotoUploadUrl(dogId: ID!): PresignedUrl!

  startWalk(dogIds: [ID!]!): Walk!     # 複数犬対応
  addWalkPoints(walkId: ID!, points: [WalkPointInput!]!): Boolean!
  finishWalk(walkId: ID!): Walk!
}

input UpdateProfileInput {
  displayName: String
}

input CreateDogInput {
  name: String!
  breed: String
  gender: String
  birthDate: BirthDateInput
}

input UpdateDogInput {
  name: String
  breed: String
  gender: String
  birthDate: BirthDateInput
}

input BirthDateInput {
  year: Int
  month: Int
  day: Int
}

input WalkPointInput {
  lat: Float!
  lng: Float!
  recordedAt: DateTime!
}
```

### Walk Points Strategy
- GPS取得: 5秒ごと
- API送信: 30秒ごとにバッチ送信（最大150ポイント/バッチ）
- オフライン時: デバイスローカル（SQLite via expo-sqlite）に蓄積
- 再接続時: ローカルバッファを順次送信
- サーバー側バリデーション: バッチサイズ上限200ポイント

### Error Handling
- 認証エラー: GraphQL extension `UNAUTHENTICATED`
- 不正リクエスト: GraphQL extension `BAD_USER_INPUT`
- サーバーエラー: GraphQL extension `INTERNAL_SERVER_ERROR`
- ネットワーク断: TanStack QueryのretryロジックでUIに表示

---

## 7. Mobile App (Expo/React Native)

### Tech Stack
| 分類 | 技術 |
|------|------|
| Framework | Expo 54 / React Native 0.81 |
| Navigation | Expo Router (file-based) |
| State (client) | Zustand |
| State (server) | TanStack Query + graphql-request |
| Map | **react-native-maps** (iOS: MapKit, Android: Google Maps) |
| Auth | Amazon Cognito SDK + Apple/Google Sign-In |
| Secure Storage | expo-secure-store (JWTトークン) |
| Local DB | expo-sqlite (オフラインWalkPointsバッファ) |
| Styling | StyleSheet.create + テーマトークン |
| Build | EAS Build / EAS Submit |

### Navigation Structure

```
(auth)/
  ├─ login.tsx             # ログイン (Apple/Google)
  └─ register.tsx          # プロフィール設定 (初回ログイン後)

(tabs)/
  ├─ _layout.tsx           # タブバー定義
  ├─ index.tsx             # ホーム
  ├─ walk.tsx              # 散歩
  ├─ dogs.tsx              # 犬一覧
  └─ settings.tsx          # 設定

dogs/
  ├─ new.tsx               # 犬の新規登録
  └─ [id]/
      ├─ index.tsx         # 犬の詳細
      └─ edit.tsx          # 犬の編集

walks/
  └─ [id].tsx              # 散歩詳細
```

### Key Screens

| 画面 | 主な機能 |
|------|---------|
| ホーム | 今日の散歩サマリー（回数・距離・時間）、最近の散歩3件 |
| 散歩 | 地図（現在地中心）、犬選択（複数可）、開始/停止、リアルタイムルート描画 |
| 犬一覧 | 犬カード（写真・名前・犬種）、＋ボタンで新規登録 |
| 犬詳細 | プロフィール、散歩統計（週/月/累計）、最近の散歩リスト |
| 散歩詳細 | 地図上ルート表示、距離・時間・開始終了時刻 |
| 設定 | アカウント設定、ログアウト、通知設定 |

### Platform
- **iOS**: Primary (App Store)
- **Android**: 将来対応（Phase 1はiOSのみ）

---

## 8. Gamification Metrics (Phase 1: 統計表示のみ)

| 指標 | 説明 |
|------|------|
| 散歩回数 | 累計・週間・月間 |
| 散歩距離 | 累計 |
| 散歩時間 | 累計 |

Phase 2以降で追加:
- 出会い回数・交流時間・友達の数
- 連続散歩日数（ストリーク）
- 実績バッジ・親密度レベル

---

## 9. Future Phases

### Phase 2: 出会い & 友達機能
- GPS近接検知: 半径50m以内で一定時間一緒にいたら「出会い」記録
- BLE (Bluetooth LE): より精密な近接検知
- 友達プロフィール: 出会い回数・交流時間の可視化
- 再会通知: 以前出会った犬が近くにいる際のプッシュ通知

### Phase 3: ゲーミフィケーション
- 親密度レベル（出会い回数でランクアップ）
- バッジ・実績システム
- 散歩ストリーク

### Phase 4: リアルタイム
- 散歩中の近くのユーザーをリアルタイム地図表示
- チャット機能
