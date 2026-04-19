# PWA icons

Place the following files here for installable PWA support:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-maskable-512.png` (512×512, full bleed safe area for masking)
- `apple-touch-icon.png` (180×180)

These are referenced by `public/manifest.webmanifest` and `index.html` (apple-touch-icon link).

Tip: once you have `resources/icon.png`, you can resize it with any tool (e.g. ImageMagick):

```bash
magick resources/icon.png -resize 192x192 public/icons/icon-192.png
magick resources/icon.png -resize 512x512 public/icons/icon-512.png
magick resources/icon.png -resize 512x512 public/icons/icon-maskable-512.png
magick resources/icon.png -resize 180x180 public/icons/apple-touch-icon.png
```
