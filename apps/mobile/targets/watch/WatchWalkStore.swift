import Foundation

final class WatchWalkStore: ObservableObject {
  @Published private(set) var snapshot = WatchWalkSnapshot.inactive
  @Published private(set) var pendingCommandIds: [String] = []

  private let snapshotStore: WatchWalkSnapshotStore
  private let commandSender: WatchWalkCommandSending
  private let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  init(snapshotStore: WatchWalkSnapshotStore, commandSender: WatchWalkCommandSending) {
    self.snapshotStore = snapshotStore
    self.commandSender = commandSender
    snapshot = snapshotStore.readSnapshot()
    pendingCommandIds = snapshot.isActive ? snapshotStore.readPendingCommandIds() : []
  }

  var canRecordEvent: Bool {
    snapshot.canRecordEvent && snapshot.walkId != nil && !snapshot.dogs.isEmpty
  }

  var syncState: WatchWalkSyncState {
    snapshot.syncStateForDisplay()
  }

  func reloadFromPersistence() {
    let nextSnapshot = snapshotStore.readSnapshot()
    let nextPendingCommandIds = nextSnapshot.isActive ? snapshotStore.readPendingCommandIds() : []

    DispatchQueue.main.async {
      self.snapshot = nextSnapshot
      self.pendingCommandIds = nextPendingCommandIds
    }
  }

  func record(eventType: WatchEventType, dog: WatchWalkSnapshotDog) {
    guard
      let walkId = snapshot.walkId,
      let latestPoint = snapshot.latestPoint
    else {
      return
    }

    commandSender.send(
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

    commandSender.send(
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
}
