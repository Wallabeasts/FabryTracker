import Foundation
import Observation
import WatchConnectivity
import WatchKit

// The Quick Log setup sent by the iPhone app (see watchConfig in src/App.jsx).
struct WatchConfig: Codable, Equatable {
    struct Score: Codable, Equatable, Identifiable {
        var id: String
        var label: String
        var prompt: String
        var min: Int
    }
    struct EventType: Codable, Equatable, Identifiable {
        var id: String
        var label: String
    }
    struct Group: Codable, Equatable, Identifiable {
        var title: String
        var types: [EventType]
        var id: String { title }
    }
    var v: Int
    var person: String
    var who: String?
    var disease: String
    var scores: [Score]
    var groups: [Group]
    var ui: [String: String]
}

// Keeps the setup from the phone and sends what the patient logs back to the phone. Runs on the main thread;
// the WatchConnectivity callbacks below hop over to it.
@MainActor
@Observable
final class WatchStore: NSObject, @preconcurrency WCSessionDelegate {
    var config: WatchConfig?
    // What was logged since the app opened, newest first. Kept only in memory: health details aren't saved on the watch.
    var recent: [String] = []

    @ObservationIgnored private let configKey = "mrdt-watch-config"
    @ObservationIgnored private var waiting: [[String: Any]] = []

    override init() {
        super.init()
        // The setup holds button names only (no health data), so it's kept for when the phone is out of reach.
        if let data = UserDefaults.standard.data(forKey: configKey),
           let saved = try? JSONDecoder().decode(WatchConfig.self, from: data) {
            config = saved
        }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // A word on the watch, in the patient's language (sent by the phone), or the English one until then.
    func t(_ key: String, _ english: String) -> String {
        if let s = config?.ui[key], !s.isEmpty { return s }
        return english
    }

    private func use(_ json: String?) {
        guard let json = json, let data = json.data(using: .utf8),
              let cfg = try? JSONDecoder().decode(WatchConfig.self, from: data) else { return }
        config = cfg
        UserDefaults.standard.set(data, forKey: configKey)
    }

    private func sendWaiting() {
        guard WCSession.default.activationState == .activated else { return }
        let queued = waiting
        waiting = []
        queued.forEach { deliver($0) }
    }

    // Straight to the phone when it's in reach (it arrives at once). Otherwise, or if that fails, Apple's queue
    // delivers it later, even if the phone is away or the app on it is closed.
    private func deliver(_ item: [String: Any]) {
        let s = WCSession.default
        guard WCSession.isSupported(), s.activationState == .activated else { waiting.append(item); return }
        guard s.isReachable, let data = try? JSONSerialization.data(withJSONObject: item) else {
            s.transferUserInfo(item)
            return
        }
        s.sendMessageData(data, replyHandler: { _ in }, errorHandler: { _ in
            if let again = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                WCSession.default.transferUserInfo(again)
            }
        })
    }

    // Asks the phone for the Quick Log buttons, for when the watch app opens before the phone has sent them.
    private func askForConfig() {
        let s = WCSession.default
        guard s.activationState == .activated, s.isReachable,
              let data = try? JSONSerialization.data(withJSONObject: ["want": "config"]) else { return }
        s.sendMessageData(data, replyHandler: { reply in
            let json = String(data: reply, encoding: .utf8)
            Task { @MainActor in self.use(json) }
        }, errorHandler: { _ in })
    }

    private static let dayFormat: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    // Sends one entry to the phone. Apple keeps it queued until the phone can take it, even if the phone is away.
    private func send(_ fields: [String: Any], recentText: String) {
        var item = fields
        item["id"] = UUID().uuidString
        item["person"] = config?.person ?? ""
        item["date"] = Self.dayFormat.string(from: Date())
        deliver(item)
        WKInterfaceDevice.current().play(.success)
        recent.insert(recentText, at: 0)
        if recent.count > 5 { recent.removeLast(recent.count - 5) }
    }

    func logScore(_ score: WatchConfig.Score, _ value: Int) {
        send(["kind": "score", "metric": score.id, "value": value], recentText: "\(score.label) \(value)/10")
    }

    func logEvent(_ type: WatchConfig.EventType) {
        send(["kind": "event", "type": type.id], recentText: type.label)
    }

    // Spoken words are sent as they were heard. The phone works out what they mean and shows the patient
    // to check before anything is saved.
    func logVoice(_ text: String, ask: String) {
        let clean = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(600))
        guard !clean.isEmpty else { return }
        send(["kind": "voice", "ask": ask, "text": clean], recentText: "“\(clean)”")
    }

    // ---- WCSessionDelegate (called on a background thread) ----
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let json = session.receivedApplicationContext["config"] as? String
        Task { @MainActor in
            self.use(json)
            self.sendWaiting()
            self.askForConfig()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            self.sendWaiting()
            if self.config == nil { self.askForConfig() }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        let json = applicationContext["config"] as? String
        Task { @MainActor in self.use(json) }
    }
}
