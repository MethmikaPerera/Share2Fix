import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types';
import { AppError } from '../utils/errors';

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };

export const requireStaff = requireRole('AUTHORITY_OFFICER', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');
