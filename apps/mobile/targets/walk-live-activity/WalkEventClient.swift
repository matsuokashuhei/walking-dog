import Foundation

enum WalkEventClientError: Error {
    case missingContext
    case missingToken
    case invalidURL
    case unauthorized
    case network(Error)
    case graphQLError(String)
    case invalidResponse
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
            throw WalkEventClientError.network(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw WalkEventClientError.invalidResponse
        }
        if http.statusCode == 401 {
            throw WalkEventClientError.unauthorized
        }
        guard (200...299).contains(http.statusCode) else {
            throw WalkEventClientError.graphQLError("HTTP \(http.statusCode)")
        }

        if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let errors = payload["errors"] as? [[String: Any]],
           let first = errors.first,
           let message = first["message"] as? String {
            throw WalkEventClientError.graphQLError(message)
        }
    }
}
