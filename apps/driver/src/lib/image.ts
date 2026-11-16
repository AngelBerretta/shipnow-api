import imageCompression from 'browser-image-compression';

const MAX_BYTES = 5 * 1024 * 1024; // mismo límite que la API (multer.config.js)

/**
 * Prepara la foto del comprobante: la reduce (~1 MB, 1600 px) y la pasa a JPEG, que la API acepta.
 * Una foto de cámara pesa 3-8 MB y no entraría en el límite de 5 MB ni en una conexión floja.
 */
export async function prepareProof(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    });
    return new File([compressed], `comprobante-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } catch {
    if (file.size <= MAX_BYTES && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    throw new Error('No se pudo procesar la foto. Probá sacarla de nuevo.');
  }
}