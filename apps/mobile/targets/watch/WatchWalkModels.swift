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

  var title: String {
    switch self {
    case .fresh:
      return "Live"
    case .stale:
      return "Sync delayed"
    case .offline:
      return "Offline"
    }
  }

  var systemImage: String {
    switch self {
    case .fresh:
      return "dot.radiowaves.left.and.right"
    case .stale:
      return "clock"
    case .offline:
      return "wifi.slash"
    }
  }
}

struct WatchWalkSnapshot: Codable {
  let isActive: Bool
  let syncState: WatchWalkSyncState
  let walkId: String?
  let startedAtMs: Double?
  let distanceM: Double
  let dogs: [WatchWalkSnapshotDog]
  let latestPoint: WatchCoordinate?
  let updatedAtMs: Double

  init(
    isActive: Bool,
    syncState: WatchWalkSyncState = .fresh,
    walkId: String?,
    startedAtMs: Double?,
    distanceM: Double,
    dogs: [WatchWalkSnapshotDog],
    latestPoint: WatchCoordinate?,
    updatedAtMs: Double
  ) {
    self.isActive = isActive
    self.syncState = syncState
    self.walkId = walkId
    self.startedAtMs = startedAtMs
    self.distanceM = distanceM
    self.dogs = dogs
    self.latestPoint = latestPoint
    self.updatedAtMs = updatedAtMs
  }

  enum CodingKeys: String, CodingKey {
    case isActive
    case syncState
    case walkId
    case startedAtMs
    case distanceM
    case dogs
    case latestPoint
    case updatedAtMs
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    isActive = try container.decode(Bool.self, forKey: .isActive)
    syncState = try container.decodeIfPresent(WatchWalkSyncState.self, forKey: .syncState) ?? .fresh
    walkId = try container.decodeIfPresent(String.self, forKey: .walkId)
    startedAtMs = try container.decodeIfPresent(Double.self, forKey: .startedAtMs)
    distanceM = try container.decode(Double.self, forKey: .distanceM)
    dogs = try container.decode([WatchWalkSnapshotDog].self, forKey: .dogs)
    latestPoint = try container.decodeIfPresent(WatchCoordinate.self, forKey: .latestPoint)
    updatedAtMs = try container.decode(Double.self, forKey: .updatedAtMs)
  }

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

  var canRecordEvent: Bool {
    isActive && latestPoint != nil
  }

  func syncStateForDisplay(
    now: Date = Date(),
    staleAfter: TimeInterval = 120,
    offlineAfter: TimeInterval = 600
  ) -> WatchWalkSyncState {
    guard isActive else {
      return syncState
    }

    let updatedAt = Date(timeIntervalSince1970: updatedAtMs / 1000)
    let age = now.timeIntervalSince(updatedAt)
    if age > offlineAfter {
      return .offline
    }
    if age > staleAfter {
      return .stale
    }
    return syncState
  }
}

enum WatchEventType: String, Codable, Identifiable {
  case pee
  case poo

  var id: String { rawValue }

  var title: String {
    switch self {
    case .pee:
      return "Pee"
    case .poo:
      return "Poop"
    }
  }

  var emoji: String {
    switch self {
    case .pee:
      return "💧"
    case .poo:
      return "💩"
    }
  }
}

struct WatchWalkCommand: Codable {
  let id: String
  let kind: String
  let walkId: String
  let eventType: WatchEventType?
  let dogId: String?
  let occurredAt: String
  let lat: Double?
  let lng: Double?
}
