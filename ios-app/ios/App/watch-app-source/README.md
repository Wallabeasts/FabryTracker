# Apple Watch app: one-time setup in Xcode

These three files are the whole watch app. Xcode has to create the watch "target" once; after that, the files are used
as they are.

1. Open `ios-app/ios/App/App.xcodeproj` in Xcode.
2. **File > New > Target…**, choose the **watchOS** tab, then **App**, then **Next**.
3. Product Name: `MRDT Watch`. Choose **Watch App for Existing iOS App**, and set the iOS app to **App**.
   Interface: SwiftUI. Leave tests unticked. Click **Finish** (and **Activate** if asked).
4. Xcode makes a folder named **MRDT Watch Watch App** with two Swift files. Delete both Swift files
   (`ContentView.swift` and `MRDT_WatchApp.swift`), choosing **Move to Trash**.
5. Drag `MRDTWatchApp.swift`, `WatchStore.swift` and `ContentView.swift` from this folder into that **MRDT Watch Watch App**
   folder in Xcode. When asked, tick **Copy items if needed** and only the **MRDT Watch Watch App** target.
6. App icon: in the watch folder, open Assets > AppIcon and drag in `WatchIcon-1024.png` from this folder (the zebra
   ribbon without the words, which are too small to read on a watch).
7. Select the **MRDT Watch Watch App** target > **General**: Minimum Deployments watchOS **10.0**; Version **3.29**,
   Build **3** (always the same as the iPhone app). Under **Signing & Capabilities**, choose your team.
8. Test: pick the **MRDT Watch Watch App** scheme and an Apple Watch simulator (Xcode pairs it with an iPhone simulator),
   or your own watch. Open the iPhone app once so it sends the watch its Quick Log.

The watch app is uploaded inside the iPhone app: Product > Archive on the **App** scheme includes it.
