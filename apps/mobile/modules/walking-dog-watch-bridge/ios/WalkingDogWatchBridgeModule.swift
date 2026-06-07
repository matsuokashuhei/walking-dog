import ExpoModulesCore
import WatchConnectivity

public class WalkingDogWatchBridgeModule: Module {
  private let manager = WalkingDogWatchBridgeManager.shared

  public func definition() -> ModuleDefinition {
    Name("WalkingDogWatchBridge")

    Events("onWatchWalkCommand")

    OnCreate {
      self.manager.setEventSink { [weak self] commandJson in
        self?.sendEvent("onWatchWalkCommand", ["commandJson": commandJson])
      }
    }

    AsyncFunction("publishWalkSnapshot") { (snapshotJson: String) -> [String: Any] in
      self.manager.publishWalkSnapshot(snapshotJson)
    }

    AsyncFunction("getPendingCommands") { () -> [String] in
      self.manager.pendingCommands()
    }

    AsyncFunction("ackCommand") { (commandId: String) in
      self.manager.ackCommand(commandId)
    }
  }
}

private final class WalkingDogWatchBridgeManager: NSObject, WCSessionDelegate {
  static let shared = WalkingDogWatchBridgeManager()

  private let appGroupIdentifier = "group.com.walkingdog.app"
  private let snapshotKey = "watch.walk.snapshot.v1"
  private let pendingCommandsKey = "watch.walk.pending_commands.v1"
  private let queue = DispatchQueue(label: "com.walkingdog.watch-bridge")
  private var eventSink: ((String) -> Void)?
  private var latestSnapshotJson: String?

  private override init() {
    super.init()
    activateSession()
  }

  func setEventSink(_ sink: @escaping (String) -> Void) {
    eventSink = sink
  }

  func publishWalkSnapshot(_ snapshotJson: String) -> [String: Any] {
    let storedInAppGroup = queue.sync {
      latestSnapshotJson = snapshotJson
      defaults?.set(snapshotJson, forKey: snapshotKey)
      return defaults != nil
    }

    guard WCSession.isSupported() else {
      return publishResult(
        storedInAppGroup: storedInAppGroup,
        watchConnectivitySupported: false,
        failureReason: "watch_connectivity_unsupported"
      )
    }

    let session = WCSession.default
    session.delegate = self

    if session.activationState != .activated {
      session.activate()
    }

    return publishSnapshotPayload(snapshotJson, storedInAppGroup: storedInAppGroup, session: session)
  }

  private func publishSnapshotPayload(
    _ snapshotJson: String,
    storedInAppGroup: Bool,
    session: WCSession
  ) -> [String: Any] {
    var result = publishResult(
      storedInAppGroup: storedInAppGroup,
      watchConnectivitySupported: true,
      session: session
    )

    guard session.isPaired else {
      result["failureReason"] = "watch_not_paired"
      return result
    }
    guard session.isWatchAppInstalled else {
      result["failureReason"] = "watch_app_not_installed"
      return result
    }
    guard session.activationState == .activated else {
      result["activationRequested"] = true
      result["failureReason"] = "session_not_activated"
      return result
    }

    let payload = ["snapshotJson": snapshotJson]
    do {
      try session.updateApplicationContext(payload)
      result["applicationContextUpdated"] = true
    } catch {
      result["failureReason"] = "update_application_context_failed"
      result["errorDescription"] = String(describing: error)
      NSLog("[WalkingDogWatchBridge] Failed to update Watch application context: %@", String(describing: error))
    }

    if session.isReachable {
      result["immediateMessageAttempted"] = true
      session.sendMessage(payload, replyHandler: nil) { error in
        NSLog("[WalkingDogWatchBridge] Failed to send immediate Watch snapshot message: %@", String(describing: error))
      }
    }

    return result
  }

  func pendingCommands() -> [String] {
    queue.sync {
      readPendingCommands()
    }
  }

