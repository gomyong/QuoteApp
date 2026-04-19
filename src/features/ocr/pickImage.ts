import { Capacitor } from "@capacitor/core";

export type PickedImage = {
  /** dataURL ready for <img src> and OCR */
  dataUrl: string;
  /** raw base64 (no prefix) */
  base64: string;
  /** mime type guess, e.g. image/jpeg */
  mimeType: string;
};

export type PickSource = "camera" | "library";

/** Pick or capture an image, returning a base64 data URL. */
export const pickImage = async (source: PickSource = "camera"): Promise<PickedImage | null> => {
  if (Capacitor.isNativePlatform()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
    });
    if (!photo?.base64String) return null;
    const mimeType = `image/${photo.format ?? "jpeg"}`;
    return {
      base64: photo.base64String,
      dataUrl: `data:${mimeType};base64,${photo.base64String}`,
      mimeType,
    };
  }

  return pickImageFromInput(source);
};

const pickImageFromInput = (source: PickSource): Promise<PickedImage | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => {
      input.value = "";
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        const base64 = dataUrl.includes("base64,") ? dataUrl.split("base64,")[1] : dataUrl;
        cleanup();
        resolve({ dataUrl, base64, mimeType: file.type || "image/jpeg" });
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsDataURL(file);
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    input.click();
  });
