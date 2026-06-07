# Watch Walk Connectivity Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Apple Watch walk sync so WatchConnectivity is owned by app lifecycle code, then make active walk snapshots and Watch commands flow through clear, testable boundaries.

**Architecture:** Keep the iPhone walk session as the single source of truth. The iPhone publishes latest-only walk snapshots through WatchConnectivity; the Watch owns a lifecycle-level connectivity coordinator that persists received snapshots into its App Group and exposes a thin observable read model to SwiftUI. Watch UI sends commands back to iPhone, and iPhone only commits commands that match the current active walk.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Jest, Expo native module, SwiftUI watchOS app, WatchConnectivity, WidgetKit, `@bacons/apple-targets`.

---

## File Structure

Create or modify these files only:

- Modify: `apps/mobile/lib/watch/types.ts`
  - Adds `syncState` to the JS snapshot contract.
- Modify: `apps/mobile/lib/watch/snapshot.ts`
  - Builds explicit `syncState: 'fresh'` snapshots instead of letting Watch infer activity from freshness.
- Modify: `apps/mobile/lib/watch/snapshot.test.ts`
  - Locks the JS snapshot contract.
- Modify: `apps/mobile/targets/watch/WatchWalkModels.swift`
  - Adds `WatchWalkSyncState` and removes time-based conversion from active to inactive.
- Create: `apps/mobile/targets/watch/WatchWalkSnapshotStore.swift`
  - Owns Watch App Group persistence for snapshots and pending command IDs.
- Modify: `apps/mobile/targets/watch/WatchWalkStore.swift`
  - Becomes the Watch UI read model and command builder. It no longer conforms to `WCSessionDelegate`.
- Create: `apps/mobile/targets/watch/WatchConnectivityCoordinator.swift`
  - Owns `WCSessionDelegate`, activation, incoming payloads, outgoing commands, acks, and watchOS connectivity background task completion.
- Create: `apps/mobile/targets/watch/WalkingDogWatchRuntime.swift`
  - Wires the snapshot store, UI store, and connectivity coordinator into one app-lifecycle runtime.
- Modify: `apps/mobile/targets/watch/WalkingDogWatchApp.swift`
  - Installs a `WKApplicationDelegate` and uses the runtime-owned store.
- Modify: `apps/mobile/targets/watch/WatchWalkControlsView.swift`
  - Shows stale/offline sync as a secondary status while preserving active walk UI.
- Modify: `apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift`
  - Decodes `syncState` and stops converting old active snapshots into inactive snapshots.
- Modify: `apps/mobile/modules/walking-dog-watch-bridge/ios/WalkingDogWatchBridgeModule.swift`
  - Adds explicit publish result logging so iPhone-side delivery state is inspectable.
- Modify: `apps/mobile/modules/walking-dog-watch-bridge/src/WalkingDogWatchBridgeModule.ts`
  - Reflects the native publish result type.
- Modify: `apps/mobile/lib/watch/bridge.ts`
  - Logs non-published snapshot results once per reason.
- Test: `apps/mobile/lib/watch/snapshot.test.ts`
- Test: existing command tests in `apps/mobile/lib/watch/commands.test.ts` and `apps/mobile/hooks/use-watch-walk-command-processor.test.ts`
- Manual verification: `npm run ios:clean`, `npm run ios:sim:local`, `npm run watch:sim`, plus `xcrun simctl` log and App Group checks.

Swift watch target does not currently have an XCTest target. Swift tasks use compile/build checks as the red/green signal, and TypeScript snapshot/command behavior is locked with Jest.

---

## Pre-Implementation Checklist

- [x] **1. Split `WatchWalkStore.swift` into three layers**

  `apps/mobile/targets/watch/WatchWalkStore.swift:12` currently owns too many responsibilities. Split it into:

  - `WatchConnectivityCoordinator`: owns `WCSessionDelegate`, activation, background tasks, incoming payloads, outgoing commands, and ack handling.
  - `WatchWalkSnapshotStore`: owns App Group persistence for walk snapshots and pending command IDs.
  - `WatchWalkViewModel` or a thin `WatchWalkStore`: exposes only the observable UI state and user-facing actions.

- [x] **2. Move connectivity ownership under `WalkingDogWatchApp` lifecycle**

  `apps/mobile/targets/watch/WalkingDogWatchApp.swift:5` should be shaped so a lifecycle-owned coordinator can exist above the UI. The UI `@StateObject` must not own communication. App startup should activate the `WCSession`, and background wake should save payloads through the same coordinator path.

