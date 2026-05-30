import Combine
import Foundation
import WatchConnectivity
import WidgetKit

private enum WatchWalkSharedStore {
  static let appGroupIdentifier = "group.com.walkingdog.app"
  static let snapshotKey = "watch.walk.snapshot.v1"
  static let pendingCommandIdsKey = "watch.walk.pending_command_ids.v1"
}

final class WatchWalkStore: NSObject, ObservableObject, WCSessionDelegate {
  @Published private(set) var snapshot = WatchWalkSnapshot.inactive
  @Published private(set) var pendingCommandIds: [String] = []

  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()
  private let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private var defaults: UserDefaults? {
    UserDefaults(suiteName: WatchWalkSharedStore.appGroupIdentifier)
  }

  override init() {
    super.init()
    snapshot = readSnapshot()
    if snapshot.isActive {
      pendingCommandIds = defaults?.stringArray(forKey: WatchWalkSharedStore.pendingCommandIdsKey) ?? []
    } else {
      defaults?.set([], forKey: WatchWalkSharedStore.pendingCommandIdsKey)
      pendingCommandIds = []
    }
    activateSession()
  }

  var canRecordEvent: Bool {
    snapshot.isActive && snapshot.walkId != nil && snapshot.latestPoint != nil && !snapshot.dogs.isEmpty
  }

  func record(eventType: WatchEventType, dog: WatchWalkSnapshotDog) {
    guard
      let walkId = snapshot.walkId,
      let latestPoint = snapshot.latestPoint
    else {
      return
    }

    send(
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

    send(
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

  private func readSnapshot() -> WatchWalkSnapshot {
    guard
      let rawSnapshot = defaults?.string(forKey: WatchWalkSharedStore.snapshotKey),
      let data = rawSnapshot.data(using: .utf8),
      let snapshot = try? decoder.decode(WatchWalkSnapshot.self, from: data)
    else {
      return .inactive
    }
    return snapshot.normalizedForDisplay
  }

  private func activateSession() {
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

  private func send(_ command: WatchWalkCommand) {
    guard
      let data = try? encoder.encode(command),
      let commandJson = String(data: data, encoding: .utf8)
    else {
      return
    }

    addPendingCommand(id: command.id)

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

  private func addPendingCommand(id: String) {
    var next = pendingCommandIds.filter { $0 != id }
    next.append(id)
    persistPendingCommandIds(next)
  }

  private func acknowledgeCommand(id: String) {
    let storedIds = defaults?.stringArray(forKey: WatchWalkSharedStore.pendingCommandIdsKey) ?? pendingCommandIds
    persistPendingCommandIds(storedIds.filter { $0 != id })
  }

  private func persistPendingCommandIds(_ ids: [String]) {
    defaults?.set(ids, forKey: WatchWalkSharedStore.pendingCommandIdsKey)
    DispatchQueue.main.async {
      self.pendingCommandIds = self.defaults?.stringArray(forKey: WatchWalkSharedStore.pendingCommandIdsKey) ?? ids
    }
  }

  private func applySnapshotJson(_ snapshotJson: String) {
    guard
      let data = snapshotJson.data(using: .utf8),
      let snapshot = try? decoder.decode(WatchWalkSnapshot.self, from: data)
    else {
      return
    }

    let displaySnapshot = snapshot.normalizedForDisplay
    let storedSnapshotJson =
      (try? encoder.encode(displaySnapshot))
        .flatMap { String(data: $0, encoding: .utf8) } ?? snapshotJson

    defaults?.set(storedSnapshotJson, forKey: WatchWalkSharedStore.snapshotKey)
    if !displaySnapshot.isActive {
      persistPendingCommandIds([])
    }

    DispatchQueue.main.async {
      self.snapshot = displaySnapshot
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  private func handlePayload(_ payload: [String: Any]) {
    if let snapshotJson = payload["snapshotJson"] as? String {
      applySnapshotJson(snapshotJson)
    }
    if let commandId = payload["ackCommandId"] as? String {
      acknowledgeCommand(id: commandId)
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    handlePayload(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handlePayload(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    handlePayload(userInfo)
  }
}
