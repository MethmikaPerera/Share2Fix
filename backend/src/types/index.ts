import type { Timestamp } from 'firebase-admin/firestore';

export const ROLES = ['CITIZEN', 'AUTHORITY_OFFICER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = [
  'ROAD_DAMAGE',
  'WASTE_MANAGEMENT',
  'DRAINAGE',
  'STREET_LIGHTING',
  'WATER_LEAK',
  'PUBLIC_PROPERTY',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export type Status = (typeof STATUSES)[number];

export const AUTHORITY_TYPES = [
  'MUNICIPAL_COUNCIL',
  'URBAN_COUNCIL',
  'PRADESHIYA_SABHA',
  'NATIONAL_AGENCY',
  'DISTRICT_SECRETARIAT',
  'OTHER',
] as const;
export type AuthorityType = (typeof AUTHORITY_TYPES)[number];

export const VERIFICATION_STATUSES = ['CONFIRMED', 'DISPUTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type TimelineType = 'CREATED' | 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'ASSIGNMENT' | 'CLASSIFICATION' | 'VERIFICATION';

export interface UserDoc {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  phone: string;
  profileImage: string;
  isActive: boolean;
  authorityId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuthorityDoc {
  authorityId: string;
  name: string;
  type: AuthorityType;
  coverage: { centerLatitude: number; centerLongitude: number; radiusKm: number; description: string };
  /** Empty array = handles every category. */
  handlesCategories: Category[];
  contact: { email: string; phone: string; address: string };
  officerIds: string[];
  isActive: boolean;
  isDemoData: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const FLAG_REASONS = [
  'FAKE_OR_STAGED',
  'ALREADY_RESOLVED',
  'INCORRECT_LOCATION',
  'NOT_A_CIVIC_ISSUE',
  'SPAM_OR_DUPLICATE',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export interface ReportFlagDoc {
  flagId: string;
  reportId: string;
  userId: string;
  userName: string;
  reason: FlagReason;
  explanation: string;
  createdAt: Timestamp;
}

export interface CommentSentimentAnalysis {
  isDisputedOrFake: boolean;
  disputeConfidence: number;
  disputeReason: string;
  sentiment: 'SUPPORTIVE' | 'NEUTRAL' | 'CRITICAL' | 'DISPUTED_FAKE';
  fakeClaimCount: number;
  analyzedAt: string | null;
}

export interface ImageVerification {
  isCivicIssue: boolean;
  matchesDescription: boolean;
  authenticityScore: number;
  flagged: boolean;
  flagReason: string;
}

export interface BehavioralCheck {
  trustScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  flags: string[];
  passed: boolean;
  details: {
    velocityCountLast5Min: number;
    geoSpeedKmH?: number;
    isDuplicateImage: boolean;
    imageAuthenticityScore: number;
    isCivicIssue: boolean;
    matchesDescription: boolean;
  };
}

export interface AiAnalysis {
  status: 'OK' | 'UNAVAILABLE';
  category: Category | null;
  priority: Priority | null;
  summary: string;
  keywords: string[];
  confidence: number;
  model: string | null;
  failureReason?: string;
  imageVerification?: ImageVerification;
}

export interface ReportDoc {
  reportId: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  categorySource: 'CITIZEN' | 'AI' | 'OFFICER';
  prioritySource: 'AI' | 'DEFAULT' | 'CITIZEN' | 'OFFICER';
  imageUrls: string[];
  imageHashes?: string[];
  behavioralCheck?: BehavioralCheck;
  flagCount?: number;
  isFlagged?: boolean;
  commentAnalysis?: CommentSentimentAnalysis | null;
  location: { latitude: number; longitude: number; address: string; city?: string };
  targetCompany?: string | null;
  targetBranch?: string | null;
  createdBy: string;
  createdByName: string;
  assignedAuthorityId: string | null;
  assignedAuthorityName: string | null;
  routing: { method: 'COVERAGE_MATCH' | 'NONE' | 'MANUAL'; suggested: boolean; note: string; isDemoData: boolean };
  aiAnalysis: AiAnalysis;
  supportCount: number;
  commentCount: number;
  verification: { confirmed: number; disputed: number };
  resolutionCycle: number;
  resolution: { explanation: string; evidenceUrls: string[]; resolvedBy: string; resolvedAt: Timestamp } | null;
  resolvedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimelineDoc {
  eventId: string;
  reportId: string;
  type: TimelineType;
  previousStatus: Status | null;
  newStatus: Status | null;
  updatedBy: string;
  updatedByName: string;
  updatedByRole: Role | 'SYSTEM';
  explanation: string;
  evidenceUrls: string[];
  createdAt: Timestamp;
}

export interface CommentDoc {
  commentId: string;
  reportId: string;
  userId: string;
  userName: string;
  userRole: Role;
  text: string;
  createdAt: Timestamp;
}

export interface AssignmentDoc {
  assignmentId: string;
  reportId: string;
  previousAuthorityId: string | null;
  newAuthorityId: string | null;
  assignedOfficerId: string | null;
  assignedBy: string; // uid or 'SYSTEM'
  reason: string;
  createdAt: Timestamp;
}

export interface VerificationDoc {
  verificationId: string;
  reportId: string;
  citizenId: string;
  cycle: number;
  status: VerificationStatus;
  explanation: string;
  createdAt: Timestamp;
}

export interface NotificationDoc {
  notificationId: string;
  userId: string;
  reportId: string;
  type: 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'COMMENT' | 'RESOLUTION' | 'ADMIN_ALERT';
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

/** The authenticated, profile-backed user attached to req.user. Role always comes from Firestore. */
export interface AuthUser {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  authorityId: string | null;
}
