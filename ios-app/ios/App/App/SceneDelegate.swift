import UIKit
import Capacitor
import LocalAuthentication
import HealthKit
import Security
import WatchConnectivity
import AuthenticationServices

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    // The window comes from Main.storyboard, whose view controller is AppBridgeViewController (below), so there is
    // exactly one web view and it has the Face ID, Apple Health and Apple Watch plugins.
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}


// The app's web view, plus the plugins below. Main.storyboard uses this class.
class AppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricVaultPlugin())
        bridge?.registerPluginInstance(HealthDataPlugin())
        bridge?.registerPluginInstance(WatchSyncPlugin())
        bridge?.registerPluginInstance(PortalSignInPlugin())
        bridge?.registerPluginInstance(NativeHttpPlugin())
        bridge?.registerPluginInstance(PortalKeyPlugin())
        WatchLink.shared.start()
    }
}

// Face ID / Touch ID unlock for the record (used by src/native.js and src/vault.js).
// It keeps one random secret in the iPhone's Keychain, in an item that iOS only opens after Face ID or Touch ID
// (and that iOS deletes if the enrolled faces or fingerprints change). The secret never leaves the phone.
@objc(BiometricVaultPlugin)
public class BiometricVaultPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricVaultPlugin"
    public let jsName = "BiometricVault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]
    private let service = "com.myrarediseasetracker.app.bio"

    @objc func available(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let ok = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        var type = ""
        switch context.biometryType {
        case .faceID: type = "faceID"
        case .touchID: type = "touchID"
        case LABiometryType.none: type = ""
        default: type = "biometric"
        }
        // Why it can't be used, so the app can say what to do.
        var reason = ""
        if !ok, let code = error?.code {
            switch code {
            case LAError.biometryNotEnrolled.rawValue: reason = "notEnrolled"
            case LAError.passcodeNotSet.rawValue: reason = "noPasscode"
            case LAError.biometryNotAvailable.rawValue: reason = type.isEmpty ? "none" : "denied"
            case LAError.biometryLockout.rawValue: reason = "lockout"
            default: reason = "none"
            }
        }
        call.resolve(["available": ok, "type": type, "reason": reason])
    }

    private func baseQuery(_ key: String) -> [String: Any] {
        return [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: key]
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value"),
              let data = value.data(using: .utf8) else { call.reject("Missing key or value", "failed"); return }
        var cfError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                                                           .biometryCurrentSet, &cfError) else {
            call.reject("Face ID isn't set up on this iPhone", "unavailable"); return
        }
        SecItemDelete(baseQuery(key) as CFDictionary)
        var query = baseQuery(key)
        query[kSecValueData as String] = data
        query[kSecAttrAccessControl as String] = access
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecSuccess { call.resolve() } else { call.reject("Couldn't save (\(status))", "failed") }
    }

    @objc func load(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { call.reject("Missing key", "failed"); return }
        let prompt = call.getString("prompt") ?? ""
        DispatchQueue.global(qos: .userInitiated).async {
            let context = LAContext()
            context.localizedReason = prompt.isEmpty ? "Open your record" : prompt
            var query = self.baseQuery(key)
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            query[kSecUseAuthenticationContext as String] = context
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            switch status {
            case errSecSuccess:
                if let data = item as? Data, let value = String(data: data, encoding: .utf8) {
                    call.resolve(["value": value])
                } else {
                    call.reject("Unreadable", "failed")
                }
            case errSecUserCanceled:
                call.reject("Cancelled", "cancelled")
            case errSecItemNotFound:
                call.reject("Face ID changed or was turned off", "changed")
            default:
                call.reject("Face ID didn't work (\(status))", "failed")
            }
        }
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { call.resolve(); return }
        SecItemDelete(baseQuery(key) as CFDictionary)
        call.resolve()
    }
}


