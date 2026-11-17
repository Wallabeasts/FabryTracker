import UIKit
import Capacitor
import LocalAuthentication
import HealthKit
import Security

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}


// The app's web view, plus the Face ID plugin below.
class AppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricVaultPlugin())
        bridge?.registerPluginInstance(HealthDataPlugin())
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
        if ok {
            switch context.biometryType {
            case .faceID: type = "faceID"
            case .touchID: type = "touchID"
            default: type = "biometric"
            }
        }
        call.resolve(["available": ok, "type": type])
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