- [x] **3. Separate active state from sync freshness**

  `apps/mobile/targets/watch/WatchWalkModels.swift:36` must not convert `updatedAtMs > 120` seconds into inactive. Communication delay is not the same thing as "not walking." `isActive` should only reflect the explicit iPhone snapshot state, while freshness is represented separately as `syncState: fresh/stale/offline`.

- [x] **4. Make iPhone publish state observable**

  `apps/mobile/modules/walking-dog-watch-bridge/ios/WalkingDogWatchBridgeModule.swift:50` should report or log publish outcomes for send failure, Watch app not installed, not paired, unsupported WatchConnectivity, and not-yet-activated session states. Do not silently return from delivery checks.

- [x] **5. Keep Watch UI as an observer of coordinator/read model state**

  Place `WatchConnectivityCoordinator` directly under the `WalkingDogWatchApp` lifecycle. It should handle `WCSessionDelegate` and `WKWatchConnectivityRefreshBackgroundTask`; the UI should observe only the coordinator-backed read model and should not directly manage WatchConnectivity.

- [x] **6. Keep WatchConnectivity delivery channels purpose-specific**

  Snapshot delivery and command delivery must use different WatchConnectivity mechanisms:

  - `updateApplicationContext`: the latest snapshot source of truth. It reflects distance, dogs, event counts, start state, and end state.
  - `sendMessage`: immediate snapshot or ack delivery only when the Watch app is reachable.
  - `transferUserInfo`: reliable delivery for Watch-to-iPhone commands such as pee, poop, and end walk.

  Do not send every walk snapshot with `transferUserInfo`. A stale snapshot can arrive after a newer snapshot and roll the Watch UI backward. Walk snapshots are latest-only data, so `applicationContext` is the correct primary channel.

- [x] **7. Keep Watch active state explicit and freshness separate**

  Do not return to inactive just because `updatedAtMs` is old. The Watch should become inactive only when it receives an explicit inactive/end snapshot from iPhone.

  State should be interpreted as:

  - `isActive`: whether iPhone says a walk is currently active.
  - `syncState`: freshness of the mirrored snapshot, one of `fresh`, `stale`, or `offline`.
  - `canRecordEvent`: true only when the walk is active and `latestPoint` exists.

Implementation note: the checklist above is covered by the 2026-06-07 implementation. Full generated iOS project builds and simulator/manual round-trip checks remain in Task 6 because this worktree does not keep `apps/mobile/ios/` checked in.

---

### Task 1: Lock the JS Watch Snapshot Contract

**Files:**
- Modify: `apps/mobile/lib/watch/types.ts`
- Modify: `apps/mobile/lib/watch/snapshot.ts`
- Test: `apps/mobile/lib/watch/snapshot.test.ts`

- [ ] **Step 1: Write the failing snapshot contract test**

Edit `apps/mobile/lib/watch/snapshot.test.ts` so both expected snapshots include `syncState: 'fresh'`.

```ts
expect(
  buildWatchWalkSnapshot({
    phase: 'ready',
    walkId: null,
    startedAt: null,
    dogs,
    events: [],
    distanceM: 0,
    latestPoint: undefined,
    nowMs: 1770000000000,
  }),
).toEqual({
  isActive: false,
  syncState: 'fresh',
  walkId: null,
  startedAtMs: null,
  distanceM: 0,
  dogs: [],
  latestPoint: null,
  updatedAtMs: 1770000000000,
});
```

```ts
expect(
  buildWatchWalkSnapshot({
    phase: 'recording',
    walkId: 'walk-1',
    startedAt: new Date('2026-05-24T00:00:00.000Z'),
    dogs,
    events: [
      event('dog-1', 'pee', 'event-1'),
      event('dog-1', 'poo', 'event-2'),
      event('dog-1', 'pee', 'event-3'),
      event('dog-2', 'poo', 'event-4'),
    ],
    distanceM: 1234,
    latestPoint: { lat: 35.68, lng: 139.76 },
    nowMs: 1770000000000,
  }),
).toEqual({
  isActive: true,
  syncState: 'fresh',
  walkId: 'walk-1',
  startedAtMs: Date.parse('2026-05-24T00:00:00.000Z'),
  distanceM: 1234,
  dogs: [
    { id: 'dog-1', name: 'Mugi', peeCount: 2, pooCount: 1 },
    { id: 'dog-2', name: 'Sora', peeCount: 0, pooCount: 1 },
  ],
  latestPoint: { lat: 35.68, lng: 139.76 },
  updatedAtMs: 1770000000000,
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd apps/mobile
npm test -- lib/watch/snapshot.test.ts --runInBand
```

Expected: FAIL because `syncState` is missing from the returned snapshots.

