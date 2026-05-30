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

    AsyncFunction("publishWalkSnapshot") { (snapshotJson: String) in
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

  private override init() {
    super.init()
    activateSession()
  }

  func setEventSink(_ sink: @escaping (String) -> Void) {
    eventSink = sink
  }

  func publishWalkSnapshot(_ snapshotJson: String) {
    queue.sync {
      defaults?.set(snapshotJson, forKey: snapshotKey)
    }
    guard WCSession.isSupported() else {
      return
    }

    let payload = ["snapshotJson": snapshotJson]
    let session = WCSession.default
    do {
      try session.updateApplicationContext(payload)
    } catch {
      NSLog("[WalkingDogWatchBridge] Failed to update Watch application context: %@", String(describing: error))
    }
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

  private func sendAckCommand(id commandId: String) {
    let payload = ["ackCommandId": commandId]
    let session = WCSession.default

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
  ) {}

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