// Apple Health (read only), used by src/native.js when the patient chooses "Connect Apple Health".
// It reads blood pressure, resting heart rate, weight and height, one value per day, and hands them to the page,
// which adds them to the record on this phone. Nothing is written to Apple Health and nothing leaves the phone.
@objc(HealthDataPlugin)
public class HealthDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthDataPlugin"
    public let jsName = "HealthData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
    ]
    private let store = HKHealthStore()

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        let ids: [HKQuantityTypeIdentifier] = [.bloodPressureSystolic, .bloodPressureDiastolic, .restingHeartRate, .bodyMass, .height]
        for id in ids { if let t = HKObjectType.quantityType(forIdentifier: id) { types.insert(t) } }
        return types
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    // Shows Apple's own permission sheet. iOS never tells apps which items the person allowed, so the page
    // reads afterwards and simply finds nothing for items that were not allowed.
    @objc func connect(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health isn't available on this device", "unavailable"); return }
        store.requestAuthorization(toShare: nil, read: readTypes) { ok, error in
            if ok { call.resolve() } else { call.reject(error?.localizedDescription ?? "Not allowed", "failed") }
        }
    }

    private static let dayFormat: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    // One average per day for a quantity, over the last `days` days.
    private func daily(_ id: HKQuantityTypeIdentifier, unit: HKUnit, days: Int, done: @escaping ([[String: Any]]) -> Void) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { done([]); return }
        let cal = Calendar.current
        let end = Date()
        let start = cal.startOfDay(for: cal.date(byAdding: .day, value: -days, to: end) ?? end)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsCollectionQuery(quantityType: type, quantitySamplePredicate: predicate,
                                                options: .discreteAverage, anchorDate: start,
                                                intervalComponents: DateComponents(day: 1))
        query.initialResultsHandler = { _, results, _ in
            var out: [[String: Any]] = []
            results?.enumerateStatistics(from: start, to: end) { stats, _ in
                if let q = stats.averageQuantity() {
                    out.append(["date": HealthDataPlugin.dayFormat.string(from: stats.startDate), "value": q.doubleValue(for: unit)])
                }
            }
            done(out)
        }
        store.execute(query)
    }

    @objc func read(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health isn't available on this device", "unavailable"); return }
        let days = min(max(call.getInt("days") ?? 730, 1), 3650)
        let group = DispatchGroup()
        var result: [String: Any] = [:]
        let lock = NSLock()
        let jobs: [(String, HKQuantityTypeIdentifier, HKUnit)] = [
            ("sbp", .bloodPressureSystolic, .millimeterOfMercury()),
            ("dbp", .bloodPressureDiastolic, .millimeterOfMercury()),
            ("hr", .restingHeartRate, HKUnit.count().unitDivided(by: .minute())),
            ("weightKg", .bodyMass, .gramUnit(with: .kilo)),
            ("heightCm", .height, .meterUnit(with: .centi)),
        ]
        for (key, id, unit) in jobs {
            group.enter()
            daily(id, unit: unit, days: days) { rows in
                lock.lock(); result[key] = rows; lock.unlock()
                group.leave()
            }
        }
        group.notify(queue: .main) { call.resolve(result) }
    }
}


