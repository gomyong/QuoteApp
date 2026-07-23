package app.quote.note;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * On-device OCR via Google ML Kit Text Recognition (Latin + Korean).
 *
 * Mirrors the iOS AppleVisionOcr plugin JS contract so ocr.native.ts can call
 * a single Capacitor plugin name on both platforms — except Android registers
 * this as "MlKitOcr" and the JS layer routes by platform.
 *
 * Korean books need the Korean script pack; English titles need Latin. We run
 * both recognizers and merge blocks top-to-bottom.
 */
@CapacitorPlugin(name = "MlKitOcr")
public class MlKitOcrPlugin extends Plugin {
    private static final String TAG = "MlKitOcr";

    private final TextRecognizer latinRecognizer =
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    private final TextRecognizer koreanRecognizer =
            TextRecognition.getClient(new KoreanTextRecognizerOptions.Builder().build());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void recognize(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null || base64.isEmpty()) {
            call.reject("Missing 'base64'");
            return;
        }
        int rotation = call.getInt("rotation", 0);

        executor.execute(() -> {
            try {
                byte[] bytes = Base64.decode(stripDataUrlPrefix(base64), Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bitmap == null) {
                    call.reject("Could not decode base64 image");
                    return;
                }

                InputImage image = InputImage.fromBitmap(bitmap, normalizeRotation(rotation));

                Text latin = Tasks.await(latinRecognizer.process(image));
                Text korean = Tasks.await(koreanRecognizer.process(image));

                List<BlockOut> merged = mergeBlocks(latin, korean);
                merged.sort(Comparator.comparingInt((BlockOut b) -> b.top)
                        .thenComparingInt(b -> b.left));

                JSArray blocks = new JSArray();
                StringBuilder full = new StringBuilder();
                for (int i = 0; i < merged.size(); i++) {
                    BlockOut b = merged.get(i);
                    if (i > 0) full.append('\n');
                    full.append(b.text);

                    JSObject box = new JSObject();
                    box.put("left", b.left);
                    box.put("top", b.top);
                    box.put("right", b.right);
                    box.put("bottom", b.bottom);

                    JSObject block = new JSObject();
                    block.put("text", b.text);
                    block.put("confidence", b.confidence);
                    block.put("boundingBox", box);
                    blocks.put(block);
                }

                JSObject result = new JSObject();
                result.put("text", full.toString());
                result.put("blocks", blocks);
                result.put("engine", "MlKit");
                Log.i(TAG, "OK — " + merged.size() + " lines");
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "recognize failed", e);
                call.reject("ML Kit error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void supportedLanguages(PluginCall call) {
        JSObject result = new JSObject();
        JSArray langs = new JSArray();
        langs.put("ko");
        langs.put("en");
        result.put("languages", langs);
        call.resolve(result);
    }

    private static int normalizeRotation(int rotation) {
        int r = ((rotation % 360) + 360) % 360;
        if (r == 90 || r == 180 || r == 270) return r;
        return 0;
    }

    private static String stripDataUrlPrefix(String s) {
        int idx = s.indexOf("base64,");
        return idx >= 0 ? s.substring(idx + "base64,".length()) : s;
    }

    private static List<BlockOut> mergeBlocks(Text latin, Text korean) {
        List<BlockOut> out = new ArrayList<>();
        addLines(out, korean);
        addLines(out, latin);
        // Drop near-duplicate lines (same text, overlapping box).
        List<BlockOut> deduped = new ArrayList<>();
        for (BlockOut candidate : out) {
            boolean dup = false;
            for (BlockOut existing : deduped) {
                if (existing.text.equals(candidate.text)
                        && boxesOverlap(existing, candidate)) {
                    dup = true;
                    break;
                }
            }
            if (!dup) deduped.add(candidate);
        }
        return deduped;
    }

    private static void addLines(List<BlockOut> out, Text text) {
        if (text == null) return;
        for (Text.TextBlock block : text.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                android.graphics.Rect box = line.getBoundingBox();
                if (box == null) continue;
                String t = line.getText();
                if (t == null || t.trim().isEmpty()) continue;
                float conf = line.getConfidence();
                out.add(new BlockOut(
                        t.trim(),
                        conf,
                        box.left,
                        box.top,
                        box.right,
                        box.bottom
                ));
            }
        }
    }

    private static boolean boxesOverlap(BlockOut a, BlockOut b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    private static final class BlockOut {
        final String text;
        final float confidence;
        final int left;
        final int top;
        final int right;
        final int bottom;

        BlockOut(String text, float confidence, int left, int top, int right, int bottom) {
            this.text = text;
            this.confidence = confidence;
            this.left = left;
            this.top = top;
            this.right = right;
            this.bottom = bottom;
        }
    }
}
