// One-off: shrink the logo inside resources/splash.png (and the dark
// variant) by 25% while keeping the overall canvas at its native
// 2732×2732 so `capacitor-assets generate` can still derive the full
// iOS/PWA splash set from it. We do this by downscaling the whole
// source and centering it on a fresh white canvas — since the source
// is "centered logo on solid white", the net effect is "logo smaller,
// background unchanged".
//
// Run with: node scripts/shrink-splash.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESOURCES = path.resolve(__dirname, "..", "resources");
const SCALE = 0.75; // 25% smaller logo

const shrink = async (file, bg) => {
  const src = path.join(RESOURCES, file);
  const meta = await sharp(src).metadata();
  const { width: W, height: H } = meta;
  if (!W || !H) throw new Error(`no dimensions for ${file}`);

  const innerW = Math.round(W * SCALE);
  const innerH = Math.round(H * SCALE);

  const inner = await sharp(src)
    .resize(innerW, innerH, { fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer();

  const out = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: bg,
    },
  })
    .composite([
      {
        input: inner,
        left: Math.round((W - innerW) / 2),
        top: Math.round((H - innerH) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(out).toFile(src);
  console.log(`✓ ${file}  ${W}×${H}  inner ${innerW}×${innerH}`);
};

await shrink("splash.png", { r: 255, g: 255, b: 255, alpha: 1 });
await shrink("splash-dark.png", { r: 255, g: 255, b: 255, alpha: 1 });
