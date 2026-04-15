import ActivityKit
import Foundation

public struct WalkAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distanceM: Double
        public var lastEventKind: String?
        public var lastEventAt: Date?

        public init(distanceM: Double, lastEventKind: String? = nil, lastEventAt: Date? = nil) {
            self.distanceM = distanceM
            self.lastEventKind = lastEventKind
            self.lastEventAt = lastEventAt
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
