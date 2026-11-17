import SwiftUI

// My Rare Disease Tracker for Apple Watch.
// The iPhone app tells the watch which Quick Log buttons to show (the disease chosen in the profile, in the patient's
// language). What the patient taps or says here goes straight to their iPhone over Apple's WatchConnectivity link,
// never to a server, and is added to the record on the phone.
@main
struct MRDTWatchApp: App {
    @StateObject private var store = WatchStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
