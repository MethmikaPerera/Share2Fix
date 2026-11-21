import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import { authoritiesRepo } from '../repositories/authorities.repository';
import {
  assignmentsRepo,
  commentsRepo,
  flagsRepo,
  notificationsRepo,
  supportsRepo,
  timelineRepo,
  verificationsRepo,
} from '../repositories/activity.repository';
import { usersRepo } from '../repositories/users.repository';
import { reportsRepo, type ReportFilters } from '../repositories/reports.repository';
import type { AuthUser, Category, FlagReason, Priority, ReportDoc, Status, TimelineType, VerificationStatus } from '../types';
import { AppError } from '../utils/errors';
import {
  canManageReport,
  toCommentDto,
  toMapPin,
  toReportDto,
  toTimelineDto,
} from '../utils/mappers';
import { haversineKm } from '../utils/geo';
import { cleanText } from '../utils/text';
import type { CreateReportInput, ListReportsQuery, MapQuery } from '../validators/schemas';
import { aiService } from './ai.service';
import { behavioralService } from './behavioral.service';
import { suggestAuthority } from './routing.service';
import { storageService } from './storage.service';

/** Allowed status transitions. Verification by citizens never changes status (see verify()). */
const TRANSITIONS: Record<Status, Status[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['IN_PROGRESS'], // re-open, e.g. after disputed verification
  REJECTED: ['UNDER_REVIEW'], // reconsider
};

const EXPLANATION_REQUIRED: Status[] = ['RESOLVED', 'REJECTED'];

interface TimelineInput {
  reportId: string;
  type: TimelineType;
  previousStatus: Status | null;
  newStatus: Status | null;
  actor: { uid: string; name: string; role: AuthUser['role'] | 'SYSTEM' };
  explanation: string;
  evidenceUrls?: string[];
}

/** Both Transaction and WriteBatch satisfy this shape. */
type Writer = { set: (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) => unknown };

function timelineWrite(tx: Writer, input: TimelineInput) {
  const ref = timelineRepo.newRef();
  tx.set(ref, {
    eventId: ref.id,
    reportId: input.reportId,
    type: input.type,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    updatedBy: input.actor.uid,
    updatedByName: input.actor.name,
    updatedByRole: input.actor.role,
    explanation: input.explanation,
    evidenceUrls: input.evidenceUrls ?? [],
    createdAt: FieldValue.serverTimestamp(),
  });
}

function notifyWrite(
  tx: Writer,
  userId: string,
  reportId: string,
  type: 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'COMMENT' | 'RESOLUTION' | 'ADMIN_ALERT',
  message: string,
) {
  const ref = notificationsRepo.newRef();
  tx.set(ref, { notificationId: ref.id, userId, reportId, type, message, read: false, createdAt: FieldValue.serverTimestamp() });
}

async function alertAdmins(reportId: string, message: string) {
  try {
    const admins = await usersRepo.listAdmins();
    if (!admins.length) return;
    const batch = db.batch();
    for (const a of admins) {
      notifyWrite(batch, a.uid, reportId, 'ADMIN_ALERT', message);
    }
    await batch.commit();
  } catch (err) {
    console.warn('[report.service] alertAdmins failed', err);
  }
}

async function requireReport(id: string): Promise<ReportDoc> {
  const report = await reportsRepo.get(id);
  if (!report) throw AppError.notFound('Report not found');
  return report;
}

async function requireManageable(user: AuthUser, id: string): Promise<ReportDoc> {
  const report = await requireReport(id);
  if (!canManageReport(user, report)) {
    throw AppError.forbidden('You can only manage reports assigned to your authority');
  }
  return report;
}

function staffActor(user: AuthUser) {
  return { uid: user.uid, name: user.fullName, role: user.role };
}

const statusLabel = (s: Status) => s.replace('_', ' ').toLowerCase();

