import SwiftUI
import WatchKit

final class WalkingDogWatchApplicationDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    WalkingDogWatchRuntime.shared.start()
  }

  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
      if let connectivityTask = task as? WKWatchConnectivityRefreshBackgroundTask {
        WalkingDogWatchRuntime.shared.connectivityCoordinator.handle(connectivityTask)
      } else {
        task.setTaskCompletedWithSnapshot(false)
      }
    }
  }
}

@main
struct WalkingDogWatchApp: App {
  @WKApplicationDelegateAdaptor(WalkingDogWatchApplicationDelegate.self) private var applicationDelegate
  @StateObject private var store: WatchWalkStore

  init() {
    let runtime = WalkingDogWatchRuntime.shared
    runtime.start()
    _store = StateObject(wrappedValue: runtime.walkStore)
  }

  var body: some Scene {
    WindowGroup {
      WatchWalkControlsView()
        .environmentObject(store)
    }
  }
}
