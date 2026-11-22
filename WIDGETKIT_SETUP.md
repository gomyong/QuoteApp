# iOS WidgetKit Extension Setup Guide

The JS layer (`src/features/widget/widgetBridge.ts`) already keeps an up-to-date
JSON snapshot of `dailyQuote` and `recentQuotes` on every save/edit/delete/favorite:

1. Stored in `Preferences` (`quote.widget.snapshot.v1`)
2. Written to `Directory.Data/widget-snapshot.json`
3. Forwarded to `WidgetBridge.updateSnapshot({ json })` whenever a native `WidgetBridge` plugin is registered in `AppDelegate.swift`.

To enable Home Screen & Lock Screen widgets in Xcode:

1. **App Group**
   - In Xcode, select **App** target → *Signing & Capabilities* → `+ Capability` → **App Groups** → add `group.app.quote.note`.
   - Repeat on the new Widget Extension target (`group.app.quote.note`).

2. **Add Widget Extension Target**
   - *File → New → Target → Widget Extension* (`QuoteWidget`, uncheck *Include Configuration App Intent* for a quick static timeline provider).

3. **Add `WidgetBridgePlugin.swift` to the `App` target** (and register `bridge.registerPluginInstance(WidgetBridgePlugin())` in `AppDelegate.swift`):
   ```swift
   import Foundation
   import Capacitor
   import WidgetKit

   @objc(WidgetBridgePlugin)
   public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
       public let identifier = "WidgetBridgePlugin"
       public let jsName = "WidgetBridge"
       public let pluginMethods: [CAPPluginMethod] = [
           CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise)
       ]

       @objc func updateSnapshot(_ call: CAPPluginCall) {
           let json = call.getString("json") ?? ""
           if let defaults = UserDefaults(suiteName: "group.app.quote.note") {
               defaults.set(json, forKey: "quote.widget.snapshot.v1")
           }
           if #available(iOS 14.0, *) {
               WidgetCenter.shared.reloadAllTimelines()
           }
           call.resolve()
       }
   }
   ```

4. **Read `quote.widget.snapshot.v1` inside `QuoteWidget.swift`** from `UserDefaults(suiteName: "group.app.quote.note")` to render:
   - `.systemSmall` / `.systemMedium` Home Screen widgets
   - `.accessoryRectangular` Lock Screen widget
   - StandBy desktop mode
