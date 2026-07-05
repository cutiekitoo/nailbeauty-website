import { supabase } from "../integrations/supabase/client";

export type UploadedImage = string; // Public URL

const MAX_BYTES = 2 * 1024 * 1024; // 2MB per image
const BUCKET_NAME = "product-images";

function generateFileName(file: File): string {
  const ext = file.name.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export const imageStorage = {
  async uploadImage(file: File): Promise<UploadedImage> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Image must be smaller than 2MB");
    }
    
    const fileName = generateFileName(file);
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return publicUrl;
  },
  
  async uploadMany(files: FileList | File[]): Promise<UploadedImage[]> {
    const arr = Array.from(files);
    return Promise.all(arr.map((f) => this.uploadImage(f)));
  },
  
  async deleteImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts[pathParts.length - 1];
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  },
  
  async deleteMany(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.deleteImage(url)));
  },
  
  getPublicUrl(path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    
    return publicUrl;
  },
};
