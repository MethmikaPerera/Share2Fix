import type { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { AppError } from '../utils/errors';
import { created, ok } from '../utils/response';

export const userController = {
  async createProfile(req: Request, res: Response) {
    if (!req.firebaseUser) throw AppError.unauthorized();
    created(res, await userService.createProfile(req.firebaseUser, req.body));
  },

  async me(req: Request, res: Response) {
    ok(res, await userService.me(req.user!.uid));
  },

  async updateMe(req: Request, res: Response) {
    ok(res, await userService.updateMe(req.user!.uid, req.body));
  },
};
