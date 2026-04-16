import Foundation
import Security

// Reads tokens written by expo-secure-store from the shared App Group
// keychain. expo-secure-store stores items with kSecAttrService set to the
// `keychainService` option and kSecAttrAccessGroup set to `accessGroup` — we
// mirror both here so SecItemCopyMatching finds the same rows. Getting any of
// service / account / access group wrong silently returns errSecItemNotFound.
enum SharedKeychain {
    static let accessTokenAccount = "auth_access_token"
    static let refreshTokenAccount = "auth_refresh_token"

    static func readAccessToken() -> String? {
        return read(account: accessTokenAccount)
    }

    static func readRefreshToken() -> String? {
        return read(account: refreshTokenAccount)
    }

    private static func read(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: SharedConstants.keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: SharedConstants.appGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }
}
