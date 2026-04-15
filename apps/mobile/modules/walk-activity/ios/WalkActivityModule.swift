import ActivityKit
import ExpoModulesCore
import Foundation

public class WalkActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WalkActivity")

        Function("isSupported") { () -> Bool in
            if #available(iOS 17.0, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        AsyncFunction("startActivity") { (input: [String: Any], promise: Promise) in
            guard #available(iOS 17.0, *) else {
                promise.reject("UNSUPPORTED_OS", "Live Activities require iOS 17.0+")
                return
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                promise.reject("ACTIVITIES_DISABLED", "Live Activities disabled in Settings")
                return
            }
            guard
                let walkId = input["walkId"] as? String,
                let dogName = input["dogName"] as? String,
                let startedAtMs = input["startedAtMs"] as? Double,
                let distanceM = input["distanceM"] as? Double
            else {
                promise.reject("INVALID_INPUT", "Missing required fields")
                return
            }

            let attributes = WalkAttributes(
                walkId: walkId,
                dogName: dogName,
                startedAt: Date(timeIntervalSince1970: startedAtMs / 1000.0)
            )
            let state = WalkAttributes.ContentState(distanceM: distanceM)

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                promise.resolve(activity.id)
            } catch {
                promise.reject("ACTIVITY_REQUEST_FAILED", error.localizedDescription)
            }
        }

        AsyncFunction("updateActivity") {
            (activityId: String, input: [String: Any], promise: Promise) in
            guard #available(iOS 17.0, *) else {
                promise.resolve(nil)
                return
            }
            guard let activity = Activity<WalkAttributes>.activities.first(where: { $0.id == activityId }) else {
                promise.reject("ACTIVITY_NOT_FOUND", "No live activity with id \(activityId)")
                return
            }

            let distanceM = input["distanceM"] as? Double ?? activity.content.state.distanceM
            let lastEventKind = input["lastEventKind"] as? String
            let lastEventAt: Date? = {
                if let ms = input["lastEventAtMs"] as? Double {
                    return Date(timeIntervalSince1970: ms / 1000.0)
                }
                return nil
            }()

            let newState = WalkAttributes.ContentState(
                distanceM: distanceM,
                lastEventKind: lastEventKind,
                lastEventAt: lastEventAt
            )

            Task {
                await activity.update(.init(state: newState, staleDate: nil))
                promise.resolve(nil)
            }
        }

        AsyncFunction("endActivity") { (activityId: String, promise: Promise) in
            guard #available(iOS 17.0, *) else {
                promise.resolve(nil)
                return
            }
            guard let activity = Activity<WalkAttributes>.activities.first(where: { $0.id == activityId }) else {
                promise.resolve(nil)
                return
            }

            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
                promise.resolve(nil)
            }
        }
    }
}
