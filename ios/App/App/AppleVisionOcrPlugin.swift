import Foundation
import Capacitor
import Vision
import UIKit

/**
 * On-device OCR using Apple's Vision framework (`VNRecognizeTextRequest`).
 *
 * Why this exists:
 *   - Apple Vision is the best Korean OCR available on iOS (16+) — same engine
 *     as the system "Live Text". No language pack download, works offline,
 *     adds 0 MB to the app, and is faster than ML Kit / tesseract.
 *   - Capacitor 8's iOS project is SPM-mode, so third-party CocoaPods-only
 *     OCR plugins (e.g. @pantrist/...-ml-kit-text-recognition) fail to register
 *     ("plugin is not implemented on ios"). Owning a tiny in-app plugin
 *     sidesteps that entirely.
 *
 * JS side calls it via:
 *   import { registerPlugin } from "@capacitor/core";
 *   const AppleVisionOcr = registerPlugin<{ recognize(...) }>("AppleVisionOcr");
 */
@objc(AppleVisionOcrPlugin)
public class AppleVisionOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleVisionOcrPlugin"
    public let jsName = "AppleVisionOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "supportedLanguages", returnType: CAPPluginReturnPromise)
    ]

    public override init() {
        super.init()
        NSLog("[AppleVisionOcr] plugin instance constructed (jsName=\(jsName))")
    }

    public override func load() {
        super.load()
        NSLog("[AppleVisionOcr] plugin loaded by Capacitor bridge")
    }

    @objc func recognize(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64") else {
            call.reject("Missing 'base64'")
            return
        }
        let rotation = call.getInt("rotation") ?? 0
        let level = call.getString("level") ?? "accurate" // "accurate" | "fast"
        let langs = call.getArray("languages", String.self)

        guard let data = Data(base64Encoded: stripDataUrlPrefix(base64)) else {
            call.reject("Could not decode base64 image")
            return
        }
        guard let uiImage = UIImage(data: data), let cgImage = uiImage.cgImage else {
            call.reject("Could not load image from base64 data")
            return
        }

        let orientation: CGImagePropertyOrientation = {
            switch rotation {
            case 90:  return .right
            case 180: return .down
            case 270: return .left
            default:  return .up
            }
        }()

        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest { (req, error) in
                if let error = error {
                    NSLog("[AppleVisionOcr] Vision error: \(error.localizedDescription)")
                    call.reject("Vision error: \(error.localizedDescription)")
                    return
                }
                guard let observations = req.results as? [VNRecognizedTextObservation] else {
                    call.resolve(["text": "", "blocks": []])
                    return
                }

                let imgW = CGFloat(cgImage.width)
                let imgH = CGFloat(cgImage.height)
                var blocks: [[String: Any]] = []
                var fullTextLines: [String] = []

                for obs in observations {
                    guard let candidate = obs.topCandidates(1).first else { continue }
                    let s = candidate.string
                    fullTextLines.append(s)

                    // Vision returns normalized boundingBox in [0,1] with origin
                    // at bottom-left. Convert to image-pixel space with origin
                    // at top-left so JS code can draw it directly.
                    let bb = obs.boundingBox
                    let left   = Int(bb.minX * imgW)
                    let right  = Int(bb.maxX * imgW)
                    let top    = Int((1.0 - bb.maxY) * imgH)
                    let bottom = Int((1.0 - bb.minY) * imgH)

                    blocks.append([
                        "text": s,
                        "confidence": candidate.confidence,
                        "boundingBox": [
                            "left": left,
                            "top": top,
                            "right": right,
                            "bottom": bottom
                        ]
                    ])
                }

                let usedLangs = (req as? VNRecognizeTextRequest)?.recognitionLanguages ?? []
                NSLog("[AppleVisionOcr] OK — \(observations.count) lines, langs=\(usedLangs)")
                call.resolve([
                    "text": fullTextLines.joined(separator: "\n"),
                    "blocks": blocks,
                    "engine": "AppleVision"
                ])
            }

            request.recognitionLevel = (level == "fast") ? .fast : .accurate
            request.usesLanguageCorrection = true
            request.minimumTextHeight = 0.0

            // Force Korean + English; do NOT auto-detect. Auto-detect frequently
            // mis-classifies Hangul as Latin/CJK ideographs and ruins accuracy.
            // Korean is supported by Apple Vision starting iOS 16.0.
            let requested = langs ?? ["ko-KR", "en-US"]
            let supported = (try? request.supportedRecognitionLanguages()) ?? []
            let filtered = requested.filter { supported.contains($0) }
            request.recognitionLanguages = filtered.isEmpty ? requested : filtered
            if #available(iOS 16.0, *) {
                request.automaticallyDetectsLanguage = false
            }
            NSLog("[AppleVisionOcr] supported=\(supported)  using=\(request.recognitionLanguages)")

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
            do {
                try handler.perform([request])
            } catch {
                NSLog("[AppleVisionOcr] perform failed: \(error.localizedDescription)")
                call.reject("Vision perform failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func supportedLanguages(_ call: CAPPluginCall) {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        let langs = (try? req.supportedRecognitionLanguages()) ?? []
        call.resolve(["languages": langs])
    }

    private func stripDataUrlPrefix(_ s: String) -> String {
        if let range = s.range(of: "base64,") {
            return String(s[range.upperBound...])
        }
        return s
    }
}
