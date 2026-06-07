import Foundation
import SwiftUI
import WidgetKit

private enum WatchWalkSharedStore {
  static let appGroupIdentifier = "group.com.walkingdog.app"
  static let snapshotKey = "watch.walk.snapshot.v1"
}

private struct WatchCoordinate: Codable {
  let lat: Double
  let lng: Double
}

private struct WatchWalkSnapshotDog: Codable, Identifiable {
  let id: String
  let name: String
  let peeCount: Int
  let pooCount: Int
}

private enum WatchWalkSyncState: String, Codable {
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
      return "figure.walk"
    case .stale:
      return "clock"
    case .offline:
      return "wifi.slash"
    }
  }
}

private struct WatchWalkSnapshot: Codable {
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

private struct WatchWalkEntry: TimelineEntry {
  let date: Date
  let snapshot: WatchWalkSnapshot
}

private struct WatchWalkTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchWalkEntry {
    WatchWalkEntry(date: Date(), snapshot: .inactive)
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchWalkEntry) -> Void) {
    completion(WatchWalkEntry(date: Date(), snapshot: readSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WatchWalkEntry>) -> Void) {
    let entry = WatchWalkEntry(date: Date(), snapshot: readSnapshot())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60))))
  }

  private func readSnapshot() -> WatchWalkSnapshot {
    guard
      let rawSnapshot = UserDefaults(suiteName: WatchWalkSharedStore.appGroupIdentifier)?
        .string(forKey: WatchWalkSharedStore.snapshotKey),
      let data = rawSnapshot.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(WatchWalkSnapshot.self, from: data)
    else {
      return .inactive
    }
    return snapshot
  }
}

private struct WalkingDogComplicationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: WatchWalkEntry

  var body: some View {
    switch family {
    case .accessoryCircular:
      circularView
    case .accessoryRectangular:
      rectangularView
    case .accessoryInline:
      inlineView
    default:
      rectangularView
    }
  }

  private var circularView: some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 2) {
        Image(systemName: entry.snapshot.isActive ? "figure.walk" : "pawprint")
          .font(.caption)
        Text(entry.snapshot.isActive ? compactDistance(entry.snapshot.distanceM) : "No")
          .font(.caption2)
          .minimumScaleFactor(0.7)
          .monospacedDigit()
      }
    }
  }

  private var rectangularView: some View {
    VStack(alignment: .leading, spacing: 2) {
      if entry.snapshot.isActive {
        Text(dogSummary)
          .font(.headline)
          .lineLimit(1)
        if entry.snapshot.syncStateForDisplay() != .fresh {
          Label(
            entry.snapshot.syncStateForDisplay().title,
            systemImage: entry.snapshot.syncStateForDisplay().systemImage
          )
          .font(.caption2)
          .foregroundStyle(.secondary)
        }
        HStack(spacing: 6) {
          if let startedAtMs = entry.snapshot.startedAtMs {
            Text(Date(timeIntervalSince1970: startedAtMs / 1000), style: .timer)
              .monospacedDigit()
          }
          Text(formattedDistance(entry.snapshot.distanceM))
            .monospacedDigit()
        }
        .font(.caption2)
      } else {
        Text("No active walk")
          .font(.headline)
        Text("Tap to open")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var inlineView: some View {
    if entry.snapshot.isActive {
      if entry.snapshot.syncStateForDisplay() == .fresh {
        Text("Walking \(compactDistance(entry.snapshot.distanceM))")
      } else {
        Text("\(entry.snapshot.syncStateForDisplay().title) \(compactDistance(entry.snapshot.distanceM))")
      }
    } else {
      Text("Walking Dog")
    }
  }

  private var dogSummary: String {
    guard !entry.snapshot.dogs.isEmpty else {
      return "Walking"
    }

    let names = entry.snapshot.dogs.prefix(2).map(\.name).joined(separator: ", ")
    if entry.snapshot.dogs.count > 2 {
      return "\(names) +\(entry.snapshot.dogs.count - 2)"
    }
    return names
  }

  private func formattedDistance(_ meters: Double) -> String {
    if meters >= 1000 {
      return String(format: "%.1f km", meters / 1000)
    }
    return String(format: "%.0f m", meters)
  }

  private func compactDistance(_ meters: Double) -> String {
    if meters >= 1000 {
      return String(format: "%.1fk", meters / 1000)
    }
    return String(format: "%.0fm", meters)
  }
}

private struct WalkingDogComplication: Widget {
  let kind = "WalkingDogComplication"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchWalkTimelineProvider()) { entry in
      WalkingDogComplicationView(entry: entry)
        .widgetURL(URL(string: "walking-dog://watch"))
    }
    .configurationDisplayName("Walking Dog")
    .description("Open walk controls and see the current walk.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct WalkingDogWatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    WalkingDogComplication()
  }
}