- [ ] **Step 3: Add `syncState` to the TypeScript contract**

Edit `apps/mobile/lib/watch/types.ts`:

```ts
export type WatchWalkSyncState = 'fresh' | 'stale' | 'offline';

export interface WatchCoordinate {
  lat: number;
  lng: number;
}

export interface WatchWalkSnapshotDog {
  id: string;
  name: string;
  peeCount: number;
  pooCount: number;
}

export interface WatchWalkSnapshot {
  isActive: boolean;
  syncState: WatchWalkSyncState;
  walkId: string | null;
  startedAtMs: number | null;
  distanceM: number;
  dogs: WatchWalkSnapshotDog[];
  latestPoint: WatchCoordinate | null;
  updatedAtMs: number;
}
```

Keep the existing `WatchWalkCommand` union below these declarations unchanged.

- [ ] **Step 4: Build `syncState` into every snapshot**

Edit `apps/mobile/lib/watch/snapshot.ts` so inactive and active snapshots include `syncState: 'fresh'`.

```ts
if (phase !== 'recording' || !walkId || !startedAt) {
  return {
    isActive: false,
    syncState: 'fresh',
    walkId: null,
    startedAtMs: null,
    distanceM: 0,
    dogs: [],
    latestPoint: null,
    updatedAtMs: nowMs,
  };
}
```

```ts
return {
  isActive: true,
  syncState: 'fresh',
  walkId,
  startedAtMs: startedAt.getTime(),
  distanceM,
  dogs: dogs.map((dog) => {
    const counts = countEventsByType(events, { dogId: dog.id });
    return {
      id: dog.id,
      name: dog.name,
      peeCount: counts.pee,
      pooCount: counts.poo,
    };
  }),
  latestPoint: latestPoint ?? null,
  updatedAtMs: nowMs,
};
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
cd apps/mobile
npm test -- lib/watch/snapshot.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib/watch/types.ts apps/mobile/lib/watch/snapshot.ts apps/mobile/lib/watch/snapshot.test.ts
git commit -m "refactor: add explicit watch walk sync state"
```

---

### Task 2: Split Watch Snapshot Persistence from Watch UI State

**Files:**
- Modify: `apps/mobile/targets/watch/WatchWalkModels.swift`
- Create: `apps/mobile/targets/watch/WatchWalkSnapshotStore.swift`
- Modify: `apps/mobile/targets/watch/WatchWalkStore.swift`
- Modify: `apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift`

- [ ] **Step 1: Update the Watch snapshot model**

Edit `apps/mobile/targets/watch/WatchWalkModels.swift`:

```swift
import Foundation

struct WatchCoordinate: Codable {
  let lat: Double
  let lng: Double
}

struct WatchWalkSnapshotDog: Codable, Identifiable {
  let id: String
  let name: String
  let peeCount: Int
  let pooCount: Int
}

enum WatchWalkSyncState: String, Codable {
  case fresh
  case stale
  case offline
}

struct WatchWalkSnapshot: Codable {
  let isActive: Bool
  let syncState: WatchWalkSyncState?
  let walkId: String?
  let startedAtMs: Double?
  let distanceM: Double
  let dogs: [WatchWalkSnapshotDog]
  let latestPoint: WatchCoordinate?
  let updatedAtMs: Double

  static var inactive: WatchWalkSnapshot {
    WatchWalkSnapshot(
      isActive: false,
      syncState: .fresh,
      walkId: nil,
      startedAtMs: nil,
      distanceM: 0,
      dogs: [],
      latestPoint: nil,
      updatedAtMs: Date().timeIntervalSince1970 * 1000
    )
  }

  var displaySyncState: WatchWalkSyncState {
    syncState ?? .fresh
  }

  func syncStateForDisplay(now: Date = Date()) -> WatchWalkSyncState {
    guard isActive else {
      return displaySyncState
    }

    let updatedAt = Date(timeIntervalSince1970: updatedAtMs / 1000)
    if now.timeIntervalSince(updatedAt) > 120 {
      return .stale
    }
    return displaySyncState
  }
}
```

Keep the existing `WatchEventType` and `WatchWalkCommand` definitions below this code.

- [ ] **Step 2: Create the Watch snapshot persistence store**

Create `apps/mobile/targets/watch/WatchWalkSnapshotStore.swift`:

