import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import type { CommentDoc, NotificationDoc, ReportFlagDoc, TimelineDoc, VerificationDoc } from '../types';

const timelineCol = () => db.collection(COLLECTIONS.timeline);
const commentsCol = () => db.collection(COLLECTIONS.comments);
const assignmentsCol = () => db.collection(COLLECTIONS.assignments);
const verificationsCol = () => db.collection(COLLECTIONS.verifications);
const supportsCol = () => db.collection(COLLECTIONS.supports);
const notificationsCol = () => db.collection(COLLECTIONS.notifications);
const flagsCol = () => db.collection(COLLECTIONS.flags);

export const timelineRepo = {
  newRef: () => timelineCol().doc(),
  async listByReport(reportId: string): Promise<TimelineDoc[]> {
    const snap = await timelineCol().where('reportId', '==', reportId).orderBy('createdAt', 'asc').get();
    return snap.docs.map((d) => d.data() as TimelineDoc);
  },
};

export const commentsRepo = {
  newRef: () => commentsCol().doc(),
  async listByReport(reportId: string, limit = 100): Promise<CommentDoc[]> {
    const snap = await commentsCol().where('reportId', '==', reportId).orderBy('createdAt', 'asc').limit(limit).get();
    return snap.docs.map((d) => d.data() as CommentDoc);
  },
};

export const assignmentsRepo = {
  newRef: () => assignmentsCol().doc(),
};

export const verificationsRepo = {
  ref: (reportId: string, cycle: number, citizenId: string) => verificationsCol().doc(`${reportId}_${cycle}_${citizenId}`),
  async get(reportId: string, cycle: number, citizenId: string): Promise<VerificationDoc | null> {
    const snap = await verificationsRepo.ref(reportId, cycle, citizenId).get();
    return snap.exists ? (snap.data() as VerificationDoc) : null;
  },
};

export const supportsRepo = {
  ref: (reportId: string, uid: string) => supportsCol().doc(`${reportId}_${uid}`),
  /** Returns the set of report ids (from the given list) that the user supports. */
  async supportedIds(uid: string, reportIds: string[]): Promise<Set<string>> {
    if (!reportIds.length) return new Set();
    const snaps = await db.getAll(...reportIds.map((id) => supportsRepo.ref(id, uid)));
    return new Set(snaps.filter((s) => s.exists).map((s) => (s.data() as { reportId: string }).reportId));
  },
};

export const flagsRepo = {
  ref: (reportId: string, uid: string) => flagsCol().doc(`${reportId}_${uid}`),
  async get(reportId: string, uid: string): Promise<ReportFlagDoc | null> {
    const snap = await flagsRepo.ref(reportId, uid).get();
    return snap.exists ? (snap.data() as ReportFlagDoc) : null;
  },
  async listByReport(reportId: string): Promise<ReportFlagDoc[]> {
    const snap = await flagsCol().where('reportId', '==', reportId).orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data() as ReportFlagDoc);
  },
  async hasFlagged(reportId: string, uid: string): Promise<boolean> {
    const snap = await flagsRepo.ref(reportId, uid).get();
    return snap.exists;
  },
  async flagCount(reportId: string): Promise<number> {
    return (await flagsCol().where('reportId', '==', reportId).count().get()).data().count;
  },
};

export const notificationsRepo = {
  newRef: () => notificationsCol().doc(),

  async create(data: Omit<NotificationDoc, 'notificationId' | 'createdAt' | 'read'>) {
    const ref = notificationsCol().doc();
    await ref.set({ ...data, notificationId: ref.id, read: false, createdAt: FieldValue.serverTimestamp() });
  },

  async listForUser(uid: string, limit = 30): Promise<NotificationDoc[]> {
    const snap = await notificationsCol().where('userId', '==', uid).orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as NotificationDoc);
  },

  async get(id: string): Promise<NotificationDoc | null> {
    const snap = await notificationsCol().doc(id).get();
    return snap.exists ? (snap.data() as NotificationDoc) : null;
  },

  async markRead(id: string) {
    await notificationsCol().doc(id).update({ read: true });
  },

  async markAllRead(uid: string) {
    const snap = await notificationsCol().where('userId', '==', uid).where('read', '==', false).limit(200).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  },
};
