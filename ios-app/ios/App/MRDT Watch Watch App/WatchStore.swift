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
        var rgb: String?   // the score's color on the phone, like "15,110,120"
        var high: Bool?    // true when a higher number is better (quality of life)
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
    // What the infusion reaction also asks: the premedications taken before the infusion and how long it ran.
    struct Infusion: Codable, Equatable {
        struct Premed: Codable, Equatable, Identifiable {
            var id: String
            var label: String
            var on: Bool?      // listed under Treatments on the phone as being taken now, so it starts ticked
        }
        struct Time: Codable, Equatable, Identifiable {
            var minutes: Int
            var label: String  // like "3 h 30 min", already in the patient's language
            var id: Int { minutes }
        }
        var premeds: [Premed]
        var times: [Time]
    }
    var v: Int
    var person: String
    var who: String?
    var disease: String
    var scores: [Score]
    var groups: [Group]
    var infusion: Infusion?   // sent only for people on infusions (enzyme replacement therapy)
    var ui: [String: String]
}

// Keeps the setup from the phone and sends what the patient logs back to the phone. Runs on the main thread;
// the WatchConnectivity callbacks below hop over to it.
// One line in the "Recent" list: what was logged, and whether the iPhone has confirmed it.
struct RecentItem: Identifiable {
    let id: String
    let text: String
    var sent: Bool
}

// Keeps the setup from the phone and sends what the patient logs back to the phone. Runs on the main thread;
// the WatchConnectivity callbacks below hop over to it.
//
// How entries reach the phone: each one goes into an "outbox" until the phone confirms it. The outbox is sent
// three ways at once, and the phone ignores repeats: a direct message (instant, when the phone is in reach),
// the shared context (arrives whenever the phone app runs, even later), and Apple's queue.
@MainActor
@Observable
final class WatchStore: NSObject, @preconcurrency WCSessionDelegate {
    var config: WatchConfig?
    // What was logged since the app opened, newest first.
    var recent: [RecentItem] = []
    // What was last logged for each button since the app opened (shown on the button). In memory only.
    var last: [String: String] = [:]
    // Whether the iPhone can be reached right now.
    var phoneInReach = false

    @ObservationIgnored private let configKey = "mrdt-watch-config"
    @ObservationIgnored private let outboxKey = "mrdt-watch-outbox"
    // Entries the phone hasn't confirmed yet. Kept on the watch only until it does.
    @ObservationIgnored private var outbox: [[String: Any]] = []

    override init() {
        super.init()
        // The setup holds button names only (no health data), so it's kept for when the phone is out of reach.
        if let data = UserDefaults.standard.data(forKey: configKey),
           let saved = try? JSONDecoder().decode(WatchConfig.self, from: data) {
            config = saved
        }
        if let data = UserDefaults.standard.data(forKey: outboxKey),
           let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            outbox = list
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
        guard let json = json, !json.isEmpty, let data = json.data(using: .utf8),
              let cfg = try? JSONDecoder().decode(WatchConfig.self, from: data) else { return }
        config = cfg
        UserDefaults.standard.set(data, forKey: configKey)
    }

    // The phone confirmed these entries: forget them here and show them as sent.
    private func confirmed(_ ids: [String]) {
        guard !ids.isEmpty else { return }
        let set = Set(ids)
        let before = outbox.count
        outbox.removeAll { set.contains(($0["id"] as? String) ?? "") }
        if outbox.count != before { saveOutbox(); print("[MRDT watch] watch: phone confirmed \(before - outbox.count)") }
        for i in recent.indices where set.contains(recent[i].id) { recent[i].sent = true }
    }

    private func saveOutbox() {
        outbox = Array(outbox.suffix(200))
        if let data = try? JSONSerialization.data(withJSONObject: outbox) {
            UserDefaults.standard.set(data, forKey: outboxKey)
        }
    }

    // Sends everything not yet confirmed.
    private func sendOutbox() {
        let s = WCSession.default
        guard WCSession.isSupported(), s.activationState == .activated else { return }
        phoneInReach = s.isReachable
        guard !outbox.isEmpty, let data = try? JSONSerialization.data(withJSONObject: outbox),
              let json = String(data: data, encoding: .utf8) else { return }
        do { try s.updateApplicationContext(["outbox": json]) } catch { print("[MRDT watch] watch: context error \(error)") }
        guard s.isReachable else { print("[MRDT watch] watch: iPhone not in reach; \(outbox.count) waiting"); return }
        for item in outbox {
            guard let id = item["id"] as? String, let one = try? JSONSerialization.data(withJSONObject: item) else { continue }
            s.sendMessageData(one, replyHandler: { _ in
                Task { @MainActor in self.confirmed([id]) }
            }, errorHandler: { error in
                print("[MRDT watch] watch: direct send failed: \(error.localizedDescription)")
            })
        }
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

    private func send(_ fields: [String: Any], recentText: String) {
        var item = fields
        let id = UUID().uuidString
        item["id"] = id
        item["person"] = config?.person ?? ""
        item["date"] = Self.dayFormat.string(from: Date())
        outbox.append(item)
        saveOutbox()
        WKInterfaceDevice.current().play(.success)
        recent.insert(RecentItem(id: id, text: recentText, sent: false), at: 0)
        if recent.count > 5 { recent.removeLast(recent.count - 5) }
        sendOutbox()
    }

    func logScore(_ score: WatchConfig.Score, _ value: Int) {
        send(["kind": "score", "metric": score.id, "value": value], recentText: "\(score.label) \(value)/10")
        last[score.id] = "\(value)/10"
    }

    // An infusion reaction: the score, the premedications taken (their ids) and the infusion time in minutes, if given.
    func logInfusion(_ score: WatchConfig.Score, _ value: Int, premeds: [String], minutes: Int?) {
        var fields: [String: Any] = ["kind": "score", "metric": score.id, "value": value]
        if !premeds.isEmpty { fields["premeds"] = premeds.joined(separator: ",") }
        if let m = minutes { fields["minutes"] = m }
        send(fields, recentText: "\(score.label) \(value)/10")
        last[score.id] = "\(value)/10"
    }

    func logEvent(_ type: WatchConfig.EventType, group: String) {
        send(["kind": "event", "type": type.id], recentText: type.label)
        last[group] = type.label
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
        let ack = session.receivedApplicationContext["ack"] as? [String] ?? []
        print("[MRDT watch] watch: link ready (\(activationState.rawValue)), iPhone in reach \(session.isReachable)")
        Task { @MainActor in
            self.use(json)
            self.confirmed(ack)
            self.sendOutbox()
            self.askForConfig()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        print("[MRDT watch] watch: iPhone in reach \(session.isReachable)")
        Task { @MainActor in
            self.sendOutbox()
            if self.config == nil { self.askForConfig() }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        let json = applicationContext["config"] as? String
        let ack = applicationContext["ack"] as? [String] ?? []
        Task { @MainActor in
            self.use(json)
            self.confirmed(ack)
        }
    }
}
