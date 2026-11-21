import type { Request, Response } from 'express';
import { getFiles } from '../middleware/upload';
import { reportService } from '../services/report.service';
import { created, ok } from '../utils/response';
import type { ListReportsQuery, MapQuery } from '../validators/schemas';

const listFor = (scope: 'public' | 'mine' | 'managed') => async (req: Request, res: Response) => {
  const result = await reportService.list(req.user, res.locals.query as ListReportsQuery, scope);
  ok(res, result.items, { nextCursor: result.nextCursor, limit: result.limit });
};

export const reportController = {
  listPublic: listFor('public'),
  listMine: listFor('mine'),
  listManaged: listFor('managed'),

  async map(_req: Request, res: Response) {
    ok(res, await reportService.mapPins(res.locals.query as MapQuery));
  },

  async create(req: Request, res: Response) {
    created(res, await reportService.create(req.user!, req.body, getFiles(req)));
  },

  async analyze(req: Request, res: Response) {
    const [file] = getFiles(req);
    ok(res, await reportService.analyzePreview(req.body, file));
  },

  async get(req: Request, res: Response) {
    ok(res, await reportService.get(req.user, res.locals.params.id));
  },

  async timeline(_req: Request, res: Response) {
    ok(res, await reportService.timeline(res.locals.params.id));
  },

  async comments(req: Request, res: Response) {
    ok(res, await reportService.comments(req.user, res.locals.params.id));
  },

  async addComment(req: Request, res: Response) {
    created(
      res,
      await reportService.addComment(req.user!, res.locals.params.id, req.body.text, {
        flagAsFake: req.body.flagAsFake,
        flagReason: req.body.flagReason,
      }),
    );
  },

  async toggleSupport(req: Request, res: Response) {
    ok(res, await reportService.toggleSupport(req.user!, res.locals.params.id));
  },

  async verify(req: Request, res: Response) {
    ok(res, await reportService.verify(req.user!, res.locals.params.id, req.body));
  },

  async updateClassification(req: Request, res: Response) {
    ok(res, await reportService.updateClassification(req.user!, res.locals.params.id, req.body));
  },

  async updateStatus(req: Request, res: Response) {
    ok(res, await reportService.updateStatus(req.user!, res.locals.params.id, req.body, getFiles(req)));
  },

  async addProgress(req: Request, res: Response) {
    ok(res, await reportService.addProgress(req.user!, res.locals.params.id, req.body.explanation, getFiles(req)));
  },

  async reassign(req: Request, res: Response) {
    ok(res, await reportService.reassign(req.user!, res.locals.params.id, req.body.authorityId, req.body.reason));
  },

  async flag(req: Request, res: Response) {
    ok(res, await reportService.flagReport(req.user!, res.locals.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    ok(res, await reportService.remove(req.user!, res.locals.params.id));
  },

  async dismissFlags(req: Request, res: Response) {
    ok(res, await reportService.dismissFlags(req.user!, res.locals.params.id));
  },

  async listFlags(req: Request, res: Response) {
    ok(res, await reportService.listFlags(req.user!, res.locals.params.id));
  },
};