// Apple Watch, used by src/native.js. The phone sends the watch its Quick Log buttons (the current disease, in the
// patient's language). The watch sends back what was tapped or said, directly from the watch to this iPhone over
// WatchConnectivity: never through a server. Entries wait in a small file in the app's own storage until the patient
// opens and unlocks the app, which then adds them to the encrypted record and deletes them here.
final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()
    private let queue = DispatchQueue(label: "com.myrarediseasetracker.app.watch")
    private var lastConfig: String?

    private var fileURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("watch-pending.json")
    }

    func start() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        if session.delegate == nil { session.delegate = self }
        if session.activationState != .activated { session.activate() }
    }

    var status: [String: Any] {
        guard WCSession.isSupported() else { return ["paired": false, "installed": false] }
        let s = WCSession.default
        guard s.activationState == .activated else { return ["paired": false, "installed": false, "starting": true] }
        return ["paired": s.isPaired, "installed": s.isWatchAppInstalled]
    }

    // The newest Quick Log setup. Kept so it can be sent again once the watch app is installed.
    func setConfig(_ json: String) {
        queue.sync { lastConfig = json }
        // Button names only (no health data), kept so the watch can ask for them before the app is opened.
        UserDefaults.standard.set(json, forKey: "mrdt-watch-config")
        sendConfig()
    }
    private func savedConfig() -> String? {
        return queue.sync { lastConfig } ?? UserDefaults.standard.string(forKey: "mrdt-watch-config")
    }
    // The phone's side of the shared "context": the watch's buttons, plus receipts ("ack") for the entries that
    // arrived here, so the watch can mark them sent and stop resending them.
    private func sendConfig() {
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        guard s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else {
            print("[MRDT watch] phone: not sending to watch (activated \(s.activationState == .activated), paired \(s.isPaired), installed \(s.isWatchAppInstalled))")
            return
        }
        var ctx: [String: Any] = ["ack": seenIds().suffix(100).map { $0 }]
        if let json = savedConfig() { ctx["config"] = json }
        do { try s.updateApplicationContext(ctx) } catch { print("[MRDT watch] phone: context error \(error)") }
    }

    // Ids of entries already received, so one sent two ways (or twice) is only added once.
    private func seenIds() -> [String] { UserDefaults.standard.stringArray(forKey: "mrdt-watch-seen") ?? [] }

    // ---- Entries waiting for the app ----
    func readPending() -> [[String: Any]] {
        return queue.sync { self.load() }
    }
    func clear(_ ids: Set<String>) {
        queue.sync {
            let left = self.load().filter { !ids.contains(($0["id"] as? String) ?? "") }
            self.save(left)
        }
    }
    private func load() -> [[String: Any]] {
        guard let data = try? Data(contentsOf: fileURL),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
        return list
    }
    private func save(_ list: [[String: Any]]) {
        guard let data = try? JSONSerialization.data(withJSONObject: list) else { return }
        // Readable after the phone's first unlock since restart, so entries can arrive while the phone is locked.
        try? data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        // Not copied into iCloud or computer backups: it only holds entries on their way into the record.
        var url = fileURL
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }
    private func add(_ item: [String: Any]) {
        // Only the fields the app uses, with sensible limits.
        guard let id = item["id"] as? String, !id.isEmpty, id.count <= 64,
              let kind = item["kind"] as? String, ["score", "event", "voice"].contains(kind) else { return }
        var clean: [String: Any] = ["id": id, "kind": kind]
        // "premeds" and "minutes" come with an infusion reaction: the premedications taken and the infusion time.
        for key in ["person", "date", "metric", "type", "ask", "premeds"] {
            if let v = item[key] as? String, v.count <= 64 { clean[key] = v }
        }
        if let v = item["value"] as? NSNumber { clean["value"] = v }
        if let v = item["minutes"] as? NSNumber { clean["minutes"] = v }
        if let t = item["text"] as? String { clean["text"] = String(t.prefix(600)) }
        let isNew: Bool = queue.sync {
            var seen = self.seenIds()
            if seen.contains(id) { return false }
            seen.append(id)
            UserDefaults.standard.set(Array(seen.suffix(300)), forKey: "mrdt-watch-seen")
            var list = self.load()
            list.append(clean)
            self.save(Array(list.suffix(500)))
            return true
        }
        print("[MRDT watch] phone: received \(kind) \(id.prefix(8)) \(isNew ? "(new)" : "(already had it)")")
        // Tell the app's page, so a tap shows up right away when the app is open.
        if isNew { DispatchQueue.main.async { NotificationCenter.default.post(name: WatchLink.arrived, object: nil) } }
    }
    static let arrived = Notification.Name("MRDTWatchEntryArrived")

    // ---- WCSessionDelegate ----
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("[MRDT watch] phone: link ready (\(activationState.rawValue)), paired \(session.isPaired), watch app installed \(session.isWatchAppInstalled)")
        // Entries the watch left in its context while this app was closed.
        receiveOutbox(session.receivedApplicationContext)
        sendConfig()
    }
    // The watch keeps everything not yet confirmed in its context ("outbox"), which reaches the phone even when
    // direct messages can't. Then the phone confirms with its "ack" list.
    private func receiveOutbox(_ ctx: [String: Any]) {
        guard let json = ctx["outbox"] as? String, let data = json.data(using: .utf8),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
        list.forEach { add($0) }
    }
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        receiveOutbox(applicationContext)
        sendConfig()
    }
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    func sessionWatchStateDidChange(_ session: WCSession) { sendConfig() }
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) { add(userInfo); sendConfig() }
    // Sent directly while the watch and phone are in reach: an entry, or the watch asking for its buttons.
    func session(_ session: WCSession, didReceiveMessageData messageData: Data, replyHandler: @escaping (Data) -> Void) {
        guard let obj = try? JSONSerialization.jsonObject(with: messageData) as? [String: Any] else { replyHandler(Data()); return }
        if obj["want"] as? String == "config" { replyHandler(Data((savedConfig() ?? "").utf8)); return }
        add(obj)
        replyHandler(Data("ok".utf8))
        sendConfig()
    }
    func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
        if let obj = try? JSONSerialization.jsonObject(with: messageData) as? [String: Any] { add(obj); sendConfig() }
    }
}

