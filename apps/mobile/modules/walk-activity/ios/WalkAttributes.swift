import ActivityKit
import Foundation

// NOTE: This struct MUST remain byte-identical (field names, order, types) with
// targets/walk-live-activity/WalkAttributes.swift. ActivityKit passes instances
// across the app ↔ widget-extension process boundary via Codable; any shape
// drift between the two definitions will silently break attribute decoding.
// Both targets need their own copy because @bacons/apple-targets scopes source
// files to a single target; a shared Swift package would be the cleaner long
// term fix.
public struct WalkAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distanceM: Double
        public var lastEventKind: String?
        public var lastEventAt: Date?
        public var lastEventError: String?

        public init(
            distanceM: Double,
            lastEventKind: String? = nil,
            lastEventAt: Date? = nil,
            lastEventError: String? = nil
        ) {
            self.distanceM = distanceM
            self.lastEventKind = lastEventKind
            self.lastEventAt = lastEventAt
            self.lastEventError = lastEventError
        }
    }

    public var walkId: String
    public var dogName: String
    public var startedAt: Date

    public init(walkId: String, dogName: String, startedAt: Date) {
        self.walkId = walkId
        self.dogName = dogName
        self.startedAt = startedAt
    }
}
