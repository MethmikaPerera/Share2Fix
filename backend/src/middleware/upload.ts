import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/errors';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

function build(maxFiles: number) {
  return multer({
    storage,
    limits: { fileSize: MAX_IMAGE_BYTES, files: maxFiles, fields: 20, fieldSize: 20_000 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
        return cb(AppError.badRequest('Only JPEG, PNG and WebP images are allowed', undefined, 'INVALID_FILE_TYPE'));
      }
      cb(null, true);
    },
  });
}

/** Accepts up to `maxFiles` images in the `images` multipart field. Always safe to use on JSON requests too. */
export const uploadImages = (maxFiles: number) => {
  const handler = build(maxFiles).array('images', maxFiles);
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(413, 'FILE_TOO_LARGE', `Each image must be ${MAX_IMAGE_BYTES / 1024 / 1024} MB or smaller`));
        }
        return next(AppError.badRequest(`Upload error: ${err.message}`, undefined, 'UPLOAD_ERROR'));
      }
      next(err);
    });
  };
};

export function getFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}