```swift
import Foundation
import WidgetKit

enum WatchWalkSharedStore {
  static let appGroupIdentifier = "group.com.walkingdog.app"
  static let snapshotKey = "watch.walk.snapshot.v1"
  static let pendingCommandIdsKey = "watch.walk.pending_command_ids.v1"
}

final class WatchWalkSnapshotStore {
  private let defaults: UserDefaults?
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  init(defaults: UserDefaults? = UserDefaults(suiteName: WatchWalkSharedStore.appGroupIdentifier)) {
    self.defaults = defaults
  }

  func readSnapshot() -> WatchWalkSnapshot {
    guard
      let rawSnapshot = defaults?.string(forKey: WatchWalkSharedStore.snapshotKey),
      let data = rawSnapshot.data(using: .utf8),
      let snapshot = try? decoder.decode(WatchWalkSnapshot.self, from: data)
    else {
      return .inactive
    }
    return snapshot
  }

  func writeSnapshot(_ snapshot: WatchWalkSnapshot) {
    let snapshotJson =
      (try? encoder.encode(snapshot))
        .flatMap { String(data: $0, encoding: .utf8) }
    defaults?.set(snapshotJson, forKey: WatchWalkSharedStore.snapshotKey)
    WidgetCenter.shared.reloadAllTimelines()
  }

  func pendingCommandIds() -> [String] {
    defaults?.stringArray(forKey: WatchWalkSharedStore.pendingCommandIdsKey) ?? []
  }

  func writePendingCommandIds(_ ids: [String]) {
    defaults?.set(ids, forKey: WatchWalkSharedStore.pendingCommandIdsKey)
  }

  func clearPendingCommandIds() {
    writePendingCommandIds([])
  }
}
```

- [ ] **Step 3: Make `WatchWalkStore` use the persistence store**

Edit `apps/mobile/targets/watch/WatchWalkStore.swift`:

```swift
import Combine
import Foundation

protocol WatchWalkCommandSending: AnyObject {
  func send(_ command: WatchWalkCommand)
}

final class WatchWalkStore: ObservableObject {
  @Published private(set) var snapshot: WatchWalkSnapshot
  @Published private(set) var pendingCommandIds: [String]

  private let snapshotStore: WatchWalkSnapshotStore
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()
  private let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  weak var commandSender: WatchWalkCommandSending?

  init(snapshotStore: WatchWalkSnapshotStore = WatchWalkSnapshotStore()) {
    self.snapshotStore = snapshotStore
    let initialSnapshot = snapshotStore.readSnapshot()
    snapshot = initialSnapshot
    pendingCommandIds = initialSnapshot.isActive ? snapshotStore.pendingCommandIds() : []
    if !initialSnapshot.isActive {
      snapshotStore.clearPendingCommandIds()
    }
  }

  var canRecordEvent: Bool {
    snapshot.isActive && snapshot.walkId != nil && snapshot.latestPoint != nil && !snapshot.dogs.isEmpty
  }

  var syncStateForDisplay: WatchWalkSyncState {
    snapshot.syncStateForDisplay()
  }

  func record(eventType: WatchEventType, dog: WatchWalkSnapshotDog) {
    guard
      let walkId = snapshot.walkId,
      let latestPoint = snapshot.latestPoint
    else {
      return
    }

    commandSender?.send(
      WatchWalkCommand(
        id: UUID().uuidString,
        kind: "recordEvent",
        walkId: walkId,
        eventType: eventType,
        dogId: dog.id,
        occurredAt: isoDateFormatter.string(from: Date()),
        lat: latestPoint.lat,
        lng: latestPoint.lng
      )
    )
  }

  func endWalk() {
    guard let walkId = snapshot.walkId else {
      return
    }

    commandSender?.send(
      WatchWalkCommand(
        id: UUID().uuidString,
        kind: "endWalk",
        walkId: walkId,
        eventType: nil,
        dogId: nil,
        occurredAt: isoDateFormatter.string(from: Date()),
        lat: nil,
        lng: nil
      )
    )
  }

  func addPendingCommand(id: String) {
    var next = pendingCommandIds.filter { $0 != id }
    next.append(id)
    persistPendingCommandIds(next)
  }

  func acknowledgeCommand(id: String) {
    let storedIds = snapshotStore.pendingCommandIds()
    persistPendingCommandIds(storedIds.filter { $0 != id })
  }

  func applyPayload(_ payload: [String: Any]) {
    if let snapshotJson = payload["snapshotJson"] as? String {
      applySnapshotJson(snapshotJson)
    }
    if let commandId = payload["ackCommandId"] as? String {
      acknowledgeCommand(id: commandId)
    }
  }

  private func applySnapshotJson(_ snapshotJson: String) {
    guard
      let data = snapshotJson.data(using: .utf8),
      let nextSnapshot = try? decoder.decode(WatchWalkSnapshot.self, from: data)
    else {
      return
    }

    snapshotStore.writeSnapshot(nextSnapshot)
    if !nextSnapshot.isActive {
      snapshotStore.clearPendingCommandIds()
    }

    DispatchQueue.main.async {
      self.snapshot = nextSnapshot
      self.pendingCommandIds = nextSnapshot.isActive ? self.snapshotStore.pendingCommandIds() : []
    }
  }

  private func persistPendingCommandIds(_ ids: [String]) {
    snapshotStore.writePendingCommandIds(ids)
    DispatchQueue.main.async {
      self.pendingCommandIds = self.snapshotStore.pendingCommandIds()
    }
  }
}
```

