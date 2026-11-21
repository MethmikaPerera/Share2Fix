import type { Request, Response } from 'express';
import { authorityService } from '../services/authority.service';
import { notificationService } from '../services/notification.service';
import { statsService } from '../services/stats.service';
import { userService } from '../services/user.service';
import { AppError } from '../utils/errors';
import { created, ok } from '../utils/response';

export const adminController = {
  async listUsers(_req: Request, res: Response) {
    ok(res, await userService.list());
  },
  async createUser(req: Request, res: Response) {
    created(res, await userService.adminCreate(req.body));
  },
  async updateUser(req: Request, res: Response) {
    ok(res, await userService.adminUpdate(req.user!.uid, res.locals.params.id, req.body));
  },

  async listAuthorities(_req: Request, res: Response) {
    ok(res, await authorityService.list(true));
  },
  async createAuthority(req: Request, res: Response) {
    created(res, await authorityService.create(req.body));
  },
  async updateAuthority(req: Request, res: Response) {
    ok(res, await authorityService.update(res.locals.params.id, req.body));
  },

  async platformStats(_req: Request, res: Response) {
    ok(res, await statsService.platform());
  },
};

export const sharedController = {
  async publicAuthorities(_req: Request, res: Response) {
    ok(res, await authorityService.list(false));
  },

  async publicStats(_req: Request, res: Response) {
    ok(res, await statsService.publicSummary());
  },

  async authorityStats(req: Request, res: Response) {
    const user = req.user!;
    const authorityId = user.role === 'ADMIN' ? (req.query.authorityId as string | undefined) : (user.authorityId ?? undefined);
    if (!authorityId) throw AppError.badRequest('No authority selected');
    ok(res, await statsService.forAuthority(authorityId));
  },

  async notifications(req: Request, res: Response) {
    ok(res, await notificationService.list(req.user!.uid));
  },
  async markNotificationRead(req: Request, res: Response) {
    await notificationService.markRead(req.user!.uid, res.locals.params.id);
    ok(res, { read: true });
  },
  async markAllNotificationsRead(req: Request, res: Response) {
    await notificationService.markAllRead(req.user!.uid);
    ok(res, { read: true });
  },
};
