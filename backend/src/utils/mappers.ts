import type { Timestamp } from 'firebase-admin/firestore';
import type {
  AuthUser,
  AuthorityDoc,
  CommentDoc,
  NotificationDoc,
  ReportDoc,
  TimelineDoc,
  UserDoc,
  VerificationStatus,
} from '../types';

export const iso = (t?: Timestamp | null): string | null => (t ? t.toDate().toISOString() : null);

export function canManageReport(user: AuthUser | undefined, report: ReportDoc): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'AUTHORITY_OFFICER' && !!report.assignedAuthorityId && user.authorityId === report.assignedAuthorityId;
}

export interface ReportViewerContext {
  viewer?: AuthUser;
  hasSupported?: boolean;
  hasFlagged?: boolean;
  myVerification?: VerificationStatus | null;
}

/**
 * Public-safe report representation. The reporter's uid is never included;
 * the reporter's name is only visible to staff (officers/admins).
 */
export function toReportDto(r: ReportDoc, ctx: ReportViewerContext = {}) {
  const { viewer } = ctx;
  const isStaff = viewer?.role === 'AUTHORITY_OFFICER' || viewer?.role === 'ADMIN';
  return {
    id: r.reportId,
    title: r.title,
    description: r.description,
    category: r.category,
    priority: r.priority,
    status: r.status,
    categorySource: r.categorySource,
    prioritySource: r.prioritySource,
    imageUrls: r.imageUrls,
    location: r.location,
    assignedAuthority: r.assignedAuthorityId ? { id: r.assignedAuthorityId, name: r.assignedAuthorityName ?? '' } : null,
    targetCompany: r.targetCompany ?? null,
    targetBranch: r.targetBranch ?? null,
    routing: r.routing,
    aiAnalysis: r.aiAnalysis,
    flagCount: r.flagCount ?? 0,
    isFlagged: Boolean(r.isFlagged),
    commentAnalysis: r.commentAnalysis ?? null,
    supportCount: r.supportCount,
    commentCount: r.commentCount,
    verification: r.verification,
    resolution: r.resolution
      ? {
          explanation: r.resolution.explanation,
          evidenceUrls: r.resolution.evidenceUrls,
          resolvedBy: r.resolution.resolvedBy,
          resolvedAt: iso(r.resolution.resolvedAt),
        }
      : null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    resolvedAt: iso(r.resolvedAt),
    // Reporter identity and the anti-abuse trust score are staff-only, never public.
    ...(isStaff ? { reporter: { name: r.createdByName }, behavioralCheck: r.behavioralCheck ?? null } : {}),
    viewer: {
      isOwner: !!viewer && viewer.uid === r.createdBy,
      hasSupported: ctx.hasSupported ?? false,
      hasFlagged: ctx.hasFlagged ?? false,
      canManage: canManageReport(viewer, r),
      myVerification: ctx.myVerification ?? null,
    },
  };
}

export type ReportDto = ReturnType<typeof toReportDto>;

/** Minimal marker data for the public map: no description, no reporter, no photos. */
export function toMapPin(r: ReportDoc) {
  return {
    id: r.reportId,
    title: r.title,
    category: r.category,
    status: r.status,
    priority: r.priority,
    latitude: r.location.latitude,
    longitude: r.location.longitude,
    supportCount: r.supportCount,
    createdAt: iso(r.createdAt),
  };
}

export const toTimelineDto = (t: TimelineDoc) => ({
  id: t.eventId,
  type: t.type,
  previousStatus: t.previousStatus,
  newStatus: t.newStatus,
  updatedByName: t.updatedByName,
  updatedByRole: t.updatedByRole,
  explanation: t.explanation,
  evidenceUrls: t.evidenceUrls,
  createdAt: iso(t.createdAt),
});

export const toCommentDto = (c: CommentDoc, viewer?: AuthUser) => ({
  id: c.commentId,
  userName: c.userName,
  userRole: c.userRole,
  text: c.text,
  createdAt: iso(c.createdAt),
  isMine: !!viewer && viewer.uid === c.userId,
});

export const toUserDto = (u: UserDoc) => ({
  uid: u.uid,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  phone: u.phone,
  profileImage: u.profileImage,
  isActive: u.isActive,
  authorityId: u.authorityId ?? null,
  createdAt: iso(u.createdAt),
  updatedAt: iso(u.updatedAt),
});

export const toAuthorityDto = (a: AuthorityDoc) => ({
  id: a.authorityId,
  name: a.name,
  type: a.type,
  coverage: a.coverage,
  handlesCategories: a.handlesCategories,
  contact: a.contact,
  officerCount: a.officerIds?.length ?? 0,
  isActive: a.isActive,
  isDemoData: a.isDemoData,
  createdAt: iso(a.createdAt),
  updatedAt: iso(a.updatedAt),
});

export const toNotificationDto = (n: NotificationDoc) => ({
  id: n.notificationId,
  reportId: n.reportId,
  type: n.type,
  message: n.message,
  read: n.read,
  createdAt: iso(n.createdAt),
});