- [ ] **Step 4: Update the Watch widget snapshot model**

Edit the model section in `apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift`:

```swift
private enum WatchWalkSyncState: String, Codable {
  case fresh
  case stale
  case offline
}

private struct WatchWalkSnapshot: Codable {
  let isActive: Bool
  let syncState: WatchWalkSyncState?
  let walkId: String?
  let startedAtMs: Double?
  let distanceM: Double
  let dogs: [WatchWalkSnapshotDog]
  let latestPoint: WatchCoordinate?
  let updatedAtMs: Double

  static var inactive: WatchWalkSnapshot {
    WatchWalkSnapshot(
      isActive: false,
      syncState: .fresh,
      walkId: nil,
      startedAtMs: nil,
      distanceM: 0,
      dogs: [],
      latestPoint: nil,
      updatedAtMs: Date().timeIntervalSince1970 * 1000
    )
  }

  var displaySyncState: WatchWalkSyncState {
    syncState ?? .fresh
  }
}
```

In `WatchWalkTimelineProvider.readSnapshot()`, return the decoded snapshot directly:

```swift
return snapshot
```

- [ ] **Step 5: Build the Watch app and verify the refactor compiles**

Run:

```bash
cd apps/mobile
npm run watch:sim
```

Expected: Watch app builds and launches. The UI may still fail to sync from iPhone because lifecycle-level background task handling is added in Task 3.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/targets/watch/WatchWalkModels.swift apps/mobile/targets/watch/WatchWalkSnapshotStore.swift apps/mobile/targets/watch/WatchWalkStore.swift apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift
git commit -m "refactor: split watch walk snapshot storage"
```

---

### Task 3: Move WatchConnectivity into a Lifecycle Coordinator

**Files:**
- Create: `apps/mobile/targets/watch/WatchConnectivityCoordinator.swift`
- Create: `apps/mobile/targets/watch/WalkingDogWatchRuntime.swift`
- Modify: `apps/mobile/targets/watch/WalkingDogWatchApp.swift`
- Modify: `apps/mobile/targets/watch/WatchWalkStore.swift`

- [ ] **Step 1: Create the WatchConnectivity coordinator**

Create `apps/mobile/targets/watch/WatchConnectivityCoordinator.swift`:

```swift
import Foundation
import WatchConnectivity
import WatchKit

final class WatchConnectivityCoordinator: NSObject, WCSessionDelegate, WatchWalkCommandSending {
  private weak var store: WatchWalkStore?
  private let encoder = JSONEncoder()
  private var pendingConnectivityTasks: [WKWatchConnectivityRefreshBackgroundTask] = []

