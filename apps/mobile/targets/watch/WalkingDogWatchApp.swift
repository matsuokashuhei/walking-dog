import SwiftUI

@main
struct WalkingDogWatchApp: App {
  @StateObject private var store = WatchWalkStore()

  var body: some Scene {
    WindowGroup {
      WatchWalkControlsView()
        .environmentObject(store)
    }
  }
}
