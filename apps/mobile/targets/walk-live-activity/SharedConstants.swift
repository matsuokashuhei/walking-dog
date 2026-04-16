import Foundation

// Resolved from the widget extension's bundle id so dev and prod builds land
// on their own App Group / keychain bucket. The extension bundle id is
// `<main-bundle>.liveactivity` — for dev that's `com.walkingdog.dev.liveactivity`,
// for prod `com.walkingdog.app.liveactivity`. Keep in sync with app.config.ts.
enum SharedConstants {
    static let keychainService = "com.walkingdog.shared"

    static var appGroup: String {
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        if bundleId.hasPrefix("com.walkingdog.dev") {
            return "group.com.walkingdog.dev"
        }
        return "group.com.walkingdog.app"
    }
}

enum SharedWalkContextKey {
    static let walkId = "walking_dog.walkId"
    static let dogId = "walking_dog.dogId"
    static let apiUrl = "walking_dog.apiUrl"
}

// Same shape as the module-side SharedWalkContext — used by AppIntents to
// learn which walk/dog/API the user's Live Activity tap should address.
struct WidgetWalkContext {
    let walkId: String
    let apiUrl: String
    let dogId: String?

    static func load() -> WidgetWalkContext? {
        guard let defaults = UserDefaults(suiteName: SharedConstants.appGroup),
              let walkId = defaults.string(forKey: SharedWalkContextKey.walkId),
              let apiUrl = defaults.string(forKey: SharedWalkContextKey.apiUrl)
        else {
            return nil
        }
        return WidgetWalkContext(
            walkId: walkId,
            apiUrl: apiUrl,
            dogId: defaults.string(forKey: SharedWalkContextKey.dogId)
        )
    }
}
