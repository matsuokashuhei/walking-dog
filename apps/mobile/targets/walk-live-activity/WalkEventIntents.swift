import ActivityKit
import AppIntents
import Foundation
import os

private let intentLogger = Logger(subsystem: "com.walkingdog.liveactivity", category: "AppIntent")

// Shared implementation for the pee/poo buttons. Runs entirely inside the
// widget extension with `openAppWhenRun = false`, so the device stays locked.
// On success we also nudge the Live Activity's ContentState so the user sees a
// small "last event" acknowledgement next to the timer.
@available(iOS 17.0, *)
private func performWalkEvent(kind: String) async throws {
    guard let context = WidgetWalkContext.load() else {
        intentLogger.error("No active walk context in App Group — cannot record \(kind)")
        throw WalkEventClientError.missingContext
    }
    guard let token = SharedKeychain.readAccessToken() else {
        intentLogger.error("No access token in shared keychain — cannot record \(kind)")
        throw WalkEventClientError.missingToken
    }

    do {
        try await WalkEventClient.recordEvent(kind: kind, context: context, token: token)
    } catch let clientError as WalkEventClientError {
        intentLogger.error("recordEvent failed for \(kind): \(clientError.description)")
        if let activity = Activity<WalkAttributes>.activities.first(where: { $0.attributes.walkId == context.walkId }) {
            let current = activity.content.state
            let errorState = WalkAttributes.ContentState(
                distanceM: current.distanceM,
                lastEventKind: current.lastEventKind,
                lastEventAt: current.lastEventAt,
                lastEventError: clientError.description
            )
            await activity.update(.init(state: errorState, staleDate: nil))
        }
        throw clientError
    }

    // Reflect the event in the Live Activity so the user gets visual feedback.
    if let activity = Activity<WalkAttributes>.activities.first(where: { $0.attributes.walkId == context.walkId }) {
        let current = activity.content.state
        let nextState = WalkAttributes.ContentState(
            distanceM: current.distanceM,
            lastEventKind: kind,
            lastEventAt: Date(),
            lastEventError: nil
        )
        await activity.update(.init(state: nextState, staleDate: nil))
    }
}

@available(iOS 17.0, *)
struct PeeIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Record pee"
    static var description: IntentDescription = IntentDescription("Record a pee event for the current walk")

    func perform() async throws -> some IntentResult {
        try await performWalkEvent(kind: "pee")
        return .result()
    }
}

@available(iOS 17.0, *)
struct PooIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Record poo"
    static var description: IntentDescription = IntentDescription("Record a poo event for the current walk")

    func perform() async throws -> some IntentResult {
        try await performWalkEvent(kind: "poo")
        return .result()
    }
}
