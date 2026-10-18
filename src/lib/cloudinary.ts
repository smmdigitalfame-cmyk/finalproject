import { supabase } from "@/integrations/supabase/client";
import { createUploadQueue, isTransientUploadError } from "./uploadControl";

const runUpload = createUploadQueue(2);
const pendingUploads = new WeakMap<File, Promise<CloudinaryUploadResult>>();

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
}

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const isHeicFile = (file: File) => {
  const fileName = file.name.toLowerCase();
  return HEIC_MIME_TYPES.has(file.type) || fileName.endsWith(".heic") || fileName.endsWith(".heif");
};

const supportsWebP = (() => {
  try {
    return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

const compressImage = (file: Blob, maxWidth = 1080, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    if (file.size < 500 * 1024) { resolve(file); return; }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxWidth / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Prefer WebP for ~30% smaller files → faster LCP on image-heavy pages
      const mime = supportsWebP ? "image/webp" : "image/jpeg";
      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob && blob.size < file.size ? blob : file);
      }, mime, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};


const convertHeicToJpeg = async (file: File): Promise<Blob> => {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;

  if (!(blob instanceof Blob)) {
    throw new Error("HEIC conversion failed");
  }

  return blob;
};

const prepareImageForUpload = async (file: File) => {
  let uploadBlob: Blob | File = file;
  let contentType = file.type || "image/jpeg";
  let fallbackExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

  if (isHeicFile(file)) {
    uploadBlob = await convertHeicToJpeg(file);
    contentType = uploadBlob.type || "image/jpeg";
    fallbackExtension = "jpg";
  }

  uploadBlob = await compressImage(uploadBlob);
  contentType = uploadBlob.type || contentType || "image/jpeg";

  return { uploadBlob, contentType, fallbackExtension };
};

export const getLocalPreview = (file: File): string => URL.createObjectURL(file);

const getExtensionFromMimeType = (mimeType: string, fallback: string) => {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return fallback;
  }
};

export const uploadToCloudinary = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> => {
  const existing = pendingUploads.get(file);
  if (existing) return existing;
  const task = runUpload(() => uploadFile(file, onProgress));
  pendingUploads.set(file, task);
  try { return await task; }
  finally { pendingUploads.delete(file); }
};

const uploadFile = async (file: File, onProgress?: (percent: number) => void): Promise<CloudinaryUploadResult> => {
  if (!file.size) throw new Error("The selected file is empty. Please choose another file.");
  const isVideo = file.type.startsWith("video/") || (!file.type && /\.(mp4|webm|mov|m4v)$/i.test(file.name));
  if (!isVideo && !file.type.startsWith("image/") && !/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(file.name)) throw new Error("Choose an image or video file.");
  const resourceType = isVideo ? "video" : "image";
  const originalExt = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");

  let uploadBlob: File | Blob = file;
  let uploadContentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");
  let fallbackExtension = originalExt;

  if (!isVideo) {
    try {
      const prepared = await prepareImageForUpload(file);
      uploadBlob = prepared.uploadBlob;
      uploadContentType = prepared.contentType;
      fallbackExtension = prepared.fallbackExtension;
    } catch (err) {
      console.warn("Compression failed, using original file:", err);
      uploadBlob = file;
      uploadContentType = file.type || "image/jpeg";
    }
  }

  const ext = getExtensionFromMimeType(uploadContentType, fallbackExtension);
  const fileName = `${resourceType}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  if (onProgress) onProgress(10);

  let result = await supabase.storage
    .from("media")
    .upload(fileName, uploadBlob, {
      contentType: uploadContentType,
      upsert: false,
    });

  for (let attempt = 0; result.error && isTransientUploadError(result.error) && attempt < 2; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 250));
    result = await supabase.storage.from("media").upload(fileName, uploadBlob, { contentType: uploadContentType, upsert: false });
  }
  if (result.error || !result.data) {
    const message = result.error?.message ?? "No file was returned";
    throw new Error(/bucket.*not found/i.test(message) ? "Uploads are unavailable: media storage needs to be enabled." : `Upload failed: ${message}`);
  }

  if (onProgress) onProgress(90);

  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(result.data.path);

  if (onProgress) onProgress(100);

  return {
    secure_url: urlData.publicUrl,
    public_id: result.data.path,
    resource_type: resourceType,
    format: ext,
  };
};
