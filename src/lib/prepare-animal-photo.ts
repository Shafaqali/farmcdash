const preparedPhotos = new WeakSet<File>();
/** Downsize new raster photos locally; existing stored originals are untouched. */
export async function prepareAnimalPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|bmp)$/.test(file.type)) throw new Error("Choose a JPG, PNG, WebP or BMP photo.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose a photo smaller than 15 MB.");
  if (preparedPhotos.has(file)) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This photo could not be opened. Choose a JPG, PNG or WebP image.")); image.src = url; });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1 && file.size <= 350_000) { preparedPhotos.add(file); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo resizing is unavailable. Please try again.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.82));
    if (!blob) throw new Error("Photo resizing failed. Please try another image.");
    if (scale === 1 && blob.size >= file.size) { preparedPhotos.add(file); return file; }
    const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    const prepared = new File([blob], `animal-photo.${extension}`, { type: blob.type, lastModified: file.lastModified });
    preparedPhotos.add(prepared);
    return prepared;
  } finally { URL.revokeObjectURL(url); }
}
