import Foundation
import os

private let clientLogger = Logger(subsystem: "com.walkingdog.liveactivity", category: "Network")

enum WalkEventClientError: Error {
    case missingContext
    case missingToken
    case invalidURL
    case unauthorized
    case network(Error)
    case graphQLError(String)
    case invalidResponse

    var description: String {
        switch self {
        case .missingContext: return "missingContext"
        case .missingToken: return "missingToken"
        case .invalidURL: return "invalidURL"
        case .unauthorized: return "unauthorized"
        case .network(let e): return "network(\((e as NSError).code))"
        case .graphQLError(let msg): return "graphQL(\(msg.prefix(50)))"
        case .invalidResponse: return "invalidResponse"
        }
    }
}

// Minimal GraphQL client for the Live Activity AppIntents. Only speaks the one
// mutation we need (recordWalkEvent). No Apollo, no codegen — AppIntents run
// in the Widget Extension process where pulling those dependencies is more
// trouble than it's worth.
enum WalkEventClient {
    static func recordEvent(
        kind: String,
        context: WidgetWalkContext,
        token: String
    ) async throws {
        guard let url = URL(string: "\(context.apiUrl)/graphql") else {
            throw WalkEventClientError.invalidURL
        }

        let mutation = """
        mutation RecordWalkEvent($input: RecordWalkEventInput!) {
          recordWalkEvent(input: $input) { id }
        }
        """

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let occurredAt = isoFormatter.string(from: Date())

        var variables: [String: Any] = [
            "walkId": context.walkId,
            "eventType": kind,
            "occurredAt": occurredAt,
        ]
        if let dogId = context.dogId {
            variables["dogId"] = dogId
        }

        let body: [String: Any] = [
            "query": mutation,
            "variables": ["input": variables],
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 15

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            clientLogger.error("Network error for \(kind): \(error.localizedDescription)")
            throw WalkEventClientError.network(error)
        }

        guard let http = response as? HTTPURLResponse else {
            clientLogger.error("Invalid response for \(kind)")
            throw WalkEventClientError.invalidResponse
        }
        clientLogger.info("Response for \(kind): HTTP \(http.statusCode)")
        if http.statusCode == 401 {
            throw WalkEventClientError.unauthorized
        }
        guard (200...299).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            clientLogger.error("HTTP \(http.statusCode) for \(kind): \(body.prefix(200))")
            throw WalkEventClientError.graphQLError("HTTP \(http.statusCode)")
        }

        if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let errors = payload["errors"] as? [[String: Any]],
           let first = errors.first,
           let message = first["message"] as? String {
            clientLogger.error("GraphQL error for \(kind): \(message)")
            throw WalkEventClientError.graphQLError(message)
        }
    }
}
