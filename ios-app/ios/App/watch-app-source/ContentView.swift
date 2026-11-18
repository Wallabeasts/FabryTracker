import SwiftUI

// ---------- Look: the same navy, blue and cyan as the iPhone app ----------
@MainActor
enum Brand {
    static let navy = Color(red: 0.012, green: 0.024, blue: 0.047)        // #03060C
    static let navy2 = Color(red: 0.043, green: 0.122, blue: 0.271)       // #0B1F45
    static let blue = Color(red: 0.114, green: 0.373, blue: 0.847)        // #1D5FD8
    static let teal = Color(red: 0.055, green: 0.604, blue: 0.659)        // #0E9AA8
    static let cyan = Color(red: 0.275, green: 0.784, blue: 0.902)        // #46C8E6
    static let card = Color.white.opacity(0.08)
    static let background = LinearGradient(colors: [navy2, navy], startPoint: .top, endPoint: .bottom)
    static let button = LinearGradient(colors: [blue, teal], startPoint: .leading, endPoint: .trailing)

    // "15,110,120" from the phone, made bright enough to read on black.
    static func color(_ rgb: String?) -> Color {
        let p = (rgb ?? "").split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard p.count == 3 else { return cyan }
        let lift = 0.35
        return Color(red: (p[0] / 255) * (1 - lift) + lift, green: (p[1] / 255) * (1 - lift) + lift, blue: (p[2] / 255) * (1 - lift) + lift)
    }

    // Green for a good number, through yellow, to red for a bad one.
    static func severity(_ value: Int, min: Int, highIsGood: Bool) -> Color {
        var t = Double(value - min) / Double(max(1, 10 - min))
        if highIsGood { t = 1 - t }
        return t < 0.5
            ? Color(red: 0.20 + 1.6 * t * 0.8, green: 0.80, blue: 0.35 - 0.5 * t * 0.35)
            : Color(red: 1.0, green: 0.80 - (t - 0.5) * 1.3, blue: 0.20 - (t - 0.5) * 0.2)
    }

    static func icon(forScore id: String) -> String {
        switch id {
        case "pain": return "bolt.heart.fill"
        case "fatigue": return "battery.25"
        case "anxiety": return "brain.head.profile"
        case "qol": return "face.smiling"
        case "abdPain": return "figure.arms.open"
        default: return "slider.horizontal.3"
        }
    }
}

// A big, easy-to-hit button on the home screen.
struct Tile: View {
    let title: String
    var detail: String = ""
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle().fill(color.opacity(0.25))
                Image(systemName: icon).font(.system(size: 18, weight: .semibold)).foregroundStyle(color)
            }
            .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.headline).foregroundStyle(.white).lineLimit(2).minimumScaleFactor(0.8)
                if !detail.isEmpty {
                    Text(detail).font(.caption2).foregroundStyle(Brand.cyan).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.white.opacity(0.5))
        }
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: 58)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.card))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(color.opacity(0.6), lineWidth: 1.5))
        .accessibilityElement(children: .combine)
    }
}

// The big green check shown after anything is logged.
struct Done: View {
    let text: String
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)
                .symbolEffect(.bounce, value: text)
            Text(text).font(.title3.bold()).multilineTextAlignment(.center).foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.background)
        .accessibilityElement(children: .combine)
    }
}

