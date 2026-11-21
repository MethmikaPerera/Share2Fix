import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/**
 * Image storage on Cloudflare R2 (S3-compatible). Uploads always go through the Express backend,
 * so no R2 credentials ever reach the browser and no bucket CORS configuration is needed.
 */
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

type ImageType = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

/** Detects the real image type from magic bytes, so a renamed .exe/.html cannot slip through. */
function sniffImage(buf: Buffer): ImageType | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: 'image/png', ext: 'png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export type UploadFolder = 'reports' | 'resolutions';

export const storageService = {
  /** Validates and uploads images; returns public URLs. Rolls back already-uploaded files on failure. */
  async uploadImages(files: Express.Multer.File[], folder: UploadFolder, _ownerId: string): Promise<string[]> {
    // NOTE: the owner's uid is deliberately NOT part of the object key - image URLs are public and
    // must not let anyone link photos to a Firebase account.
    const month = new Date().toISOString().slice(0, 7);
    const prepared = files.map((f) => {
      const type = sniffImage(f.buffer);
      if (!type || type.mime !== f.mimetype) {
        throw AppError.badRequest(`"${f.originalname}" is not a valid JPEG, PNG or WebP image`, undefined, 'INVALID_FILE_TYPE');
      }
      return { file: f, type, key: `${folder}/${month}/${randomUUID()}.${type.ext}` };
    });

    const uploaded: string[] = [];
    try {
      for (const p of prepared) {
        await s3.send(
          new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: p.key,
            Body: p.file.buffer,
            ContentType: p.type.mime,
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        uploaded.push(p.key);
      }
    } catch (err) {
      await this.deleteKeys(uploaded);
      console.error('[storage] upload failed', err);
      throw new AppError(502, 'STORAGE_UNAVAILABLE', 'Image storage is temporarily unavailable. Please try again.');
    }
    return uploaded.map((k) => `${env.R2_PUBLIC_BASE_URL}/${k}`);
  },

  async deleteKeys(keys: string[]) {
    await Promise.allSettled(keys.map((Key) => s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key }))));
  },

  async deleteByUrls(urls: string[]) {
    const prefix = `${env.R2_PUBLIC_BASE_URL}/`;
    await this.deleteKeys(urls.filter((u) => u.startsWith(prefix)).map((u) => u.slice(prefix.length)));
  },
};
