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

struct WatchWalkSnapshot: Codable {
  let isActive: Bool
  let walkId: String?
  let startedAtMs: Double?
  let distanceM: Double
  let dogs: [WatchWalkSnapshotDog]
  let latestPoint: WatchCoordinate?
  let updatedAtMs: Double

  static var inactive: WatchWalkSnapshot {
    WatchWalkSnapshot(
      isActive: false,
      walkId: nil,
      startedAtMs: nil,
      distanceM: 0,
      dogs: [],
      latestPoint: nil,
      updatedAtMs: Date().timeIntervalSince1970 * 1000
    )
  }

  var normalizedForDisplay: WatchWalkSnapshot {
    guard isActive else {
      return self
    }

    let updatedAt = Date(timeIntervalSince1970: updatedAtMs / 1000)
    if Date().timeIntervalSince(updatedAt) > 120 {
      return .inactive
    }
    return self
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

  var symbolName: String {
    switch self {
    case .pee:
      return "drop.fill"
    case .poo:
      return "pawprint.fill"
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