struct ContentView: View {
    @Environment(WatchStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 8) {
                    if let cfg = store.config {
                        header(cfg)
                        ForEach(cfg.scores) { score in
                            NavigationLink { ScoreView(score: score) } label: {
                                Tile(title: score.label, detail: store.last[score.id] ?? "",
                                     icon: Brand.icon(forScore: score.id), color: Brand.color(score.rgb))
                            }
                            .buttonStyle(.plain)
                        }
                        ForEach(cfg.groups) { group in
                            NavigationLink { EventGroupView(group: group) } label: {
                                Tile(title: group.title, detail: store.last[group.title] ?? "",
                                     icon: "exclamationmark.circle.fill", color: .orange)
                            }
                            .buttonStyle(.plain)
                        }
                        Text(store.t("byVoice", "By voice"))
                            .font(.caption2.bold()).foregroundStyle(Brand.cyan)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 6)
                        NavigationLink {
                            VoiceView(ask: "lab", hint: store.t("labHint", "Say the test and its result, like: creatinine 1.2"))
                        } label: {
                            Tile(title: store.t("speakLab", "Say a lab result"), icon: "mic.fill", color: Brand.cyan)
                        }
                        .buttonStyle(.plain)
                        NavigationLink {
                            VoiceView(ask: "med", hint: store.t("medHint", "Say the medicine's name, and whether you started it, stopped it or changed the dose."))
                        } label: {
                            Tile(title: store.t("speakMed", "Say a medicine change"), icon: "pills.fill", color: Brand.cyan)
                        }
                        .buttonStyle(.plain)
                        if !store.recent.isEmpty {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(store.t("recent", "Recent")).font(.caption2.bold()).foregroundStyle(Brand.cyan)
                                ForEach(Array(store.recent.enumerated()), id: \.offset) { _, line in
                                    Text(line).font(.caption2).foregroundStyle(.white.opacity(0.75)).lineLimit(2)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 6)
                        }
                    } else {
                        VStack(spacing: 10) {
                            Image("RibbonMark").resizable().scaledToFit().frame(width: 64, height: 64)
                            Text("Open My Rare Disease Tracker on your iPhone to set up your Quick Log.")
                                .font(.body).multilineTextAlignment(.center).foregroundStyle(.white)
                        }
                        .padding(.top, 10)
                    }
                }
                .padding(.horizontal, 4)
            }
            .containerBackground(Brand.background, for: .navigation)
        }
    }

    private func header(_ cfg: WatchConfig) -> some View {
        HStack(spacing: 8) {
            Image("RibbonMark").resizable().scaledToFit().frame(width: 30, height: 30)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                Text(store.t("title", "Quick log")).font(.caption2.bold()).foregroundStyle(Brand.cyan)
                Text(cfg.who.map { $0.isEmpty ? cfg.disease : "\($0) · \(cfg.disease)" } ?? cfg.disease)
                    .font(.headline).foregroundStyle(.white).lineLimit(2).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, 2)
        .accessibilityElement(children: .combine)
    }
}

