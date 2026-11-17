import Foundation
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

// Keeps the setup from the phone and sends what the patient logs back to the phone.
final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
    @Published var config: WatchConfig?
    // What was logged since the app opened, newest first. Kept only in memory: health details aren't saved on the watch.
    @Published var recent: [String] = []

    private let configKey = "mrdt-watch-config"
    private var waiting: [[String: Any]] = []

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

    private func use(_ context: [String: Any]) {
        guard let json = context["config"] as? String, let data = json.data(using: .utf8),
              let cfg = try? JSONDecoder().decode(WatchConfig.self, from: data) else { return }
        DispatchQueue.main.async {
            self.config = cfg
            UserDefaults.standard.set(data, forKey: self.configKey)
        }
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
        if WCSession.isSupported() && WCSession.default.activationState == .activated {
            WCSession.default.transferUserInfo(item)
        } else {
            waiting.append(item)
        }
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

    // ---- WCSessionDelegate ----
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        use(session.receivedApplicationContext)
        guard activationState == .activated else { return }
        DispatchQueue.main.async {
            let queued = self.waiting
            self.waiting = []
            queued.forEach { session.transferUserInfo($0) }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        use(applicationContext)
    }
}
