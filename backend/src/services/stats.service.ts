import { authoritiesRepo } from '../repositories/authorities.repository';
import { reportsRepo, type ReportFilters } from '../repositories/reports.repository';
import { usersRepo } from '../repositories/users.repository';
import { CATEGORIES, PRIORITIES, STATUSES } from '../types';

async function breakdown(scope: ReportFilters) {
  const [byStatus, byCategory, byPriority] = await Promise.all([
    Promise.all(STATUSES.map(async (s) => [s, await reportsRepo.count({ ...scope, status: s })] as const)),
    Promise.all(CATEGORIES.map(async (c) => [c, await reportsRepo.count({ ...scope, category: c })] as const)),
    Promise.all(PRIORITIES.map(async (p) => [p, await reportsRepo.count({ ...scope, priority: p })] as const)),
  ]);
  const status = Object.fromEntries(byStatus) as Record<(typeof STATUSES)[number], number>;
  const total = byStatus.reduce((sum, [, n]) => sum + n, 0);

  // Average resolution time + disputed resolutions from a bounded sample of resolved reports.
  const resolved = await reportsRepo.sample({ ...scope, status: 'RESOLVED' }, 200);
  const durations = resolved
    .filter((r) => r.resolvedAt)
    .map((r) => (r.resolvedAt!.toMillis() - r.createdAt.toMillis()) / 3_600_000);
  const avgResolutionHours = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const disputedResolutions = resolved.filter((r) => r.verification.disputed > 0).length;

  return {
    total,
    byStatus: status,
    byCategory: Object.fromEntries(byCategory),
    byPriority: Object.fromEntries(byPriority),
    resolutionRate: total ? status.RESOLVED / total : 0,
    avgResolutionHours: avgResolutionHours === null ? null : Math.round(avgResolutionHours * 10) / 10,
    disputedResolutions,
    needsAttention: status.SUBMITTED + status.UNDER_REVIEW,
  };
}

let publicCache: { at: number; value: unknown } | null = null;

export const statsService = {
  forAuthority(authorityId: string) {
    return breakdown({ assignedAuthorityId: authorityId });
  },

  async platform() {
    const [overall, unassigned, users, authorities, flaggedReports] = await Promise.all([
      breakdown({}),
      reportsRepo.count({ assignedAuthorityId: null }),
      usersRepo.count(),
      authoritiesRepo.list(),
      reportsRepo.count({ isFlagged: true }),
    ]);
    return {
      ...overall,
      unassigned,
      users,
      authorities: authorities.length,
      activeAuthorities: authorities.filter((a) => a.isActive).length,
      flaggedReports,
    };
  },

  /** Landing-page counters. Cached for a minute. */
  async publicSummary() {
    if (publicCache && Date.now() - publicCache.at < 60_000) return publicCache.value;
    const [total, resolved, inProgress] = await Promise.all([
      reportsRepo.count({}),
      reportsRepo.count({ status: 'RESOLVED' }),
      reportsRepo.count({ status: 'IN_PROGRESS' }),
    ]);
    const value = { totalReports: total, resolvedReports: resolved, inProgressReports: inProgress };
    publicCache = { at: Date.now(), value };
    return value;
  },
};
