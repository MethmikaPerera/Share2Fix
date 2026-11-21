import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../config/firebase';
import { usersRepo } from '../repositories/users.repository';
import type { AuthUser } from '../types';
import { AppError } from '../utils/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Set by verifyTokenOnly (used before a Firestore profile exists). */
      firebaseUser?: { uid: string; email: string };
    }
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function verify(token: string) {
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired authentication token');
  }
}

/** Verifies the Firebase ID token only. Used for first-time profile creation. */
export async function verifyTokenOnly(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) throw AppError.unauthorized();
  const decoded = await verify(token);
  if (!decoded.email) throw AppError.forbidden('Account has no email address');
  req.firebaseUser = { uid: decoded.uid, email: decoded.email };
  next();
}

/** Verifies the token AND loads the profile. The role always comes from Firestore, never the client. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) throw AppError.unauthorized();
  const decoded = await verify(token);
  const profile = await usersRepo.get(decoded.uid);
  if (!profile) throw AppError.forbidden('Profile not found. Complete registration first.', 'PROFILE_REQUIRED');
  if (!profile.isActive) throw AppError.forbidden('This account has been deactivated', 'ACCOUNT_DISABLED');
  req.user = {
    uid: profile.uid,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    authorityId: profile.authorityId ?? null,
  };
  next();
}

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    await authenticate(req, res, () => undefined);
  } catch {
    req.user = undefined;
  }
  next();
}
