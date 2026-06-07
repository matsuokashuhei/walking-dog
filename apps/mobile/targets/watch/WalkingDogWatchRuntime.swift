import Foundation

final class WalkingDogWatchRuntime {
  static let shared = WalkingDogWatchRuntime()

  let connectivityCoordinator: WatchConnectivityCoordinator
  let walkStore: WatchWalkStore

  private init() {
    let snapshotStore = WatchWalkSnapshotStore()
    let connectivityCoordinator = WatchConnectivityCoordinator(snapshotStore: snapshotStore)
    let walkStore = WatchWalkStore(snapshotStore: snapshotStore, commandSender: connectivityCoordinator)

    self.connectivityCoordinator = connectivityCoordinator
    self.walkStore = walkStore

    connectivityCoordinator.onSnapshotStoreChanged = { [weak walkStore] in
      walkStore?.reloadFromPersistence()
    }
  }

  func start() {
    connectivityCoordinator.start()
    walkStore.reloadFromPersistence()
  }
}
