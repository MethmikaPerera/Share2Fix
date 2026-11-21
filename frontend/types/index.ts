export type Role = 'CITIZEN' | 'AUTHORITY_OFFICER' | 'ADMIN';
export type Category =
  | 'ROAD_DAMAGE'
  | 'WASTE_MANAGEMENT'
  | 'DRAINAGE'
  | 'STREET_LIGHTING'
  | 'WATER_LEAK'
  | 'PUBLIC_PROPERTY'
  | 'OTHER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type VerificationStatus = 'CONFIRMED' | 'DISPUTED';
export type AuthorityType =
  | 'MUNICIPAL_COUNCIL'
  | 'URBAN_COUNCIL'
  | 'PRADESHIYA_SABHA'
  | 'NATIONAL_AGENCY'
  | 'DISTRICT_SECRETARIAT'
  | 'OTHER';

export interface Authority {
  id: string;
  name: string;
  type: AuthorityType;
  coverage: { centerLatitude: number; centerLongitude: number; radiusKm: number; description: string };
  handlesCategories: Category[];
  contact: { email: string; phone: string; address: string };
  officerCount: number;
  isActive: boolean;
  isDemoData: boolean;
}

export interface Profile {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  phone: string;
  profileImage: string;
  isActive: boolean;
  authorityId: string | null;
  authority: Authority | null;
  createdAt: string | null;
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

export interface ReportFlag {
  flagId: string;
  reportId: string;
  userName: string;
  reason: FlagReason;
  explanation: string;
  createdAt: string | null;
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

export interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  categorySource: 'CITIZEN' | 'AI' | 'OFFICER';
  prioritySource: 'AI' | 'DEFAULT' | 'CITIZEN' | 'OFFICER';
  imageUrls: string[];
  behavioralCheck?: BehavioralCheck | null;
  flagCount?: number;
  isFlagged?: boolean;
  commentAnalysis?: CommentSentimentAnalysis | null;
  location: { latitude: number; longitude: number; address: string; city?: string };
  targetCompany?: string | null;
  targetBranch?: string | null;
  assignedAuthority: { id: string; name: string } | null;
  routing: { method: 'COVERAGE_MATCH' | 'NONE' | 'MANUAL'; suggested: boolean; note: string; isDemoData: boolean };
  aiAnalysis: AiAnalysis;
  supportCount: number;
  commentCount: number;
  verification: { confirmed: number; disputed: number };
  resolution: { explanation: string; evidenceUrls: string[]; resolvedBy: string; resolvedAt: string | null } | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  reporter?: { name: string };
  viewer: {
    isOwner: boolean;
    hasSupported: boolean;
    hasFlagged?: boolean;
    canManage: boolean;
    myVerification: VerificationStatus | null;
  };
}

export interface MapPin {
  id: string;
  title: string;
  category: Category;
  status: Status;
  priority: Priority;
  latitude: number;
  longitude: number;
  supportCount: number;
  createdAt: string | null;
}

export interface TimelineEvent {
  id: string;
  type: 'CREATED' | 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'ASSIGNMENT' | 'CLASSIFICATION' | 'VERIFICATION';
  previousStatus: Status | null;
  newStatus: Status | null;
  updatedByName: string;
  updatedByRole: Role | 'SYSTEM';
  explanation: string;
  evidenceUrls: string[];
  createdAt: string | null;
}

export interface Comment {
  id: string;
  userName: string;
  userRole: Role;
  text: string;
  createdAt: string | null;
  isMine: boolean;
}

export interface AppNotification {
  id: string;
  reportId: string;
  type: 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'COMMENT' | 'RESOLUTION' | 'ADMIN_ALERT';
  message: string;
  read: boolean;
  createdAt: string | null;
}

export interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  authorityId: string | null;
  authorityName: string | null;
  createdAt: string | null;
}

export interface Stats {
  total: number;
  byStatus: Record<Status, number>;
  byCategory: Record<Category, number>;
  byPriority: Record<Priority, number>;
  resolutionRate: number;
  avgResolutionHours: number | null;
  disputedResolutions: number;
  needsAttention: number;
  unassigned?: number;
  users?: number;
  authorities?: number;
  activeAuthorities?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}
