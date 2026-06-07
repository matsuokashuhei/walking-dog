import Foundation

enum WatchWalkSharedStore {
  static let appGroupIdentifier = "group.com.walkingdog.app"
  static let snapshotKey = "watch.walk.snapshot.v1"
  static let pendingCommandIdsKey = "watch.walk.pending_command_ids.v1"
}

final class WatchWalkSnapshotStore {
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()
  private let defaults: UserDefaults?

  init(defaults: UserDefaults? = UserDefaults(suiteName: WatchWalkSharedStore.appGroupIdentifier)) {
    self.defaults = defaults
  }

  func readSnapshot() -> WatchWalkSnapshot {
    guard
      let rawSnapshot = defaults?.string(forKey: WatchWalkSharedStore.snapshotKey),
      let data = rawSnapshot.data(using: .utf8)
    else {
      return .inactive
    }

    do {
      return try decoder.decode(WatchWalkSnapshot.self, from: data)
    } catch {
      NSLog("[WalkingDogWatch] Failed to decode persisted walk snapshot: %@", String(describing: error))
      return .inactive
    }
  }

  @discardableResult
  func applySnapshotJson(_ snapshotJson: String) throws -> WatchWalkSnapshot {
    let data = Data(snapshotJson.utf8)
    let snapshot = try decoder.decode(WatchWalkSnapshot.self, from: data)
    try writeSnapshot(snapshot)
    if !snapshot.isActive {
      writePendingCommandIds([])
    }
    return snapshot
  }

  func readPendingCommandIds() -> [String] {
    defaults?.stringArray(forKey: WatchWalkSharedStore.pendingCommandIdsKey) ?? []
  }

  @discardableResult
  func addPendingCommand(id: String) -> [String] {
    var next = readPendingCommandIds().filter { $0 != id }
    next.append(id)
    writePendingCommandIds(next)
    return next
  }

  @discardableResult
  func acknowledgeCommand(id: String) -> [String] {
    let next = readPendingCommandIds().filter { $0 != id }
    writePendingCommandIds(next)
    return next
  }

  private func writeSnapshot(_ snapshot: WatchWalkSnapshot) throws {
    let data = try encoder.encode(snapshot)
    defaults?.set(String(data: data, encoding: .utf8), forKey: WatchWalkSharedStore.snapshotKey)
  }

  private func writePendingCommandIds(_ ids: [String]) {
    defaults?.set(ids, forKey: WatchWalkSharedStore.pendingCommandIdsKey)
  }
}
