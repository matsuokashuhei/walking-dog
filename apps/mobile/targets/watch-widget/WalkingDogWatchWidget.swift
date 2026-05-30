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

private struct WatchWalkSnapshot: Codable {
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
    return snapshot.normalizedForDisplay
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
      Text("Walking \(compactDistance(entry.snapshot.distanceM))")
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