// A score: one big number. Turn the Digital Crown, or tap − and +, then Save.
struct ScoreView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let score: WatchConfig.Score
    @State private var crown: Double = 5
    @State private var saved: Int?

    private var value: Int { min(10, max(score.min, Int(crown.rounded()))) }
    private var tint: Color { Brand.severity(value, min: score.min, highIsGood: score.high ?? false) }

    var body: some View {
        Group {
            if let n = saved {
                Done(text: "\(score.label) \(n)/10")
            } else {
                VStack(spacing: 6) {
                    HStack(spacing: 6) {
                        stepButton("minus", by: -1)
                        ZStack {
                            Circle().stroke(.white.opacity(0.15), lineWidth: 7)
                            Circle()
                                .trim(from: 0, to: CGFloat(value - score.min + 1) / CGFloat(10 - score.min + 1))
                                .stroke(tint, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                                .animation(.easeOut(duration: 0.15), value: value)
                            Text("\(value)")
                                .font(.system(size: 46, weight: .bold, design: .rounded))
                                .foregroundStyle(tint)
                                .contentTransition(.numericText())
                        }
                        .frame(width: 92, height: 92)
                        .focusable()
                        .digitalCrownRotation($crown, from: Double(score.min), through: 10, by: 1,
                                              sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                        .accessibilityElement()
                        .accessibilityLabel(score.label)
                        .accessibilityValue("\(value) \(store.t("outOf10", "out of 10"))")
                        .accessibilityAdjustableAction { dir in
                            crown = Double(min(10, max(score.min, value + (dir == .increment ? 1 : -1))))
                        }
                        stepButton("plus", by: 1)
                    }
                    Text(store.t("turnCrown", "Turn the crown or tap − and +"))
                        .font(.system(size: 11)).foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center).lineLimit(2)
                    Button {
                        store.logScore(score, value)
                        saved = value
                        Task { try? await Task.sleep(nanoseconds: 1_300_000_000); dismiss() }
                    } label: {
                        Text(store.t("save", "Save")).font(.headline).foregroundStyle(.white)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(Capsule().fill(Brand.button))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .navigationTitle(score.label)
        .containerBackground(Brand.background, for: .navigation)
    }

    private func stepButton(_ icon: String, by step: Int) -> some View {
        Button {
            crown = Double(min(10, max(score.min, value + step)))
        } label: {
            Image(systemName: icon).font(.title3.bold()).foregroundStyle(.white)
                .frame(width: 34, height: 44)
                .background(RoundedRectangle(cornerRadius: 12).fill(Brand.card))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(icon == "plus" ? "+1" : "-1")
    }
}

// Events, like a stomach episode: one big button each. Tap once and it's logged.
struct EventGroupView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let group: WatchConfig.Group
    @State private var done: String?

    var body: some View {
        Group {
            if let label = done {
                Done(text: "\(label)\n\(store.t("logged", "Logged"))")
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(group.types) { type in
                            Button {
                                store.logEvent(type, group: group.title)
                                done = type.label
                                Task { try? await Task.sleep(nanoseconds: 1_300_000_000); dismiss() }
                            } label: {
                                Text(type.label).font(.headline).foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                                    .frame(maxWidth: .infinity, minHeight: 52)
                                    .padding(.horizontal, 8)
                                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.orange.opacity(0.3)))
                                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.orange.opacity(0.8), lineWidth: 1.5))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .navigationTitle(group.title)
        .containerBackground(Brand.background, for: .navigation)
    }
}

// A lab result or medicine change, by voice. The watch's own dictation turns speech into words; the words go to the
// phone, which shows the patient what it understood before saving.
struct VoiceView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let ask: String
    let hint: String
    @State private var said = ""
    @State private var sent = false

    var body: some View {
        Group {
            if sent {
                VStack(spacing: 6) {
                    Done(text: store.t("logged", "Logged"))
                    Text(store.t("checkOnPhone", "You'll check it on your iPhone before it's saved."))
                        .font(.footnote).multilineTextAlignment(.center).foregroundStyle(.white.opacity(0.8))
                }
            } else if said.isEmpty {
                ScrollView {
                    VStack(spacing: 10) {
                        TextFieldLink(prompt: Text(hint)) {
                            VStack(spacing: 4) {
                                ZStack {
                                    Circle().fill(Brand.button)
                                    Image(systemName: "mic.fill").font(.system(size: 30, weight: .bold)).foregroundStyle(.white)
                                }
                                .frame(width: 76, height: 76)
                                Text(store.t("speak", "Speak")).font(.headline).foregroundStyle(.white)
                            }
                        } onSubmit: { said = $0 }
                        .buttonStyle(.plain)
                        Text(hint).font(.footnote).multilineTextAlignment(.center).foregroundStyle(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(store.t("youSaid", "You said")).font(.caption2.bold()).foregroundStyle(Brand.cyan)
                        Text("“\(said)”").font(.body).foregroundStyle(.white)
                            .padding(8).frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Brand.card))
                        Button {
                            store.logVoice(said, ask: ask)
                            sent = true
                            Task { try? await Task.sleep(nanoseconds: 2_500_000_000); dismiss() }
                        } label: {
                            Text(store.t("send", "Send")).font(.headline).foregroundStyle(.white)
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .background(Capsule().fill(Brand.button))
                        }
                        .buttonStyle(.plain)
                        TextFieldLink(prompt: Text(hint)) {
                            Text(store.t("again", "Try again")).font(.headline).foregroundStyle(.white)
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .background(Capsule().fill(Brand.card))
                        } onSubmit: { said = $0 }
                        .buttonStyle(.plain)
                        Text(store.t("checkOnPhone", "You'll check it on your iPhone before it's saved."))
                            .font(.footnote).foregroundStyle(.white.opacity(0.7))
                    }
                }
            }
        }
        .containerBackground(Brand.background, for: .navigation)
    }
}
