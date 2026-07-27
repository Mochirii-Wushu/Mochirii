"use client";

export const galleryThumbnailMimeType = "image/webp";
export const galleryThumbnailMaximumBytes = 80 * 1024;
export const galleryThumbnailMaximumEdge = 720;

export type GalleryThumbnailPayload = {
  base64: string;
  mime_type: typeof galleryThumbnailMimeType;
  size_bytes: number;
  width: number;
  height: number;
};

type DrawableImage = ImageBitmap | HTMLImageElement;

const edgeSteps = [720, 640, 560, 480, 400, 320, 240, 180] as const;
const qualitySteps = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32] as const;

function canvasBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, galleryThumbnailMimeType, quality)
  );
}

function loadHtmlImage(
  blob: Blob,
): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    image.onload = () =>
      resolve({ image, revoke: () => URL.revokeObjectURL(objectUrl) });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The gallery image could not be decoded."));
    };
    image.src = objectUrl;
  });
}

async function decodeImage(
  blob: Blob,
): Promise<
  { image: DrawableImage; width: number; height: number; release: () => void }
> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Some otherwise supported images or engines can reject ImageBitmap decoding.
      // The ordinary image decoder remains the compatible, bounded fallback.
    }
  }

  const loaded = await loadHtmlImage(blob);
  return {
    image: loaded.image,
    width: loaded.image.naturalWidth,
    height: loaded.image.naturalHeight,
    release: loaded.revoke,
  };
}

function boundedDimensions(width: number, height: number, maximumEdge: number) {
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return btoa(binary);
}

export async function createGalleryThumbnail(
  sourceUrl: string,
): Promise<GalleryThumbnailPayload> {
  const response = await fetch(sourceUrl, {
    credentials: "omit",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("The gallery image preview could not be loaded.");
  }

  const sourceBlob = await response.blob();
  if (!sourceBlob.type.startsWith("image/")) {
    throw new Error("The gallery image preview was not an image.");
  }

  const decoded = await decodeImage(sourceBlob);
  if (decoded.width < 1 || decoded.height < 1) {
    decoded.release();
    throw new Error("The gallery image has invalid dimensions.");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    decoded.release();
    throw new Error("This browser could not prepare the gallery image.");
  }

  try {
    for (const maximumEdge of edgeSteps) {
      const dimensions = boundedDimensions(
        decoded.width,
        decoded.height,
        maximumEdge,
      );
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      context.drawImage(
        decoded.image,
        0,
        0,
        dimensions.width,
        dimensions.height,
      );

      for (const quality of qualitySteps) {
        const thumbnail = await canvasBlob(canvas, quality);
        if (!thumbnail || thumbnail.type !== galleryThumbnailMimeType) continue;
        if (
          thumbnail.size < 1 || thumbnail.size > galleryThumbnailMaximumBytes
        ) continue;

        return {
          base64: await blobToBase64(thumbnail),
          mime_type: galleryThumbnailMimeType,
          size_bytes: thumbnail.size,
          width: dimensions.width,
          height: dimensions.height,
        };
      }
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    decoded.release();
  }

  throw new Error(
    "This image could not be reduced to the gallery thumbnail limit.",
  );
}
