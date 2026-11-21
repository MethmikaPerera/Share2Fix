import type { Category, Priority, Status, AuthorityType, Role } from '@/types';

export const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: 'ROAD_DAMAGE', label: 'Road damage', hint: 'Potholes, cracked or collapsed roads' },
  { value: 'WASTE_MANAGEMENT', label: 'Waste management', hint: 'Garbage build-up, illegal dumping' },
  { value: 'DRAINAGE', label: 'Drainage', hint: 'Blocked drains, flooding' },
  { value: 'STREET_LIGHTING', label: 'Street lighting', hint: 'Broken or missing street lights' },
  { value: 'WATER_LEAK', label: 'Water leak', hint: 'Burst or leaking pipes' },
  { value: 'PUBLIC_PROPERTY', label: 'Public property', hint: 'Damaged benches, bus stops, signs' },
  { value: 'OTHER', label: 'Other', hint: 'Anything else affecting the community' },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/** Status transitions an officer may choose (mirrors the backend rules; the server is authoritative). */
export const NEXT_STATUSES: Record<Status, Status[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['UNDER_REVIEW'],
};

export const AUTHORITY_TYPES: { value: AuthorityType; label: string }[] = [
  { value: 'MUNICIPAL_COUNCIL', label: 'Municipal council' },
  { value: 'URBAN_COUNCIL', label: 'Urban council' },
  { value: 'PRADESHIYA_SABHA', label: 'Pradeshiya Sabha' },
  { value: 'NATIONAL_AGENCY', label: 'National agency' },
  { value: 'DISTRICT_SECRETARIAT', label: 'District secretariat' },
  { value: 'OTHER', label: 'Other' },
];

export const ROLE_LABELS: Record<Role, string> = {
  CITIZEN: 'Citizen',
  AUTHORITY_OFFICER: 'Authority officer',
  ADMIN: 'Administrator',
};

export const labelOf = <T extends string>(list: { value: T; label: string }[], v: T) =>
  list.find((i) => i.value === v)?.label ?? v;

/** Semantic colour classes per status (tokens only). */
export const STATUS_STYLE: Record<Status, string> = {
  SUBMITTED: 'bg-white text-forest-muted ring-line',
  UNDER_REVIEW: 'bg-amber-soft text-amber-ink ring-amber/50',
  ACCEPTED: 'bg-pale text-teal ring-turquoise/40',
  IN_PROGRESS: 'bg-teal/10 text-teal-dark ring-teal/30',
  RESOLVED: 'bg-teal text-white ring-teal',
  REJECTED: 'bg-danger-soft text-danger ring-danger/30',
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: 'bg-white text-forest-muted ring-line',
  MEDIUM: 'bg-pale text-teal-dark ring-turquoise/40',
  HIGH: 'bg-amber-soft text-amber-ink ring-amber',
  CRITICAL: 'bg-danger text-white ring-danger',
};

/** Hex colours for map markers (must match tokens in globals.css). */
export const STATUS_PIN_COLOR: Record<Status, string> = {
  SUBMITTED: '#4A6664',
  UNDER_REVIEW: '#F2B84B',
  ACCEPTED: '#25BDB5',
  IN_PROGRESS: '#087F78',
  RESOLVED: '#173B3A',
  REJECTED: '#B42318',
};

export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const COLOMBO: [number, number] = [6.9271, 79.8612];
