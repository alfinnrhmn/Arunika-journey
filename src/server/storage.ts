import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Penyimpanan objek. Saat ini berkas disimpan di disk lokal (UPLOAD_DIR, bawaan ./uploads, di luar folder
 * public sehingga tidak pernah tersaji langsung). Antarmuka ini sengaja kecil agar nanti dapat diganti
 * driver S3/R2/MinIO tanpa mengubah kode pemakainya. Berkas bukti bayar hanya boleh dibaca lewat rute
 * yang memeriksa izin (admin), bukan lewat URL publik.
 */
export interface ObjectStorage {
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export function localStorage(dir: string = process.env.UPLOAD_DIR ?? './uploads'): ObjectStorage {
  const root = path.resolve(dir);
  // Kunci dibuat aplikasi (tanpa input pengguna), tetapi tetap dipagari agar tidak bisa keluar dari root.
  const resolveKey = (key: string) => {
    const full = path.resolve(root, key);
    if (full !== root && !full.startsWith(root + path.sep))
      throw new Error('Kunci penyimpanan tidak valid');
    return full;
  };
  return {
    async put(key, data) {
      const file = resolveKey(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    },
    async get(key) {
      return readFile(resolveKey(key));
    },
  };
}
