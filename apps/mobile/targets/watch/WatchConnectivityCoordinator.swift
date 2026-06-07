import Foundation
import WatchConnectivity
import WatchKit
import WidgetKit

protocol WatchWalkCommandSending: AnyObject {
  func send(_ command: WatchWalkCommand)
}

final class WatchConnectivityCoordinator: NSObject, WatchWalkCommandSending, WCSessionDelegate {
  var onSnapshotStoreChanged: (() -> Void)?

  private let snapshotStore: WatchWalkSnapshotStore
  private let encoder = JSONEncoder()
  private var backgroundTasks: [WKWatchConnectivityRefreshBackgroundTask] = []

  init(snapshotStore: WatchWalkSnapshotStore) {
    self.snapshotStore = snapshotStore
    super.init()
  }

  func start() {
    guard WCSession.isSupported() else {
      completeBackgroundTasks()
      return
    }

    let session = WCSession.default
    session.delegate = self

    if session.activationState == .activated {
      applyReceivedApplicationContext(from: session)
      completeBackgroundTasks()
    } else {
      session.activate()
    }
  }

  func handle(_ task: WKWatchConnectivityRefreshBackgroundTask) {
    backgroundTasks.append(task)
    start()
  }

  func send(_ command: WatchWalkCommand) {
    guard
      let data = try? encoder.encode(command),
      let commandJson = String(data: data, encoding: .utf8)
    else {
      NSLog("[WalkingDogWatch] Failed to encode Watch walk command %@", command.id)
      return
    }

    snapshotStore.addPendingCommand(id: command.id)
    notifySnapshotStoreChanged()

    guard WCSession.isSupported() else {
      return
    }

    let payload = ["commandJson": commandJson]
    let session = WCSession.default
    session.delegate = self

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

  private func applyReceivedApplicationContext(from session: WCSession) {
    guard !session.receivedApplicationContext.isEmpty else {
      return
    }
    handlePayload(session.receivedApplicationContext)
  }

  private func handlePayload(_ payload: [String: Any]) {
    var didChange = false

    if let snapshotJson = payload["snapshotJson"] as? String {
      do {
        try snapshotStore.applySnapshotJson(snapshotJson)
        WidgetCenter.shared.reloadAllTimelines()
        didChange = true
      } catch {
        NSLog("[WalkingDogWatch] Failed to decode walk snapshot: %@", String(describing: error))
      }
    }

    if let commandId = payload["ackCommandId"] as? String {
      snapshotStore.acknowledgeCommand(id: commandId)
      didChange = true
    }

    if didChange {
      notifySnapshotStoreChanged()
    }
    completeBackgroundTasks()
  }

  private func notifySnapshotStoreChanged() {
    DispatchQueue.main.async {
      self.onSnapshotStoreChanged?()
    }
  }

  private func completeBackgroundTasks() {
    let tasks = backgroundTasks
    backgroundTasks = []
    tasks.forEach { $0.setTaskCompletedWithSnapshot(false) }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      NSLog("[WalkingDogWatch] WCSession activation failed: %@", String(describing: error))
      completeBackgroundTasks()
      return
    }

    guard activationState == .activated else {
      completeBackgroundTasks()
      return
    }

    applyReceivedApplicationContext(from: session)
    completeBackgroundTasks()
  }

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
