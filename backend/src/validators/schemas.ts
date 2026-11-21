import { z } from 'zod';
import { AUTHORITY_TYPES, CATEGORIES, FLAG_REASONS, PRIORITIES, STATUSES, VERIFICATION_STATUSES } from '../types';
import { isWithinSriLanka } from '../utils/geo';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'Invalid id');
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');
const phoneRaw = z
  .string()
  .trim()
  .regex(/^[+0-9()\-\s]{7,20}$/, 'Enter a valid phone number')
  .or(z.literal(''));
const phone = phoneRaw.optional().default('');

export const idParams = z.object({ id });

// ---------- Auth / users ----------
export const createProfileBody = z.object({
  fullName: text(2, 80),
  phone,
});

export const updateProfileBody = z
  .object({ fullName: text(2, 80).optional(), phone: phoneRaw.optional() })
  .refine((v) => v.fullName !== undefined || v.phone !== undefined, 'Nothing to update');

// ---------- Reports ----------
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

export const createReportBody = z
  .object({
    title: text(5, 120),
    description: text(10, 2000),
    category: z.enum(CATEGORIES),
    latitude: lat,
    longitude: lng,
    address: optionalText(300),
    city: optionalText(80),
    targetCompany: optionalText(80),
    targetBranch: optionalText(80),
  })
  .refine((v) => isWithinSriLanka(v.latitude, v.longitude), {
    path: ['latitude'],
    message: 'Location must be within Sri Lanka',
  });

export const analyzeBody = z.object({
  title: optionalText(120),
  description: text(5, 2000),
});

const boolString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listReportsQuery = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  /** Admin only. Use "UNASSIGNED" to list reports without an authority. */
  authorityId: z.string().max(128).optional(),
  mine: boolString.optional(),
  flagged: boolString.optional(),
  city: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: id.optional(),
});

export const mapQuery = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  radiusKm: z.coerce.number().min(0.1).max(500).optional(),
});

export const statusUpdateBody = z.object({
  status: z.enum(STATUSES),
  explanation: optionalText(1000),
});

export const progressBody = z.object({ explanation: text(5, 1000) });

export const reassignBody = z.object({
  authorityId: id,
  reason: text(5, 500),
});

export const classificationBody = z
  .object({ category: z.enum(CATEGORIES).optional(), priority: z.enum(PRIORITIES).optional() })
  .refine((v) => v.category !== undefined || v.priority !== undefined, 'Provide a category or priority');

export const commentBody = z.object({ text: text(1, 1000) });

export const verifyBody = z
  .object({ status: z.enum(VERIFICATION_STATUSES), explanation: optionalText(500) })
  .refine((v) => v.status !== 'DISPUTED' || v.explanation.length >= 10, {
    path: ['explanation'],
    message: 'Please explain why you dispute this resolution (at least 10 characters)',
  });

export const flagReportBody = z.object({
  reason: z.enum(FLAG_REASONS),
  explanation: text(5, 500),
});
export type FlagReportBody = z.infer<typeof flagReportBody>;

// ---------- Admin ----------
export const adminCreateUserBody = z
  .object({
    fullName: text(2, 80),
    email: z.email(),
    password: z.string().min(8).max(100),
    role: z.enum(['AUTHORITY_OFFICER', 'ADMIN']),
    authorityId: id.nullable().optional().default(null),
  })
  .refine((v) => v.role !== 'AUTHORITY_OFFICER' || !!v.authorityId, {
    path: ['authorityId'],
    message: 'Authority officers must belong to an authority',
  });

export const adminUpdateUserBody = z.object({
  fullName: text(2, 80).optional(),
  role: z.enum(['CITIZEN', 'AUTHORITY_OFFICER', 'ADMIN']).optional(),
  authorityId: id.nullable().optional(),
  isActive: z.boolean().optional(),
});

const authorityBase = z.object({
  name: text(3, 120),
  type: z.enum(AUTHORITY_TYPES),
  coverage: z.object({
    centerLatitude: lat,
    centerLongitude: lng,
    radiusKm: z.coerce.number().min(0.5).max(500),
    description: z.string().trim().max(300).optional(),
  }),
  handlesCategories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
  contact: z.object({
    email: z.union([z.email(), z.literal('')]),
    phone: phoneRaw,
    address: z.string().trim().max(300),
  }),
  isActive: z.boolean(),
});

/** Create: optional fields get sensible defaults. */
export const authorityBody = authorityBase.extend({
  coverage: authorityBase.shape.coverage.extend({ description: optionalText(300) }),
  handlesCategories: authorityBase.shape.handlesCategories.default([]),
  contact: authorityBase.shape.contact.partial().default({}).transform((c) => ({ email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' })),
  isActive: authorityBase.shape.isActive.default(true),
});

/** Update: NO defaults, so a partial update can never silently reset other fields. */
export const authorityUpdateBody = authorityBase.extend({
  coverage: authorityBase.shape.coverage.partial(),
  contact: authorityBase.shape.contact.partial(),
}).partial();

export type CreateReportInput = z.infer<typeof createReportBody>;
export type ListReportsQuery = z.infer<typeof listReportsQuery>;
export type MapQuery = z.infer<typeof mapQuery>;
export type AuthorityInput = z.infer<typeof authorityBody>;
export type AuthorityUpdateInput = z.infer<typeof authorityUpdateBody>;
