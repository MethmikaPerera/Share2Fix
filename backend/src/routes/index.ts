import { Router } from 'express';
import { adminController, sharedController } from '../controllers/admin.controller';
import { reportController } from '../controllers/report.controller';
import { userController } from '../controllers/user.controller';
import { authenticate, optionalAuth, verifyTokenOnly } from '../middleware/auth';
import { strictLimiter, writeLimiter } from '../middleware/rateLimit';
import { requireAdmin, requireRole, requireStaff } from '../middleware/roles';
import { uploadImages } from '../middleware/upload';
import { validate } from '../middleware/validate';
import * as v from '../validators/schemas';

const api = Router();

// ------------------------------------------------------------ public / misc
api.get('/stats/public', sharedController.publicStats);
api.get('/authorities', sharedController.publicAuthorities);

// ---------------------------------------------------------- auth & profile
api.post('/auth/profile', strictLimiter, verifyTokenOnly, validate({ body: v.createProfileBody }), userController.createProfile);
api.get('/users/me', authenticate, userController.me);
api.patch('/users/me', authenticate, validate({ body: v.updateProfileBody }), userController.updateMe);

// -------------------------------------------------------------------- AI
api.post(
  '/ai/analyze',
  authenticate,
  strictLimiter,
  uploadImages(1),
  validate({ body: v.analyzeBody }),
  reportController.analyze,
);

// ---------------------------------------------------------------- reports
// NOTE: fixed paths (/map, /mine, /managed) must be declared before /:id
api.get('/reports', optionalAuth, validate({ query: v.listReportsQuery }), reportController.listPublic);
api.get('/reports/map', validate({ query: v.mapQuery }), reportController.map);
api.get('/reports/mine', authenticate, validate({ query: v.listReportsQuery }), reportController.listMine);
api.get('/reports/managed', authenticate, requireStaff, validate({ query: v.listReportsQuery }), reportController.listManaged);

api.post(
  '/reports',
  authenticate,
  requireRole('CITIZEN'),
  strictLimiter,
  uploadImages(4),
  validate({ body: v.createReportBody }),
  reportController.create,
);

const withId = validate({ params: v.idParams });
api.get('/reports/:id', optionalAuth, withId, reportController.get);
api.get('/reports/:id/timeline', withId, reportController.timeline);
api.get('/reports/:id/comments', optionalAuth, withId, reportController.comments);
api.post('/reports/:id/comments', authenticate, writeLimiter, withId, validate({ body: v.commentBody }), reportController.addComment);
api.post('/reports/:id/support', authenticate, requireRole('CITIZEN'), writeLimiter, withId, reportController.toggleSupport);
api.post(
  '/reports/:id/verify',
  authenticate,
  requireRole('CITIZEN'),
  writeLimiter,
  withId,
  validate({ body: v.verifyBody }),
  reportController.verify,
);
api.patch(
  '/reports/:id/classification',
  authenticate,
  writeLimiter,
  withId,
  validate({ body: v.classificationBody }),
  reportController.updateClassification,
);

api.post(
  '/reports/:id/flag',
  authenticate,
  requireRole('CITIZEN'),
  writeLimiter,
  withId,
  validate({ body: v.flagReportBody }),
  reportController.flag,
);

api.delete('/reports/:id', authenticate, withId, reportController.remove);
api.post('/reports/:id/dismiss-flags', authenticate, requireAdmin, withId, reportController.dismissFlags);
api.get('/reports/:id/flags', authenticate, requireAdmin, withId, reportController.listFlags);

// Authority / admin operations (ownership of the report is re-checked in the service)
api.post(
  '/reports/:id/status',
  authenticate,
  requireStaff,
  withId,
  uploadImages(4),
  validate({ body: v.statusUpdateBody }),
  reportController.updateStatus,
);
api.post(
  '/reports/:id/progress',
  authenticate,
  requireStaff,
  withId,
  uploadImages(4),
  validate({ body: v.progressBody }),
  reportController.addProgress,
);
api.post(
  '/reports/:id/reassign',
  authenticate,
  requireStaff,
  withId,
  validate({ body: v.reassignBody }),
  reportController.reassign,
);

// ---------------------------------------------------------- notifications
api.get('/notifications', authenticate, sharedController.notifications);
api.post('/notifications/read-all', authenticate, sharedController.markAllNotificationsRead);
api.post('/notifications/:id/read', authenticate, withId, sharedController.markNotificationRead);

// ------------------------------------------------------------------ stats
api.get('/stats/authority', authenticate, requireStaff, sharedController.authorityStats);

// ------------------------------------------------------------------ admin
const admin = Router();
admin.use(authenticate, requireAdmin);
admin.get('/stats', adminController.platformStats);
admin.get('/users', adminController.listUsers);
admin.post('/users', validate({ body: v.adminCreateUserBody }), adminController.createUser);
admin.patch('/users/:id', withId, validate({ body: v.adminUpdateUserBody }), adminController.updateUser);
admin.get('/authorities', adminController.listAuthorities);
admin.post('/authorities', validate({ body: v.authorityBody }), adminController.createAuthority);
admin.patch('/authorities/:id', withId, validate({ body: v.authorityUpdateBody }), adminController.updateAuthority);
api.use('/admin', admin);

export default api;
