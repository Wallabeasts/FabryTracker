import SwiftUI

struct ContentView: View {
    @Environment(WatchStore.self) private var store

    var body: some View {
        NavigationStack {
            List {
                if let cfg = store.config {
                    Section {
                        ForEach(cfg.scores) { score in
                            NavigationLink(score.label) { ScoreView(score: score) }
                        }
                        ForEach(cfg.groups) { group in
                            NavigationLink(group.title) { EventGroupView(group: group) }
                        }
                    } header: {
                        Text(cfg.who.map { $0.isEmpty ? cfg.disease : "\($0) · \(cfg.disease)" } ?? cfg.disease)
                    }
                    Section(store.t("byVoice", "By voice")) {
                        NavigationLink(store.t("speakLab", "Say a lab result")) {
                            VoiceView(ask: "lab", hint: store.t("labHint", "Say the test and its result, like: creatinine 1.2"))
                        }
                        NavigationLink(store.t("speakMed", "Say a medicine change")) {
                            VoiceView(ask: "med", hint: store.t("medHint", "Say the medicine's name, and whether you started it, stopped it or changed the dose."))
                        }
                    }
                    if !store.recent.isEmpty {
                        Section(store.t("recent", "Recent")) {
                            ForEach(Array(store.recent.enumerated()), id: \.offset) { _, line in
                                Text(line).font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                    }
                } else {
                    Text("Open My Rare Disease Tracker on your iPhone to set up your Quick Log.")
                        .font(.body)
                }
            }
            .navigationTitle(store.t("title", "Quick log"))
        }
    }
}

// A 1-to-10 score (or 0-to-10), as big buttons.
struct ScoreView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let score: WatchConfig.Score
    @State private var done: Int?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(score.prompt.isEmpty ? store.t("tapNumber", "Tap a number") : score.prompt)
                    .font(.footnote)
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 3), spacing: 6) {
                    ForEach(score.min...10, id: \.self) { n in
                        Button {
                            store.logScore(score, n)
                            done = n
                            Task { try? await Task.sleep(nanoseconds: 1_200_000_000); dismiss() }
                        } label: {
                            Text("\(n)").font(.title3.bold()).frame(maxWidth: .infinity, minHeight: 36)
                        }
                        .buttonStyle(.bordered)
                        .tint(n == done ? .green : nil)
                        .accessibilityLabel("\(score.label) \(n) \(store.t("outOf10", "out of 10"))")
                    }
                }
                if let n = done {
                    Label("\(store.t("logged", "Logged")): \(n)", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
        }
        .navigationTitle(score.label)
    }
}

// One-tap events, like a stomach episode or a migraine today.
struct EventGroupView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let group: WatchConfig.Group
    @State private var done: String?

    var body: some View {
        List {
            ForEach(group.types) { type in
                Button {
                    store.logEvent(type)
                    done = type.id
                    Task { try? await Task.sleep(nanoseconds: 1_200_000_000); dismiss() }
                } label: {
                    HStack {
                        Text(type.label).font(.headline)
                        Spacer()
                        if done == type.id { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green) }
                    }
                    .frame(minHeight: 44)
                }
                .accessibilityValue(done == type.id ? store.t("logged", "Logged") : "")
            }
            Text(store.t("savedNote", "Saved on your watch. It's added when you next open the app on your iPhone."))
                .font(.footnote).foregroundStyle(.secondary)
        }
        .navigationTitle(group.title)
    }
}

// A lab result or medicine change, by voice. The watch's own dictation turns speech into words; the words are sent
// to the phone, which shows the patient what it understood before saving.
struct VoiceView: View {
    @Environment(WatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let ask: String
    let hint: String
    @State private var said = ""
    @State private var sent = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if said.isEmpty {
                    Text(hint).font(.footnote)
                    TextFieldLink(prompt: Text(hint)) {
                        Label(store.t("speak", "Speak"), systemImage: "mic.fill").frame(maxWidth: .infinity, minHeight: 44)
                    } onSubmit: { said = $0 }
                    .buttonStyle(.borderedProminent)
                } else if sent {
                    Label(store.t("logged", "Logged"), systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                    Text(store.t("checkOnPhone", "You'll check it on your iPhone before it's saved.")).font(.footnote)
                } else {
                    Text(store.t("youSaid", "You said")).font(.footnote).foregroundStyle(.secondary)
                    Text("“\(said)”").font(.body)
                    Button {
                        store.logVoice(said, ask: ask)
                        sent = true
                        Task { try? await Task.sleep(nanoseconds: 2_500_000_000); dismiss() }
                    } label: {
                        Text(store.t("send", "Send")).frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    TextFieldLink(prompt: Text(hint)) {
                        Text(store.t("again", "Try again")).frame(maxWidth: .infinity, minHeight: 44)
                    } onSubmit: { said = $0 }
                    Text(store.t("checkOnPhone", "You'll check it on your iPhone before it's saved."))
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
    }
}