@objc(WatchSyncPlugin)
public class WatchSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchSyncPlugin"
    public let jsName = "WatchSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        NotificationCenter.default.addObserver(forName: WatchLink.arrived, object: nil, queue: .main) { [weak self] _ in
            self?.bridge?.triggerWindowJSEvent(eventName: "rdt-watch")
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(WatchLink.shared.status)
    }

    @objc func setup(_ call: CAPPluginCall) {
        guard let json = call.getString("config"), json.count < 200_000 else { call.reject("Missing setup", "failed"); return }
        WatchLink.shared.setConfig(json)
        call.resolve()
    }

    @objc func pending(_ call: CAPPluginCall) {
        let list = WatchLink.shared.readPending()
        let data = (try? JSONSerialization.data(withJSONObject: list)) ?? Data("[]".utf8)
        call.resolve(["items": String(data: data, encoding: .utf8) ?? "[]"])
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let json = call.getString("ids"), let data = json.data(using: .utf8),
              let ids = try? JSONSerialization.jsonObject(with: data) as? [String] else { call.resolve(); return }
        WatchLink.shared.clear(Set(ids))
        call.resolve()
    }
}


// Patient portal (Epic MyChart) sign-in, used by src/App.jsx through src/native.js.
// Opens the health system's own sign-in page in Apple's secure sign-in sheet. When the patient finishes, the health
// system sends them back to com.myrarediseasetracker.app://oauth/epic with a one-time code, which goes to the page.
// The sheet keeps no cookies afterwards (ephemeral), so the portal sign-in isn't left behind on the phone.
@objc(PortalSignInPlugin)
public class PortalSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "PortalSignInPlugin"
    public let jsName = "PortalSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
    ]
    private var session: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let s = call.getString("url"), let url = URL(string: s), url.scheme == "https",
              let scheme = call.getString("scheme"), !scheme.isEmpty else { call.reject("Bad sign-in address", "failed"); return }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] back, error in
                self?.session = nil
                if let back = back {
                    call.resolve(["url": back.absoluteString])
                } else if let e = error as? ASWebAuthenticationSessionError, e.code == .canceledLogin {
                    call.reject("Cancelled", "cancelled")
                } else {
                    call.reject("Sign-in didn't finish", "failed")
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.session = session
            if !session.start() { self.session = nil; call.reject("Sign-in couldn't open", "failed") }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }
}

// Web requests to the patient's health system (sign-in token and lab results), made by the phone rather than the
// page, because health systems don't accept requests from inside an app's page. Only https addresses; nothing is
// stored here, and the answer goes straight back to the page.
@objc(NativeHttpPlugin)
public class NativeHttpPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeHttpPlugin"
    public let jsName = "NativeHttp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
    ]
    private lazy var urlSession: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.timeoutIntervalForRequest = 20
        c.httpCookieStorage = nil
        c.urlCache = nil
        return URLSession(configuration: c)
    }()

    @objc func request(_ call: CAPPluginCall) {
        guard let s = call.getString("url"), let url = URL(string: s), url.scheme == "https" else {
            call.reject("Only secure (https) addresses", "failed"); return
        }
        var req = URLRequest(url: url)
        req.httpMethod = (call.getString("method") ?? "GET").uppercased() == "POST" ? "POST" : "GET"
        if let headers = call.getObject("headers") {
            for (k, v) in headers { if let v = v as? String { req.setValue(v, forHTTPHeaderField: k) } }
        }
        if req.httpMethod == "POST", let body = call.getString("body") { req.httpBody = body.data(using: .utf8) }
        urlSession.dataTask(with: req) { data, response, error in
            if let error = error as NSError? {
                call.reject(error.code == NSURLErrorTimedOut ? "timeout" : "unreachable", "failed"); return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            call.resolve(["status": status, "text": text])
        }.resume()
    }
}