  func ackCommand(_ commandId: String) {
    queue.sync {
      let remaining = readPendingCommands().filter { commandJson in
        commandIdFromCommandJson(commandJson) != commandId
      }
      writePendingCommands(remaining)
    }

    if WCSession.isSupported() {
      sendAckCommand(id: commandId)
    }
  }

  private var defaults: UserDefaults? {
    UserDefaults(suiteName: appGroupIdentifier)
  }

  private func activateSession() {
    guard WCSession.isSupported() else {
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  private func enqueueCommand(_ commandJson: String) {
    queue.sync {
      var commands = readPendingCommands()
      let commandId = commandIdFromCommandJson(commandJson)
      if let commandId {
        commands.removeAll { commandIdFromCommandJson($0) == commandId }
      }
      commands.append(commandJson)
      writePendingCommands(commands)
    }

    DispatchQueue.main.async {
      self.eventSink?(commandJson)
    }
  }

  private func readPendingCommands() -> [String] {
    defaults?.stringArray(forKey: pendingCommandsKey) ?? []
  }

  private func writePendingCommands(_ commands: [String]) {
    defaults?.set(commands, forKey: pendingCommandsKey)
  }

  private func commandIdFromCommandJson(_ commandJson: String) -> String? {
    guard
      let data = commandJson.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return nil
    }
    return object["id"] as? String
  }

  private func commandJson(from message: [String: Any]) -> String? {
    if let commandJson = message["commandJson"] as? String {
      return commandJson
    }
    guard JSONSerialization.isValidJSONObject(message),
          let data = try? JSONSerialization.data(withJSONObject: message),
          let json = String(data: data, encoding: .utf8)
    else {
      return nil
    }
    return json
  }

  private func canPublishToWatch(_ session: WCSession) -> Bool {
    session.isPaired && session.isWatchAppInstalled
  }

  private func publishResult(
    storedInAppGroup: Bool,
    watchConnectivitySupported: Bool,
    failureReason: String? = nil,
    session: WCSession? = nil
  ) -> [String: Any] {
    var result: [String: Any] = [
      "storedInAppGroup": storedInAppGroup,
      "watchConnectivitySupported": watchConnectivitySupported,
      "paired": session?.isPaired ?? false,
      "watchAppInstalled": session?.isWatchAppInstalled ?? false,
      "activationState": session.map { activationStateName($0.activationState) } ?? "unsupported",
      "reachable": session?.isReachable ?? false,
      "activationRequested": false,
      "applicationContextUpdated": false,
      "immediateMessageAttempted": false,
    ]
    if let failureReason {
      result["failureReason"] = failureReason
    }
    return result
  }

  private func activationStateName(_ activationState: WCSessionActivationState) -> String {
    switch activationState {
    case .notActivated:
      return "notActivated"
    case .inactive:
      return "inactive"
    case .activated:
      return "activated"
    @unknown default:
      return "unknown"
    }
  }

  private func sendAckCommand(id commandId: String) {
    let payload = ["ackCommandId": commandId]
    let session = WCSession.default
    guard canPublishToWatch(session) else {
      return
    }

    if session.activationState != .activated {
      session.activate()
    }

    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { _ in
        session.transferUserInfo(payload)
      }
    } else {
      session.transferUserInfo(payload)
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      NSLog("[WalkingDogWatchBridge] WCSession activation failed: %@", String(describing: error))
      return
    }

    guard activationState == .activated else {
      return
    }

    let snapshotJson = queue.sync {
      latestSnapshotJson ?? defaults?.string(forKey: snapshotKey)
    }
    guard let snapshotJson else {
      return
    }

    let result = publishSnapshotPayload(snapshotJson, storedInAppGroup: true, session: session)
    if let failureReason = result["failureReason"] as? String {
      NSLog("[WalkingDogWatchBridge] Deferred Watch snapshot publish failed: %@", failureReason)
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    guard let commandJson = commandJson(from: message) else {
      return
    }
    enqueueCommand(commandJson)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    guard let commandJson = commandJson(from: userInfo) else {
      return
    }
    enqueueCommand(commandJson)
  }
}
