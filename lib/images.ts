import { supabase } from './supabase/client';

const MAX_SIDE = 1200;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).then((b) => ({ source: b, width: b.width, height: b.height, close: () => b.close() }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a readable image.')); };
    img.src = url;
  });
}

/**
 * Shrinks a phone photo (often 3-8 MB) to at most 1200px and ~100-250 KB as WebP, so product
 * pages load quickly on slow mobile networks. Falls back to JPEG where WebP encoding is missing.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use a JPG, PNG or WebP photo.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is larger than 12 MB. Choose a smaller one.');

  const bmp = await loadBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the photo on this device.');
    ctx.fillStyle = '#ffffff'; // transparent PNGs become white instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp.source, 0, 0, canvas.width, canvas.height);

    const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    const webp = await toBlob('image/webp', 0.8);
    const out = webp && webp.type === 'image/webp' ? webp : await toBlob('image/jpeg', 0.8);
    if (!out) throw new Error('Could not compress the photo.');
    return out;
  } finally {
    bmp.close();
  }
}

/** Compresses and uploads a product photo to the public product-images bucket; returns its URL. */
export async function uploadProductImage(file: File, userId: string): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message.includes('not found') ? 'Photo uploads are not set up yet. Paste image links instead.' : error.message);
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
