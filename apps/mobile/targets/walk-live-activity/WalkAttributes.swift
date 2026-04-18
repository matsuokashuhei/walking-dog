import ActivityKit
import Foundation

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
