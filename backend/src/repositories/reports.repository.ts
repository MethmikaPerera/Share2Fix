import type { Query } from 'firebase-admin/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import type { Category, Priority, ReportDoc, Status } from '../types';

const col = () => db.collection(COLLECTIONS.reports);

export interface ReportFilters {
  createdBy?: string;
  /** string = that authority, null = unassigned, undefined = no filter */
  assignedAuthorityId?: string | null;
  status?: Status;
  category?: Category;
  priority?: Priority;
}

function applyFilters(base: Query, f: ReportFilters): Query {
  let q = base;
  if (f.createdBy) q = q.where('createdBy', '==', f.createdBy);
  if (f.assignedAuthorityId !== undefined) q = q.where('assignedAuthorityId', '==', f.assignedAuthorityId);
  if (f.status) q = q.where('status', '==', f.status);
  if (f.category) q = q.where('category', '==', f.category);
  if (f.priority) q = q.where('priority', '==', f.priority);
  return q;
}

export const reportsRepo = {
  ref: (id: string) => col().doc(id),
  newRef: () => col().doc(),

  async get(id: string): Promise<ReportDoc | null> {
    const snap = await col().doc(id).get();
    return snap.exists ? (snap.data() as ReportDoc) : null;
  },

  /** Newest-first, cursor-paginated. Requires the composite indexes in firestore.indexes.json. */
  async list(filters: ReportFilters, limit: number, cursor?: string) {
    let q = applyFilters(col(), filters).orderBy('createdAt', 'desc');
    if (cursor) {
      const cursorSnap = await col().doc(cursor).get();
      if (cursorSnap.exists) q = q.startAfter(cursorSnap);
    }
    const snap = await q.limit(limit + 1).get();
    const docs = snap.docs.map((d) => d.data() as ReportDoc);
    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.reportId : null };
  },

  async count(filters: ReportFilters): Promise<number> {
    return (await applyFilters(col(), filters).count().get()).data().count;
  },

  /** Most recent reports matching the filters, used for the map and statistics samples. */
  async recent(filters: ReportFilters, limit: number): Promise<ReportDoc[]> {
    const snap = await applyFilters(col(), filters).orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as ReportDoc);
  },

  /** Unordered sample (no index needed) - e.g. resolved reports for averaging resolution time. */
  async sample(filters: ReportFilters, limit: number): Promise<ReportDoc[]> {
    const snap = await applyFilters(col(), filters).limit(limit).get();
    return snap.docs.map((d) => d.data() as ReportDoc);
  },
};