export const reportService = {
  // ------------------------------------------------------------------ create
  async create(user: AuthUser, input: CreateReportInput, files: Express.Multer.File[]) {
    if (files.length === 0) {
      throw AppError.badRequest('Please attach at least one photograph of the issue', undefined, 'PHOTO_REQUIRED');
    }

    const title = cleanText(input.title, 120);
    const description = cleanText(input.description, 2000);
    const imageHashes = behavioralService.hashFiles(files);

    // Upload and AI analysis are independent - run them together. AI never throws (graceful fallback).
    const [imageUrls, aiAnalysis] = await Promise.all([
      storageService.uploadImages(files, 'reports', user.uid),
      aiService.analyze({ title, description, image: { buffer: files[0]!.buffer, mimetype: files[0]!.mimetype } }),
    ]);

    // Hybrid behavioral & AI image verification checks
    const behavioral = await behavioralService.checkSubmission(user, input, files, aiAnalysis);

    if (!behavioral.passed) {
      await storageService.deleteByUrls(imageUrls);
      if (behavioral.details.isDuplicateImage) {
        throw AppError.badRequest(
          'Image verification failed: This exact photograph has already been uploaded in another report. Please capture and upload an authentic photo of the issue.',
          undefined,
          'DUPLICATE_IMAGE_DETECTED',
        );
      }
      if (!behavioral.details.isCivicIssue && behavioral.details.imageAuthenticityScore < 0.35) {
        const reason = aiAnalysis.imageVerification?.flagReason || 'The uploaded photo does not appear to show a civic or public infrastructure issue.';
        throw AppError.badRequest(
          `Image verification failed: ${reason} Reports require an authentic photo of a civic issue (e.g., road damage, waste, leaks).`,
          undefined,
          'INVALID_CIVIC_IMAGE',
        );
      }
      if (behavioral.details.velocityCountLast5Min >= 4) {
        throw AppError.badRequest(
          'Behavioral verification flagged: Multiple reports submitted too quickly in a short window. Please wait a few minutes before submitting again.',
          undefined,
          'RATE_LIMIT_VELOCITY',
        );
      }
    }

    const { authority, routing } = await suggestAuthority(input.latitude, input.longitude, input.category);

    const ref = reportsRepo.newRef();
    const aiOk = aiAnalysis.status === 'OK';
    const priority: Priority = aiOk && aiAnalysis.priority ? aiAnalysis.priority : 'MEDIUM';
    const initialStatus: Status = behavioral.riskLevel === 'LOW' ? 'SUBMITTED' : 'UNDER_REVIEW';

    try {
      const batch = db.batch();
      batch.set(ref, {
        reportId: ref.id,
        title,
        description,
        category: input.category,
        priority,
        status: initialStatus,
        categorySource: 'CITIZEN',
        prioritySource: aiOk ? 'AI' : 'DEFAULT',
        imageUrls,
        imageHashes,
        location: {
          latitude: input.latitude,
          longitude: input.longitude,
          address: cleanText(input.address, 300),
          city: input.city ? cleanText(input.city, 80) : undefined,
        },
        targetCompany: input.targetCompany ? cleanText(input.targetCompany, 80) : null,
        targetBranch: input.targetBranch ? cleanText(input.targetBranch, 80) : null,
        createdBy: user.uid,
        createdByName: user.fullName,
        assignedAuthorityId: authority?.authorityId ?? null,
        assignedAuthorityName: authority?.name ?? null,
        routing,
        aiAnalysis,
        behavioralCheck: behavioral,
        supportCount: 0,
        commentCount: 0,
        flagCount: 0,
        isFlagged: false,
        commentAnalysis: null,
        verification: { confirmed: 0, disputed: 0 },
        resolutionCycle: 0,
        resolution: null,
        resolvedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Record<keyof ReportDoc, unknown>);

      const verificationNote =
        behavioral.riskLevel !== 'LOW'
          ? ' (Placed under review: automated verification asked for a manual check.)' // details stay in behavioralCheck (staff-only); the timeline is public
          : '';

      timelineWrite(batch, {
        reportId: ref.id,
        type: 'CREATED',
        previousStatus: null,
        newStatus: initialStatus,
        actor: { uid: user.uid, name: user.fullName, role: user.role },
        explanation: authority
          ? `Report submitted and routed to ${authority.name} (suggested from coverage area).${verificationNote}`
          : `Report submitted. No authority matched this location; awaiting manual assignment.${verificationNote}`,
      });

      if (authority) {
        const aRef = assignmentsRepo.newRef();
        batch.set(aRef, {
          assignmentId: aRef.id,
          reportId: ref.id,
          previousAuthorityId: null,
          newAuthorityId: authority.authorityId,
          assignedOfficerId: null,
          assignedBy: 'SYSTEM',
          reason: routing.note,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      await storageService.deleteByUrls(imageUrls);
      throw err;
    }

    const saved = await requireReport(ref.id);
    return toReportDto(saved, { viewer: user });
  },

  /** Stateless AI preview used by the report form ("Suggest with AI"). */
  async analyzePreview(input: { title: string; description: string }, file?: Express.Multer.File) {
    const analysis = await aiService.analyze({
      title: input.title,
      description: input.description,
      image: file ? { buffer: file.buffer, mimetype: file.mimetype } : undefined,
    });
    return analysis;
  },

  // -------------------------------------------------------------------- read
  async list(viewer: AuthUser | undefined, q: ListReportsQuery, scope: 'public' | 'mine' | 'managed') {
    const filters: ReportFilters = { status: q.status, category: q.category, priority: q.priority };
    if (q.flagged !== undefined) filters.isFlagged = q.flagged;
    if (q.city) filters.city = q.city;

    if (scope === 'mine') {
      if (!viewer) throw AppError.unauthorized();
      if (q.category || q.priority) {
        throw AppError.badRequest('Only the status filter is supported for your own reports');
      }
      filters.createdBy = viewer.uid;
    } else if (scope === 'managed') {
      if (!viewer || viewer.role === 'CITIZEN') throw AppError.forbidden();
      if (viewer.role === 'AUTHORITY_OFFICER') {
        if (!viewer.authorityId) throw AppError.forbidden('Your account is not linked to an authority yet');
        filters.assignedAuthorityId = viewer.authorityId;
      } else if (q.authorityId) {
        filters.assignedAuthorityId = q.authorityId === 'UNASSIGNED' ? null : q.authorityId;
      }
    }

    const page = await reportsRepo.list(filters, q.limit, q.cursor);
    const supported = viewer ? await supportsRepo.supportedIds(viewer.uid, page.items.map((r) => r.reportId)) : new Set<string>();

    return {
      items: page.items.map((r) => toReportDto(r, { viewer, hasSupported: supported.has(r.reportId) })),
      nextCursor: page.nextCursor,
      limit: q.limit,
    };
  },

  async get(viewer: AuthUser | undefined, id: string) {
    const report = await requireReport(id);
    let hasSupported = false;
    let hasFlagged = false;
    let myVerification: VerificationStatus | null = null;
    if (viewer) {
      hasSupported = (await supportsRepo.supportedIds(viewer.uid, [id])).has(id);
      hasFlagged = await flagsRepo.hasFlagged(id, viewer.uid);
      if (report.status === 'RESOLVED') {
        myVerification = (await verificationsRepo.get(id, report.resolutionCycle, viewer.uid))?.status ?? null;
      }
    }
    return toReportDto(report, { viewer, hasSupported, hasFlagged, myVerification });
  },

  async mapPins(q: MapQuery) {
    const filters: ReportFilters = { status: q.status, category: q.category };
    let reports = await reportsRepo.recent(filters, 500);
    if (q.lat !== undefined && q.lng !== undefined) {
      const radius = q.radiusKm ?? 10;
      reports = reports.filter((r) => haversineKm(q.lat!, q.lng!, r.location.latitude, r.location.longitude) <= radius);
    }
    return reports.map(toMapPin);
  },

  async timeline(id: string) {
    await requireReport(id);
    return (await timelineRepo.listByReport(id)).map(toTimelineDto);
  },

  // ---------------------------------------------------------------- comments
  async comments(viewer: AuthUser | undefined, id: string) {
    await requireReport(id);
    return (await commentsRepo.listByReport(id)).map((c) => toCommentDto(c, viewer));
  },

  async addComment(user: AuthUser, id: string, text: string) {
    const report = await requireReport(id);
    const ref = commentsRepo.newRef();
    const batch = db.batch();
    batch.set(ref, {
      commentId: ref.id,
      reportId: id,
      userId: user.uid,
      userName: user.fullName,
      userRole: user.role,
      text: cleanText(text, 1000),
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(reportsRepo.ref(id), { commentCount: FieldValue.increment(1) });
    if (report.createdBy !== user.uid) {
      notifyWrite(batch, report.createdBy, id, 'COMMENT', `${user.fullName} commented on "${report.title}"`);
    }
    await batch.commit();

    // Dynamically analyze comment consensus using Gemini API
    try {
      const allComments = await commentsRepo.listByReport(id, 20);
      const commentsText = allComments.map((c) => `${c.userName}: ${c.text}`);
      const analysis = await aiService.analyzeComments({
        reportTitle: report.title,
        reportDescription: report.description,
        comments: commentsText,
      });

      if (analysis.isDisputedOrFake && analysis.disputeConfidence >= 0.6) {
        const prevBehavioral = report.behavioralCheck ?? {
          trustScore: 80,
          riskLevel: 'LOW',
          flags: [],
          passed: true,
          details: {
            velocityCountLast5Min: 0,
            isDuplicateImage: false,
            imageAuthenticityScore: 0.8,
            isCivicIssue: true,
            matchesDescription: true,
          },
        };

        const flags = [...prevBehavioral.flags];
        const flagText = `COMMENTS_DISPUTE: Community comments allege issue is fake/invalid (${analysis.disputeReason})`;
        if (!flags.some((f) => f.startsWith('COMMENTS_DISPUTE'))) {
          flags.push(flagText);
        }
        const trustScore = Math.max(10, Math.min(100, prevBehavioral.trustScore - 30));
        const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = trustScore < 50 ? 'HIGH' : 'MEDIUM';

        await reportsRepo.ref(id).update({
          isFlagged: true,
          commentAnalysis: analysis,
          behavioralCheck: {
            ...prevBehavioral,
            trustScore,
            riskLevel,
            flags,
          },
        });

        await alertAdmins(
          id,
          `[COMMUNITY DISPUTE ALERT] Comments allege report "${report.title}" may be fake/invalid: ${analysis.disputeReason}`,
        );

        const tBatch = db.batch();
        timelineWrite(tBatch, {
          reportId: id,
          type: 'STATUS_CHANGE',
          previousStatus: report.status,
          newStatus: report.status,
          actor: { uid: 'SYSTEM', name: 'Gemini Integrity Check', role: 'SYSTEM' },
          explanation: `Comments analysis flagged potential community dispute/fake claims: ${analysis.disputeReason}`,
        });
        await tBatch.commit();
      } else if (report.commentAnalysis?.isDisputedOrFake && !analysis.isDisputedOrFake) {
        await reportsRepo.ref(id).update({ commentAnalysis: analysis });
      }
    } catch (err) {
      console.warn('[report.service] dynamic comment analysis error:', err);
    }

    const saved = (await ref.get()).data()!;
    return toCommentDto(saved as never, user);
  },

  // ------------------------------------------------------------- flagging & moderation
  async flagReport(user: AuthUser, id: string, input: { reason: FlagReason; explanation: string }) {
    const report = await requireReport(id);
    const existing = await flagsRepo.get(id, user.uid);
    if (existing) {
      throw AppError.badRequest('You have already flagged this issue');
    }

    const ref = flagsRepo.ref(id, user.uid);
    const batch = db.batch();
    batch.set(ref, {
      flagId: ref.id,
      reportId: id,
      userId: user.uid,
      userName: user.fullName,
      reason: input.reason,
      explanation: cleanText(input.explanation, 500),
      createdAt: FieldValue.serverTimestamp(),
    });

    const newFlagCount = (report.flagCount ?? 0) + 1;
    const shouldFlag = newFlagCount >= 2;

    const prevBehavioral = report.behavioralCheck ?? {
      trustScore: 80,
      riskLevel: 'LOW',
      flags: [],
      passed: true,
      details: {
        velocityCountLast5Min: 0,
        isDuplicateImage: false,
        imageAuthenticityScore: 0.8,
        isCivicIssue: true,
        matchesDescription: true,
      },
    };

    let behavioralCheck = prevBehavioral;
    if (shouldFlag) {
      const flags = [...prevBehavioral.flags];
      const flagText = `COMMUNITY_FLAGS: ${newFlagCount} citizens flagged this issue as ${input.reason}`;
      if (!flags.some((f) => f.startsWith('COMMUNITY_FLAGS'))) {
        flags.push(flagText);
      }
      const trustScore = Math.max(10, Math.min(100, prevBehavioral.trustScore - 25));
      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = trustScore < 50 ? 'HIGH' : 'MEDIUM';
      behavioralCheck = {
        ...prevBehavioral,
        trustScore,
        riskLevel,
        flags,
      };
    }

    batch.update(reportsRepo.ref(id), {
      flagCount: FieldValue.increment(1),
      isFlagged: shouldFlag || Boolean(report.isFlagged),
      behavioralCheck,
    });

    timelineWrite(batch, {
      reportId: id,
      type: 'STATUS_CHANGE',
      previousStatus: report.status,
      newStatus: report.status,
      actor: { uid: user.uid, name: user.fullName, role: user.role },
      explanation: `Community member flagged issue (${input.reason}): "${cleanText(input.explanation, 200)}"`,
    });

    await batch.commit();

    if (shouldFlag) {
      await alertAdmins(
        id,
        `[MODERATION ALERT] Report "${report.title}" has reached ${newFlagCount} community flags (${input.reason}). Please review.`,
      );
    }

    return { flagged: true, flagCount: newFlagCount, isFlagged: shouldFlag };
  },

  async remove(user: AuthUser, id: string) {
    const report = await requireReport(id);
    if (user.role !== 'ADMIN' && report.createdBy !== user.uid) {
      throw AppError.forbidden('Only administrators or the report owner can remove reports');
    }

    if (report.imageUrls && report.imageUrls.length > 0) {
      try {
        await storageService.deleteByUrls(report.imageUrls);
      } catch (err) {
        console.warn('[report.service] failed to delete images on remove', err);
      }
    }

    if (report.createdBy && user.role === 'ADMIN') {
      try {
        const notifRef = notificationsRepo.newRef();
        await notifRef.set({
          notificationId: notifRef.id,
          userId: report.createdBy,
          reportId: id,
          type: 'STATUS_CHANGE',
          message: `Your report "${report.title}" was removed by an administrator following moderation review.`,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.warn('[report.service] notify reporter on delete failed', err);
      }
    }

    await reportsRepo.ref(id).delete();
    return { deleted: true, reportId: id };
  },

  async dismissFlags(user: AuthUser, id: string) {
    if (user.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can dismiss flags');
    }
    const report = await requireReport(id);

    const prevBehavioral = report.behavioralCheck;
    let behavioralCheck = prevBehavioral;
    if (prevBehavioral) {
      const flags = prevBehavioral.flags.filter(
        (f) => !f.startsWith('COMMUNITY_FLAGS') && !f.startsWith('COMMENTS_DISPUTE'),
      );
      const trustScore = Math.min(100, prevBehavioral.trustScore + 25);
      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = trustScore < 50 ? 'HIGH' : trustScore < 75 ? 'MEDIUM' : 'LOW';
      behavioralCheck = { ...prevBehavioral, trustScore, riskLevel, flags };
    }

    const batch = db.batch();
    batch.update(reportsRepo.ref(id), {
      isFlagged: false,
      flagCount: 0,
      commentAnalysis: null,
      behavioralCheck,
    });

    timelineWrite(batch, {
      reportId: id,
      type: 'STATUS_CHANGE',
      previousStatus: report.status,
      newStatus: report.status,
      actor: { uid: user.uid, name: user.fullName, role: user.role },
      explanation: 'Administrator reviewed report and dismissed community flags (verified genuine).',
    });

    await batch.commit();
    return { dismissed: true, reportId: id };
  },

  async listFlags(user: AuthUser, id: string) {
    if (user.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can view report flags');
    }
    await requireReport(id);
    const flags = await flagsRepo.listByReport(id);
    return flags.map((f) => ({
      flagId: f.flagId,
      reportId: f.reportId,
      userName: f.userName,
      reason: f.reason,
      explanation: f.explanation,
      createdAt: f.createdAt ? f.createdAt.toDate().toISOString() : null,
    }));
  },

  // ----------------------------------------------------------------- support
  async toggleSupport(user: AuthUser, id: string) {
    const report = await requireReport(id);
    if (report.createdBy === user.uid) {
      throw AppError.forbidden('You cannot support your own report', 'OWN_REPORT');
    }
    const ref = supportsRepo.ref(id, user.uid);
    return db.runTransaction(async (tx) => {
      const [snap, rSnap] = await Promise.all([tx.get(ref), tx.get(reportsRepo.ref(id))]);
      if (!rSnap.exists) throw AppError.notFound('Report not found');
      const current = (rSnap.data() as ReportDoc).supportCount;
      if (snap.exists) {
        tx.delete(ref);
        tx.update(reportsRepo.ref(id), { supportCount: FieldValue.increment(-1) });
        return { supported: false, supportCount: Math.max(0, current - 1) };
      }
      tx.set(ref, { reportId: id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
      tx.update(reportsRepo.ref(id), { supportCount: FieldValue.increment(1) });
      return { supported: true, supportCount: current + 1 };
    });
  },

  // ------------------------------------------------------- authority actions
  async updateStatus(
    user: AuthUser,
    id: string,
    input: { status: Status; explanation: string },
    files: Express.Multer.File[],
  ) {
    const precheck = await requireManageable(user, id);
    const explanation = cleanText(input.explanation, 1000);

    if (!TRANSITIONS[precheck.status].includes(input.status)) {
      throw AppError.conflict(`Cannot change status from ${precheck.status} to ${input.status}`, 'INVALID_TRANSITION');
    }
    if (EXPLANATION_REQUIRED.includes(input.status) && explanation.length < 10) {
      throw AppError.unprocessable(
        `An explanation (at least 10 characters) is required when marking a report ${statusLabel(input.status)}`,
        undefined,
        'EXPLANATION_REQUIRED',
      );
    }
    if (precheck.status === 'RESOLVED' && explanation.length < 10) {
      throw AppError.unprocessable('Please explain why this resolved report is being re-opened', undefined, 'EXPLANATION_REQUIRED');
    }
    if (input.status === 'RESOLVED' && files.length === 0) {
      throw AppError.unprocessable(
        'Resolution evidence (at least one photograph) is required to mark a report as resolved',
        undefined,
        'EVIDENCE_REQUIRED',
      );
    }

    const evidenceUrls = files.length ? await storageService.uploadImages(files, 'resolutions', user.uid) : [];

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(reportsRepo.ref(id));
        const report = snap.data() as ReportDoc;
        if (report.status !== precheck.status) {
          throw AppError.conflict('The report was updated by someone else. Please reload and try again.', 'STALE_STATE');
        }

        const patch: Record<string, unknown> = { status: input.status, updatedAt: FieldValue.serverTimestamp() };
        if (input.status === 'RESOLVED') {
          patch.resolution = {
            explanation,
            evidenceUrls,
            resolvedBy: user.fullName,
            resolvedAt: new Date(),
          };
          patch.resolvedAt = FieldValue.serverTimestamp();
          patch.resolutionCycle = FieldValue.increment(1);
          patch.verification = { confirmed: 0, disputed: 0 };
        } else if (report.status === 'RESOLVED') {
          patch.resolution = null;
          patch.resolvedAt = null;
        }
        tx.update(reportsRepo.ref(id), patch);

        timelineWrite(tx, {
          reportId: id,
          type: 'STATUS_CHANGE',
          previousStatus: report.status,
          newStatus: input.status,
          actor: staffActor(user),
          explanation,
          evidenceUrls,
        });

        notifyWrite(
          tx,
          report.createdBy,
          id,
          input.status === 'RESOLVED' ? 'RESOLUTION' : 'STATUS_CHANGE',
          input.status === 'RESOLVED'
            ? `"${report.title}" was marked resolved. Please verify the fix.`
            : `"${report.title}" is now ${statusLabel(input.status)}.`,
        );
      });
    } catch (err) {
      await storageService.deleteByUrls(evidenceUrls);
      throw err;
    }

    return this.get(user, id);
  },

  async addProgress(user: AuthUser, id: string, explanationRaw: string, files: Express.Multer.File[]) {
    const report = await requireManageable(user, id);
    if (report.status === 'RESOLVED' || report.status === 'REJECTED') {
      throw AppError.conflict('Progress updates can only be added to open reports', 'REPORT_CLOSED');
    }
    const explanation = cleanText(explanationRaw, 1000);
    const evidenceUrls = files.length ? await storageService.uploadImages(files, 'resolutions', user.uid) : [];

    const batch = db.batch();
    timelineWrite(batch, {
      reportId: id,
      type: 'PROGRESS_UPDATE',
      previousStatus: report.status,
      newStatus: report.status,
      actor: staffActor(user),
      explanation,
      evidenceUrls,
    });
    batch.update(reportsRepo.ref(id), { updatedAt: FieldValue.serverTimestamp() });
    notifyWrite(batch, report.createdBy, id, 'PROGRESS_UPDATE', `New progress update on "${report.title}".`);
    try {
      await batch.commit();
    } catch (err) {
      await storageService.deleteByUrls(evidenceUrls);
      throw err;
    }
    return this.timeline(id);
  },

  async reassign(user: AuthUser, id: string, authorityId: string, reasonRaw: string) {
    const report = await requireManageable(user, id);
    if (report.assignedAuthorityId === authorityId) {
      throw AppError.conflict('The report is already assigned to this authority');
    }
    const target = await authoritiesRepo.get(authorityId);
    if (!target || !target.isActive) throw AppError.badRequest('Target authority not found or inactive');
    const reason = cleanText(reasonRaw, 500);

    const batch = db.batch();
    batch.update(reportsRepo.ref(id), {
      assignedAuthorityId: target.authorityId,
      assignedAuthorityName: target.name,
      routing: {
        method: 'MANUAL',
        suggested: false,
        note: `Reassigned by ${user.fullName}.`,
        isDemoData: target.isDemoData,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    const aRef = assignmentsRepo.newRef();
    batch.set(aRef, {
      assignmentId: aRef.id,
      reportId: id,
      previousAuthorityId: report.assignedAuthorityId,
      newAuthorityId: target.authorityId,
      assignedOfficerId: null,
      assignedBy: user.uid,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
    timelineWrite(batch, {
      reportId: id,
      type: 'ASSIGNMENT',
      previousStatus: report.status,
      newStatus: report.status,
      actor: staffActor(user),
      explanation: `Reassigned from ${report.assignedAuthorityName ?? 'unassigned'} to ${target.name}. Reason: ${reason}`,
    });
    await batch.commit();
    return this.get(user, id);
  },

  /** Citizens (own report, before it is accepted) and authorised staff can correct AI/manual classification. */
  async updateClassification(user: AuthUser, id: string, input: { category?: Category; priority?: Priority }) {
    const report = await requireReport(id);
    const isOwnerEditable =
      report.createdBy === user.uid && (report.status === 'SUBMITTED' || report.status === 'UNDER_REVIEW');
    if (!isOwnerEditable && !canManageReport(user, report)) {
      throw AppError.forbidden('You cannot change the classification of this report');
    }
    const source = report.createdBy === user.uid && user.role === 'CITIZEN' ? 'CITIZEN' : 'OFFICER';
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const changes: string[] = [];
    if (input.category && input.category !== report.category) {
      patch.category = input.category;
      patch.categorySource = source;
      changes.push(`category ${report.category} -> ${input.category}`);
    }
    if (input.priority && input.priority !== report.priority) {
      patch.prioritySource = source;
      patch.priority = input.priority;
      changes.push(`priority ${report.priority} -> ${input.priority}`);
    }
    if (changes.length === 0) return this.get(user, id);

    const batch = db.batch();
    batch.update(reportsRepo.ref(id), patch);
    timelineWrite(batch, {
      reportId: id,
      type: 'CLASSIFICATION',
      previousStatus: report.status,
      newStatus: report.status,
      actor: staffActor(user),
      explanation: `Classification corrected: ${changes.join(', ')}.`,
    });
    await batch.commit();
    return this.get(user, id);
  },

  // ------------------------------------------------- community verification
  /** Separate from the authority's decision: never changes the report status. */
  async verify(user: AuthUser, id: string, input: { status: VerificationStatus; explanation: string }) {
    if (user.role !== 'CITIZEN') throw AppError.forbidden('Only citizens can verify resolutions');
    const explanation = cleanText(input.explanation, 500);

    await db.runTransaction(async (tx) => {
      const rSnap = await tx.get(reportsRepo.ref(id));
      if (!rSnap.exists) throw AppError.notFound('Report not found');
      const report = rSnap.data() as ReportDoc;
      if (report.status !== 'RESOLVED') {
        throw AppError.conflict('Only resolved reports can be verified', 'NOT_RESOLVED');
      }
      const vRef = verificationsRepo.ref(id, report.resolutionCycle, user.uid);
      const vSnap = await tx.get(vRef);
      const previous = vSnap.exists ? (vSnap.data()!.status as VerificationStatus) : null;
      if (previous === input.status) {
        throw AppError.conflict('You have already submitted this verification', 'ALREADY_VERIFIED');
      }

      const counters: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      const key = (s: VerificationStatus) => (s === 'CONFIRMED' ? 'verification.confirmed' : 'verification.disputed');
      counters[key(input.status)] = FieldValue.increment(1);
      if (previous) counters[key(previous)] = FieldValue.increment(-1);
      tx.update(reportsRepo.ref(id), counters);

      tx.set(vRef, {
        verificationId: vRef.id,
        reportId: id,
        citizenId: user.uid,
        cycle: report.resolutionCycle,
        status: input.status,
        explanation,
        createdAt: FieldValue.serverTimestamp(),
      });

      timelineWrite(tx, {
        reportId: id,
        type: 'VERIFICATION',
        previousStatus: 'RESOLVED',
        newStatus: 'RESOLVED',
        actor: { uid: user.uid, name: user.fullName, role: user.role },
        explanation:
          input.status === 'CONFIRMED'
            ? `${user.fullName} confirmed the resolution.${explanation ? ` "${explanation}"` : ''}`
            : `${user.fullName} disputed the resolution: ${explanation}`,
      });

      if (input.status === 'DISPUTED' && report.createdBy !== user.uid) {
        notifyWrite(tx, report.createdBy, id, 'STATUS_CHANGE', `A citizen disputed the resolution of "${report.title}".`);
      }
    });

    return this.get(user, id);
  },
};