// Automatic lab updates from the patient's health system (Epic "dynamic client", JWT bearer), used by src/native.js.
// After the patient signs in once, the app makes its own RSA key pair here and registers the public half with the
// health system. Later, each time the app opens, it signs a short request with the private key to get a new
// one-hour pass, without asking the patient to sign in again, until the access period the patient chose ends.
// The private key stays in this iPhone's Keychain: it can't be read out, isn't backed up, and never leaves the phone.
@objc(PortalKeyPlugin)
public class PortalKeyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PortalKeyPlugin"
    public let jsName = "PortalKey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "publicKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sign", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private func tagData(_ name: String) -> Data { "com.myrarediseasetracker.portal.\(name)".data(using: .utf8)! }

    private func findKey(_ name: String) -> SecKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tagData(name),
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecReturnRef as String: true,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let found = item else { return nil }
        return (found as! SecKey)
    }

    private func makeKey(_ name: String) -> SecKey? {
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeySizeInBits as String: 2048,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tagData(name),
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            ],
        ]
        var error: Unmanaged<CFError>?
        return SecKeyCreateRandomKey(attributes as CFDictionary, &error)
    }

    private static func b64url(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    // The public key comes out as an RSAPublicKey (PKCS#1): SEQUENCE { modulus INTEGER, exponent INTEGER }.
    private static func modulusAndExponent(_ der: Data) -> (Data, Data)? {
        let b = [UInt8](der)
        var i = 0
        func length() -> Int? {
            guard i < b.count else { return nil }
            var n = Int(b[i]); i += 1
            if n & 0x80 != 0 {
                let count = n & 0x7f
                guard count > 0, count <= 4, i + count <= b.count else { return nil }
                n = 0
                for _ in 0..<count { n = (n << 8) | Int(b[i]); i += 1 }
            }
            return n
        }
        func integer() -> Data? {
            guard i < b.count, b[i] == 0x02 else { return nil }
            i += 1
            guard let n = length(), i + n <= b.count else { return nil }
            var bytes = Array(b[i..<(i + n)]); i += n
            while bytes.count > 1 && bytes[0] == 0 { bytes.removeFirst() }
            return Data(bytes)
        }
        guard b.first == 0x30 else { return nil }
        i = 1
        guard length() != nil, let n = integer(), let e = integer() else { return nil }
        return (n, e)
    }

    // Returns the public key (as JWK n and e), making the key pair first if this tag has none yet.
    @objc func publicKey(_ call: CAPPluginCall) {
        guard let name = call.getString("tag"), !name.isEmpty else { call.reject("No key name", "failed"); return }
        guard let key = findKey(name) ?? makeKey(name), let pub = SecKeyCopyPublicKey(key) else {
            call.reject("The key couldn't be made", "failed"); return
        }
        var error: Unmanaged<CFError>?
        guard let der = SecKeyCopyExternalRepresentation(pub, &error) as Data?,
              let parts = PortalKeyPlugin.modulusAndExponent(der) else {
            call.reject("The key couldn't be read", "failed"); return
        }
        call.resolve(["n": PortalKeyPlugin.b64url(parts.0), "e": PortalKeyPlugin.b64url(parts.1)])
    }

    // Signs the text with RS384 (RSA PKCS#1 v1.5, SHA-384) and returns the signature, base64url.
    @objc func sign(_ call: CAPPluginCall) {
        guard let name = call.getString("tag"), let text = call.getString("data"), let data = text.data(using: .utf8) else {
            call.reject("Nothing to sign", "failed"); return
        }
        guard let key = findKey(name) else { call.reject("No key", "missing"); return }
        var error: Unmanaged<CFError>?
        guard let sig = SecKeyCreateSignature(key, .rsaSignatureMessagePKCS1v15SHA384, data as CFData, &error) as Data? else {
            call.reject("The request couldn't be signed", "failed"); return
        }
        call.resolve(["signature": PortalKeyPlugin.b64url(sig)])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let name = call.getString("tag") else { call.resolve(); return }
        let query: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: tagData(name)]
        SecItemDelete(query as CFDictionary)
        call.resolve()
    }
}
