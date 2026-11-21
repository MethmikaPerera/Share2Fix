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

/** Priority chip styling (tokens only). Low/medium stay quiet; high/critical draw the eye. */
export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: 'border-line bg-surface text-ink-faint',
  MEDIUM: 'border-line bg-surface text-ink-soft',
  HIGH: 'border-brass/50 bg-brass-tint text-brass-ink',
  CRITICAL: 'border-danger bg-danger text-white',
};

/** Hex colours for status dots and map markers (must match the tokens in globals.css). */
export const STATUS_PIN_COLOR: Record<Status, string> = {
  SUBMITTED: '#8a9492',
  UNDER_REVIEW: '#b08430',
  ACCEPTED: '#3f8c86',
  IN_PROGRESS: '#0b5d59',
  RESOLVED: '#2f6b45',
  REJECTED: '#a32d22',
};

/** Hex colours for priority bars. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: '#8a9492',
  MEDIUM: '#3f8c86',
  HIGH: '#b08430',
  CRITICAL: '#a32d22',
};

export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const COLOMBO: [number, number] = [6.9271, 79.8612];
