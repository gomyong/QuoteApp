import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Capacitor 8 (SPM mode) only auto-discovers plugins shipped via a
        // Swift Package manifest. In-app plugins (like our AppleVisionOcrPlugin
        // living in the App target) are NOT picked up automatically — even
        // though the class loads fine into the Obj-C runtime.
        //
        // We register the plugin instance against the bridge as soon as the
        // root CAPBridgeViewController (declared in Main.storyboard) is in
        // place. This must happen before any JS code calls
        // `Capacitor.isPluginAvailable("AppleVisionOcr")`, which it doesn't
        // until the user triggers OCR — so a deferred async dispatch is safe.
        registerInAppPlugins()
        return true
    }

    private func registerInAppPlugins() {
        let attempt: () -> Bool = { [weak self] in
            guard let bridgeVC = self?.window?.rootViewController as? CAPBridgeViewController,
                  let bridge = bridgeVC.bridge else {
                return false
            }
            bridge.registerPluginInstance(AppleVisionOcrPlugin())
            NSLog("[AppDelegate] Registered AppleVisionOcrPlugin against Capacitor bridge")
            return true
        }

        // Try a few times across the next run-loop ticks because the bridge
        // is created lazily by CAPBridgeViewController.viewDidLoad().
        var remaining = 30
        func tick() {
            if attempt() { return }
            remaining -= 1
            if remaining <= 0 {
                NSLog("[AppDelegate] WARN: Could not find CAPBridgeViewController to register plugins")
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { tick() }
        }
        DispatchQueue.main.async { tick() }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