  init(store: WatchWalkStore) {
    self.store = store
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else {
      return
    }

    let session = WCSession.default
    session.delegate = self
    session.activate()

    if !session.receivedApplicationContext.isEmpty {
      handlePayload(session.receivedApplicationContext)
    }
  }

  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
      switch task {
      case let connectivityTask as WKWatchConnectivityRefreshBackgroundTask:
        pendingConnectivityTasks.append(connectivityTask)
        activate()
        completePendingConnectivityTasksIfIdle()
      default:
        task.setTaskCompletedWithSnapshot(false)
      }
    }
  }

  func send(_ command: WatchWalkCommand) {
    guard
      let data = try? encoder.encode(command),
      let commandJson = String(data: data, encoding: .utf8)
    else {
      return
    }

    store?.addPendingCommand(id: command.id)

    guard WCSession.isSupported() else {
      return
    }

    let payload = ["commandJson": commandJson]
    let session = WCSession.default

    if session.activationState != .activated {
      session.activate()
    }

    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { [weak self] _ in
        self?.transferCommandPayload(payload)
      }
    } else {
      transferCommandPayload(payload)
    }
  }

  private func transferCommandPayload(_ payload: [String: String]) {
    guard WCSession.isSupported() else {
      return
    }
    WCSession.default.transferUserInfo(payload)
  }

  private func handlePayload(_ payload: [String: Any]) {
    store?.applyPayload(payload)
    completePendingConnectivityTasksIfIdle()
  }

  private func completePendingConnectivityTasksIfIdle() {
    guard WCSession.isSupported() else {
      completeAllPendingConnectivityTasks()
      return
    }

    if !WCSession.default.hasContentPending {
      completeAllPendingConnectivityTasks()
    }
  }

  private func completeAllPendingConnectivityTasks() {
    pendingConnectivityTasks.forEach { task in
      task.setTaskCompletedWithSnapshot(false)
    }
    pendingConnectivityTasks.removeAll()
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if !session.receivedApplicationContext.isEmpty {
      handlePayload(session.receivedApplicationContext)
    } else {
      completePendingConnectivityTasksIfIdle()
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    handlePayload(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handlePayload(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handlePayload(userInfo)
  }
}
```

- [ ] **Step 2: Create the Watch runtime singleton**

Create `apps/mobile/targets/watch/WalkingDogWatchRuntime.swift`:

```swift
import Foundation

final class WalkingDogWatchRuntime {
  static let shared = WalkingDogWatchRuntime()

  let store: WatchWalkStore
  let connectivity: WatchConnectivityCoordinator

  private init() {
    let snapshotStore = WatchWalkSnapshotStore()
    let store = WatchWalkStore(snapshotStore: snapshotStore)
    let connectivity = WatchConnectivityCoordinator(store: store)
    store.commandSender = connectivity
    self.store = store
    self.connectivity = connectivity
  }
}
```

- [ ] **Step 3: Wire the runtime into the Watch app lifecycle**

Replace `apps/mobile/targets/watch/WalkingDogWatchApp.swift` with:

```swift
import SwiftUI
import WatchKit

final class WatchExtensionDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    WalkingDogWatchRuntime.shared.connectivity.activate()
  }

  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    WalkingDogWatchRuntime.shared.connectivity.handle(backgroundTasks)
  }
}

@main
struct WalkingDogWatchApp: App {
  @WKApplicationDelegateAdaptor(WatchExtensionDelegate.self) private var extensionDelegate
  @StateObject private var store: WatchWalkStore

  init() {
    let runtime = WalkingDogWatchRuntime.shared
    _store = StateObject(wrappedValue: runtime.store)
    runtime.connectivity.activate()
  }

