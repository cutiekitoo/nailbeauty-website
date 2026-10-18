import { supabase } from "../integrations/supabase/client";

export type UploadedImage = string; // Public URL

const MAX_BYTES = 2 * 1024 * 1024; // 2MB after optimization
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const BUCKET_NAME = "product-images";

function generateFileName(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Compress product photos in the browser before uploading them.
 * Raster images are resized to a maximum 1600px edge and encoded as WebP.
 * SVGs and GIFs are kept in their original format to preserve vector content
 * and animation.
 */
async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    if (file.size > MAX_BYTES) {
      throw new Error("SVG and GIF images must be smaller than 2MB");
    }
    return file;
  }

  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot optimize images. Please use a recent version of Chrome, Edge, or Firefox.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format cannot be processed by your browser. Please upload a JPG, PNG, or WebP image.");
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to optimize this image");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("WebP conversion failed. Please try another image."));
        },
        "image/webp",
        WEBP_QUALITY,
      );
    });

    if (blob.size > MAX_BYTES) {
      throw new Error("The optimized image is still larger than 2MB. Please choose a smaller image.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export const imageStorage = {
  async uploadImage(file: File): Promise<UploadedImage> {
    const optimizedFile = await optimizeImage(file);
    const extension =
      optimizedFile.type === "image/webp"
        ? "webp"
        : optimizedFile.name.split(".").pop()?.toLowerCase() || "img";
    const fileName = generateFileName(extension);
    const filePath = fileName;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, optimizedFile, {
        // Filenames are unique, so these optimized assets can be cached for a year.
        cacheControl: "31536000",
        upsert: false,
        contentType: optimizedFile.type,
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
