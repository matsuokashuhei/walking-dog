import SwiftUI

struct WatchWalkControlsView: View {
  @EnvironmentObject private var store: WatchWalkStore
  @State private var dogPickerEventType: WatchEventType?

  var body: some View {
    NavigationStack {
      Group {
        if store.snapshot.isActive {
          activeWalkContent
        } else {
          inactiveContent
        }
      }
      .navigationTitle("Walk")
      .navigationDestination(item: $dogPickerEventType) { eventType in
        WatchDogPickerView(eventType: eventType)
          .environmentObject(store)
      }
    }
  }

  private var inactiveContent: some View {
    VStack(spacing: 10) {
      Image(systemName: "figure.walk")
        .font(.title2)
        .foregroundStyle(.secondary)
      Text("Start a walk on iPhone")
        .font(.headline)
        .multilineTextAlignment(.center)
      pendingStatus
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  private var activeWalkContent: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 10) {
        WatchWalkHeader(snapshot: store.snapshot)
        syncStatus

        Button {
          handleEventTap(.pee)
        } label: {
          Label {
            Text("Pee")
          } icon: {
            Text(WatchEventType.pee.emoji)
          }
            .frame(maxWidth: .infinity)
        }
        .disabled(!store.canRecordEvent)

        Button {
          handleEventTap(.poo)
        } label: {
          Label {
            Text("Poop")
          } icon: {
            Text(WatchEventType.poo.emoji)
          }
            .frame(maxWidth: .infinity)
        }
        .disabled(!store.canRecordEvent)

        Button(role: .destructive) {
          store.endWalk()
        } label: {
          Label("End walk", systemImage: "stop.fill")
            .frame(maxWidth: .infinity)
        }
        .disabled(store.snapshot.walkId == nil)

        if store.snapshot.latestPoint == nil {
          Label("Waiting for GPS", systemImage: "location")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }

        pendingStatus
      }
      .buttonStyle(.borderedProminent)
      .padding(.horizontal, 4)
    }
  }

  @ViewBuilder
  private var pendingStatus: some View {
    if !store.pendingCommandIds.isEmpty {
      Label("\(store.pendingCommandIds.count) pending", systemImage: "clock")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }

  @ViewBuilder
  private var syncStatus: some View {
    if store.syncState != .fresh {
      Label(store.syncState.title, systemImage: store.syncState.systemImage)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }

  private func handleEventTap(_ eventType: WatchEventType) {
    if store.snapshot.dogs.count == 1, let dog = store.snapshot.dogs.first {
      store.record(eventType: eventType, dog: dog)
    } else {
      dogPickerEventType = eventType
    }
  }
}

private struct WatchWalkHeader: View {
  let snapshot: WatchWalkSnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(dogSummary)
        .font(.headline)
        .lineLimit(2)

      HStack(spacing: 8) {
        if let startedAtMs = snapshot.startedAtMs {
          Text(Date(timeIntervalSince1970: startedAtMs / 1000), style: .timer)
            .monospacedDigit()
        }
        Text(formattedDistance(snapshot.distanceM))
          .monospacedDigit()
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var dogSummary: String {
    guard !snapshot.dogs.isEmpty else {
      return "Walking"
    }

    let names = snapshot.dogs.prefix(2).map(\.name).joined(separator: ", ")
    if snapshot.dogs.count > 2 {
      return "\(names) +\(snapshot.dogs.count - 2)"
    }
    return names
  }

  private func formattedDistance(_ meters: Double) -> String {
    if meters >= 1000 {
      return String(format: "%.1f km", meters / 1000)
    }
    return String(format: "%.0f m", meters)
  }
}

private struct WatchDogPickerView: View {
  @EnvironmentObject private var store: WatchWalkStore
  @Environment(\.dismiss) private var dismiss

  let eventType: WatchEventType

  var body: some View {
    List(store.snapshot.dogs) { dog in
      Button {
        store.record(eventType: eventType, dog: dog)
        dismiss()
      } label: {
        HStack {
          Text(eventType.emoji)
          VStack(alignment: .leading) {
            Text(dog.name)
            Text("Pee \(dog.peeCount) / Poop \(dog.pooCount)")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      }
      .disabled(!store.canRecordEvent)
    }
    .navigationTitle(eventType.title)
  }
}
