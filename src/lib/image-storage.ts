import { supabase } from "../integrations/supabase/client";

export type UploadedImage = string; // Public URL

const MAX_SOURCE_BYTES = 12 * 1024 * 1024; // Raw image can be larger before optimization
const MAX_STORED_BYTES = 2 * 1024 * 1024; // Final uploaded image
const MAX_DIMENSION = 1600;
const BUCKET_NAME = "product-images";

type PreparedImage = {
  body: Blob;
  contentType: string;
  extension: string;
};

function getFileExtension(file: File): string {
  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : "img";
}

function generateFileName(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${extension}`;
}

function useOriginalImage(file: File): PreparedImage {
  return {
    body: file,
    contentType: file.type || "application/octet-stream",
    extension: getFileExtension(file),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

async function prepareImage(file: File): Promise<PreparedImage> {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file);

  // Preserve animated GIFs and SVG vector images instead of flattening them into a bitmap.
  if (mimeType === "image/gif" || mimeType === "image/svg+xml" || extension === "gif" || extension === "svg") {
    if (file.size > MAX_STORED_BYTES) {
      throw new Error("GIF and SVG files must be smaller than 2 MB.");
    }
    return useOriginalImage(file);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // If this browser cannot decode a format, allow it unchanged only when it already meets the storage limit.
    if (file.size <= MAX_STORED_BYTES) {
      return useOriginalImage(file);
    }
    throw new Error("This image format could not be optimized by your browser. Please use JPG, PNG, or WebP.");
  }

  try {
    const originalMaxDimension = Math.max(bitmap.width, bitmap.height);

    // An already optimized WebP does not need to be encoded again.
    if (
      mimeType === "image/webp" &&
      file.size <= MAX_STORED_BYTES &&
      originalMaxDimension <= MAX_DIMENSION
    ) {
      return {
        body: file,
        contentType: "image/webp",
        extension: "webp",
      };
    }

    const targetDimensions = [MAX_DIMENSION, 1400, 1200, 1000];
    const qualities = [0.82, 0.76, 0.7, 0.64, 0.58];

    for (const targetDimension of targetDimensions) {
      const scale = Math.min(1, targetDimension / originalMaxDimension);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        break;
      }

      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToWebp(canvas, quality);

        // Some browsers may not support WebP encoding through canvas.
        if (!blob || blob.type !== "image/webp") {
          if (file.size <= MAX_STORED_BYTES) {
            return useOriginalImage(file);
          }
          throw new Error("Your browser could not convert this image to WebP. Please try a JPG or PNG image.");
        }

        if (blob.size <= MAX_STORED_BYTES) {
          return {
            body: blob,
            contentType: "image/webp",
            extension: "webp",
          };
        }
      }
    }

    throw new Error("The optimized image is still larger than 2 MB. Please choose a smaller image.");
  } finally {
    bitmap.close();
  }
}

export const imageStorage = {
  async uploadImage(file: File): Promise<UploadedImage> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }
    if (file.size > MAX_SOURCE_BYTES) {
      throw new Error("The original image must be smaller than 12 MB.");
    }

    const preparedImage = await prepareImage(file);
    const fileName = generateFileName(preparedImage.extension);
    const filePath = fileName;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, preparedImage.body, {
        contentType: preparedImage.contentType,
        // Filenames are unique, so long-lived caching is safe.
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return publicUrl;
  },

  async uploadMany(files: FileList | File[]): Promise<UploadedImage[]> {
    const arr = Array.from(files);
    return Promise.all(arr.map((file) => this.uploadImage(file)));
  },

  async deleteImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const filePath = pathParts[pathParts.length - 1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  },

  async deleteMany(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.deleteImage(url)));
  },

  getPublicUrl(path: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
  },
};
