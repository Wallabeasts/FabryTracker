import SwiftUI
import WidgetKit

// Watch face complication for My Rare Disease Tracker.
// It shows the app's ribbon logo (and, where there's room, "Quick log") and opens the watch app when tapped.
// It holds no health information, so nothing private ever shows on the watch face.

struct ComplicationEntry: TimelineEntry {
    let date: Date
}

struct ComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> ComplicationEntry { ComplicationEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> Void) {
        completion(ComplicationEntry(date: .now))
    }

    // The complication never changes, so one entry is enough and it never needs refreshing.
    func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
        completion(Timeline(entries: [ComplicationEntry(date: .now)], policy: .never))
    }
}

// "Quick log" in the watch's language (the same words the app uses).
private func quickLog() -> String {
    switch Locale.current.language.languageCode?.identifier ?? "en" {
    case "de": return "Schnellerfassung"
    case "es": return "Registro rápido"
    case "fr": return "Saisie rapide"
    case "it": return "Registrazione rapida"
    case "pt": return "Registro rápido"
    case "nb", "no", "nn": return "Hurtigregistrering"
    case "zh": return "快速记录"
    case "ja": return "クイック記録"
    case "ar": return "تسجيل سريع"
    default: return "Quick log"
    }
}

private let cyan = Color(red: 0.275, green: 0.784, blue: 0.902) // #46C8E6, the app's accent

struct ComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    private var logo: some View {
        Image("ComplicationLogo")
            .resizable()
            .scaledToFit()
            .widgetAccentable()
            .accessibilityLabel("My Rare Disease Tracker")
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                logo.padding(3)
            }
        case .accessoryCorner:
            logo
                .padding(2)
                .widgetLabel { Text(quickLog()) }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                logo.frame(width: 42, height: 42)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Rare Disease Tracker")
                        .font(.headline)
                        .foregroundStyle(cyan)
                        .widgetAccentable()
                        .lineLimit(2)
                        .minimumScaleFactor(0.7)
                    Text(quickLog())
                        .font(.caption)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Spacer(minLength: 0)
            }
        case .accessoryInline:
            // A single line of text: watch faces only allow a symbol and words here.
            Label(quickLog(), systemImage: "heart.text.square")
        default:
            logo
        }
    }
}

@main
struct MRDTComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MRDTComplication", provider: ComplicationProvider()) { entry in
            ComplicationView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("My Rare Disease Tracker")
        .description("Open Quick Log from your watch face.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
    }
}