  var body: some Scene {
    WindowGroup {
      WatchWalkControlsView()
        .environmentObject(store)
    }
  }
}
```

- [ ] **Step 4: Remove old WatchConnectivity imports from `WatchWalkStore`**

Confirm `apps/mobile/targets/watch/WatchWalkStore.swift` imports only:

```swift
import Combine
import Foundation
```

Confirm there is no `WCSessionDelegate`, `WCSession.default`, `session(` delegate method, or `WatchConnectivity` import in `WatchWalkStore.swift`.

- [ ] **Step 5: Build the Watch app and verify the coordinator compiles**

Run:

```bash
cd apps/mobile
npm run watch:sim
```

Expected: Watch app builds and launches. The system log should no longer report that the app lacks background task handling when iPhone sends `ApplicationContext`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/targets/watch/WatchConnectivityCoordinator.swift apps/mobile/targets/watch/WalkingDogWatchRuntime.swift apps/mobile/targets/watch/WalkingDogWatchApp.swift apps/mobile/targets/watch/WatchWalkStore.swift
git commit -m "fix: receive watch connectivity in app lifecycle"
```

---

### Task 4: Surface Sync State in Watch UI Without Hiding Active Walks

**Files:**
- Modify: `apps/mobile/targets/watch/WatchWalkControlsView.swift`
- Modify: `apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift`

- [ ] **Step 1: Add a sync status row to active Watch UI**

In `apps/mobile/targets/watch/WatchWalkControlsView.swift`, add this view near `pendingStatus`:

```swift
@ViewBuilder
private var syncStatus: some View {
  switch store.syncStateForDisplay {
  case .fresh:
    EmptyView()
  case .stale:
    Label("Sync delayed", systemImage: "icloud.slash")
      .font(.caption2)
      .foregroundStyle(.secondary)
  case .offline:
    Label("Offline", systemImage: "wifi.slash")
      .font(.caption2)
      .foregroundStyle(.secondary)
  }
}
```

Render it in `activeWalkContent` below the GPS waiting label and above `pendingStatus`:

```swift
if store.snapshot.latestPoint == nil {
  Label("Waiting for GPS", systemImage: "location")
    .font(.caption2)
    .foregroundStyle(.secondary)
}

syncStatus
pendingStatus
```

- [ ] **Step 2: Keep inactive UI reserved for explicit inactive snapshots**

Do not change this condition:

```swift
if store.snapshot.isActive {
  activeWalkContent
} else {
  inactiveContent
}
```

Expected behavior: a stale active snapshot still shows the active walk controls, with a secondary sync warning.

- [ ] **Step 3: Add a stale marker to the complication text**

In `apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift`, add:

```swift
private var syncSuffix: String {
  entry.snapshot.displaySyncState == .stale ? " delayed" : ""
}
```

Use it in the rectangular active branch:

```swift
Text("\(formattedDistance(entry.snapshot.distanceM))\(syncSuffix)")
  .font(.caption)
  .monospacedDigit()
```

Use it in the inline active branch:

```swift
Text("\(dogSummary) \(formattedDistance(entry.snapshot.distanceM))\(syncSuffix)")
```

- [ ] **Step 4: Build the Watch app and widget**

Run:

```bash
cd apps/mobile
npm run watch:sim
```

Expected: Watch app and widget target compile. Active snapshots older than 120 seconds are no longer converted into inactive snapshots.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/targets/watch/WatchWalkControlsView.swift apps/mobile/targets/watch-widget/WalkingDogWatchWidget.swift
git commit -m "refactor: show watch sync state separately"
```

---

### Task 5: Add iPhone Bridge Publish Diagnostics

**Files:**
- Modify: `apps/mobile/modules/walking-dog-watch-bridge/ios/WalkingDogWatchBridgeModule.swift`
- Modify: `apps/mobile/modules/walking-dog-watch-bridge/src/WalkingDogWatchBridgeModule.ts`
- Modify: `apps/mobile/lib/watch/bridge.ts`

- [ ] **Step 1: Make native publish return a reason string**

In `apps/mobile/modules/walking-dog-watch-bridge/ios/WalkingDogWatchBridgeModule.swift`, change the AsyncFunction signature:

```swift
AsyncFunction("publishWalkSnapshot") { (snapshotJson: String) -> String in
  self.manager.publishWalkSnapshot(snapshotJson)
}
```

Change `publishWalkSnapshot` in `WalkingDogWatchBridgeManager`:

```swift
func publishWalkSnapshot(_ snapshotJson: String) -> String {
  queue.sync {
    defaults?.set(snapshotJson, forKey: snapshotKey)
  }
  guard WCSession.isSupported() else {
    NSLog("[WalkingDogWatchBridge] WatchConnectivity unsupported")
    return "unsupported"
  }

  let payload = ["snapshotJson": snapshotJson]
  let session = WCSession.default
  guard session.isPaired else {
    NSLog("[WalkingDogWatchBridge] Watch unavailable: paired=false")
    return "notPaired"
  }
  guard session.isWatchAppInstalled else {
    NSLog("[WalkingDogWatchBridge] Watch unavailable: appInstalled=false")
    return "watchAppNotInstalled"
  }

  do {
    try session.updateApplicationContext(payload)
    return "published"
  } catch {
    NSLog("[WalkingDogWatchBridge] Failed to update Watch application context: %@", String(describing: error))
    return "publishFailed"
  }
}
```

Keep `canPublishToWatch` for ack sending, or inline the same paired/appInstalled checks there in a separate small cleanup.

- [ ] **Step 2: Update the TypeScript native module type**

Edit `apps/mobile/modules/walking-dog-watch-bridge/src/WalkingDogWatchBridgeModule.ts`:

```ts
declare class WalkingDogWatchBridgeModule extends NativeModule<WatchBridgeEvents> {
  publishWalkSnapshot(snapshotJson: string): Promise<string>;
  getPendingCommands(): Promise<string[]>;
  ackCommand(commandId: string): Promise<void>;
}
```

- [ ] **Step 3: Log non-published results once per reason**

Edit `apps/mobile/lib/watch/bridge.ts`:

```ts
type WatchSnapshotPublishResult =
  | 'published'
  | 'unsupported'
  | 'notPaired'
  | 'watchAppNotInstalled'
  | 'publishFailed';

type WalkingDogWatchBridgeModule = {
  publishWalkSnapshot(snapshotJson: string): Promise<WatchSnapshotPublishResult | string>;
  getPendingCommands(): Promise<string[]>;
  ackCommand(commandId: string): Promise<void>;
  addListener<EventName extends keyof WatchBridgeEvents>(
    eventName: EventName,
    listener: WatchBridgeEvents[EventName],
  ): EventSubscription;
};

const warnedPublishResults = new Set<string>();

function warnOnceForPublishResult(result: string) {
  if (result === 'published' || warnedPublishResults.has(result)) return;
  warnedPublishResults.add(result);
  console.warn(`[watch.snapshot] publish skipped: ${result}`);
}

export async function publishWalkSnapshot(snapshot: WatchWalkSnapshot): Promise<void> {
  const result = await getNativeModule()?.publishWalkSnapshot(JSON.stringify(snapshot));
  if (result) warnOnceForPublishResult(result);
}
```

- [ ] **Step 4: Run TypeScript checks**

Run:

```bash
cd apps/mobile
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Build iPhone app once**

Run:

```bash
cd apps/mobile
npm run ios:clean
npm run ios:sim:local
```

Expected: iPhone app builds and launches. If the API server is not running, the app may show network errors, but native module compilation must pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/modules/walking-dog-watch-bridge/ios/WalkingDogWatchBridgeModule.swift apps/mobile/modules/walking-dog-watch-bridge/src/WalkingDogWatchBridgeModule.ts apps/mobile/lib/watch/bridge.ts
git commit -m "chore: report watch snapshot publish state"
```

---

### Task 6: Full Sync Verification

**Files:**
- No planned source changes.
- Run tests and simulator checks.

- [ ] **Step 1: Run focused JS tests**

Run:

```bash
cd apps/mobile
npm test -- lib/watch/snapshot.test.ts lib/watch/commands.test.ts hooks/use-watch-walk-command-processor.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
cd apps/mobile
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Rebuild the iPhone app**

Run:

```bash
cd apps/mobile
npm run ios:clean
npm run ios:sim:local
```

Expected: iPhone Simulator launches `com.walkingdog.app`.

- [ ] **Step 4: Rebuild the Watch app**

Run:

```bash
cd apps/mobile
npm run watch:sim
```

Expected: Watch Simulator launches `com.walkingdog.app.watch`.

- [ ] **Step 5: Start a walk on iPhone**

Use the iPhone simulator UI:

1. Open the Walk tab.
2. Select at least one dog.
3. Tap Start.
4. Wait until the iPhone recording UI shows elapsed time and distance.

Expected: iPhone stays on the recording map. No `[watch.snapshot] publish skipped` warning appears unless the Watch app is not installed or the pair is unavailable.

- [ ] **Step 6: Verify Watch App Group received the snapshot**

Find the booted Watch simulator ID:

```bash
xcrun simctl list devices | rg "Apple Watch.*Booted"
```

List Watch app info:

```bash
xcrun simctl listapps <WATCH_SIMULATOR_ID> | rg -n "com.walkingdog.app.watch|group.com.walkingdog.app"
```

Open the listed App Group plist:

```bash
plutil -p <WATCH_APP_GROUP_PATH>/Library/Preferences/group.com.walkingdog.app.plist
```

Expected: output includes `watch.walk.snapshot.v1` with `"isActive":true`, `"syncState":"fresh"`, the active `walkId`, and selected dog names.

- [ ] **Step 7: Verify Watch UI changes from inactive to active**

Look at the Watch simulator.

Expected: the screen no longer says `Start a walk on iPhone`. It shows dog names, elapsed timer, distance, event buttons, and End walk.

- [ ] **Step 8: Verify Watch command round trip**

On Watch:

1. Tap Pee for a selected dog.
2. Wait for the pending count to appear, then disappear after iPhone ack.

On iPhone:

Expected: the walk event appears in the active walk controls/timeline, and no duplicate event is created for the same command ID.

- [ ] **Step 9: Verify stale snapshot behavior**

Pause location updates or leave the app idle for more than 120 seconds while the active walk remains active.

Expected: Watch still shows the active walk UI. It may show `Sync delayed`, but it does not revert to `Start a walk on iPhone`.

- [ ] **Step 10: Commit verification notes if docs changed**

If this task reveals a new recurring developer rule, update `apps/mobile/CLAUDE.md` with a single concrete bullet and commit it:

```bash
git add apps/mobile/CLAUDE.md
git commit -m "docs: document watch connectivity verification"
```

If no docs change is needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers the requested pre-refactor by splitting Watch connectivity into persistence, UI state, and lifecycle coordinator. It then implements the ideal flow: iPhone latest snapshot, Watch lifecycle receiver, explicit sync state, command round trip, and diagnostics.
- Placeholder scan: No task contains deferred work, unspecified files, or unnamed tests.
- Type consistency: `WatchWalkSyncState`, `syncState`, `WatchWalkSnapshotStore`, `WatchConnectivityCoordinator`, `WalkingDogWatchRuntime`, and `WatchWalkCommandSending` are introduced before later tasks reference them.
- Scope check: The plan stays within Watch walk sync. It does not refactor GPS, GraphQL, Live Activity, map UI, or backend walk lifecycle.
