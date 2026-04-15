import Foundation

// Keys used in App Group UserDefaults. The Widget Extension reads the same
// keys to know which walk / dog / API endpoint a Lock Screen AppIntent should
// address. The extension's file has to declare these same constants (Swift
// scopes the enum to its target).
enum SharedWalkContextKey {
    static let walkId = "walking_dog.walkId"
    static let dogId = "walking_dog.dogId"
    static let apiUrl = "walking_dog.apiUrl"
}

struct SharedWalkContext {
    static func defaults(appGroup: String) -> UserDefaults? {
        return UserDefaults(suiteName: appGroup)
    }

    static func write(appGroup: String, walkId: String, dogId: String?, apiUrl: String) {
        guard let defaults = defaults(appGroup: appGroup) else { return }
        defaults.set(walkId, forKey: SharedWalkContextKey.walkId)
        if let dogId = dogId {
            defaults.set(dogId, forKey: SharedWalkContextKey.dogId)
        } else {
            defaults.removeObject(forKey: SharedWalkContextKey.dogId)
        }
        defaults.set(apiUrl, forKey: SharedWalkContextKey.apiUrl)
    }

    static func clear(appGroup: String) {
        guard let defaults = defaults(appGroup: appGroup) else { return }
        defaults.removeObject(forKey: SharedWalkContextKey.walkId)
        defaults.removeObject(forKey: SharedWalkContextKey.dogId)
        defaults.removeObject(forKey: SharedWalkContextKey.apiUrl)
    }
}
