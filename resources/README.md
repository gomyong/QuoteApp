# App icon & splash sources

Drop the following two files into this folder, then run `npm run assets`:

- `icon.png` — **1024×1024** PNG (no rounded corners, full bleed, opaque). Used as the master icon for iOS, Android and PWA.
- `splash.png` — **2732×2732** PNG, with the logo centered in the middle ~40%. The outer area should be the brand color (`#1C2431`) — Capacitor crops/scales this for every device.

Optional dark variant (recommended for iOS/Android dark splash):

- `icon-foreground.png` — 1024×1024 transparent foreground (Android adaptive icon foreground)
- `icon-background.png` — 1024×1024 solid background (Android adaptive icon background, e.g. `#1C2431`)
- `splash-dark.png` — 2732×2732 splash for dark mode

Then generate platform assets:

```bash
npm run assets
```

This invokes `capacitor-assets generate` which writes:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset` and splash storyboard images
- Android: `android/app/src/main/res/mipmap-*` and splash images

Until you provide real PNGs, you can use any 1024×1024 placeholder; the `capacitor-assets` CLI will fail clearly if files are missing.
