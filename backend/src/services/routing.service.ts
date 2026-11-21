import { authoritiesRepo } from '../repositories/authorities.repository';
import type { AuthorityDoc, Category, ReportDoc } from '../types';
import { haversineKm } from '../utils/geo';

export interface RoutingResult {
  authority: AuthorityDoc | null;
  routing: ReportDoc['routing'];
}

/**
 * Suggests a responsible authority from configurable coverage areas (circles).
 * This is a SUGGESTION based on geographic coverage only. It is not proof of official
 * jurisdiction and the data used by default is demonstration data. Officers/admins can reassign.
 *
 * Replace the body of this function to plug in official jurisdiction data (e.g. GN/DS division polygons).
 */
export async function suggestAuthority(latitude: number, longitude: number, category: Category): Promise<RoutingResult> {
  const authorities = await authoritiesRepo.listActive();

  const matches = authorities
    .filter((a) => a.handlesCategories.length === 0 || a.handlesCategories.includes(category))
    .map((a) => ({
      a,
      distance: haversineKm(latitude, longitude, a.coverage.centerLatitude, a.coverage.centerLongitude),
    }))
    .filter((m) => m.distance <= m.a.coverage.radiusKm)
    // Most specific coverage first (smallest radius), then nearest centre.
    .sort((x, y) => x.a.coverage.radiusKm - y.a.coverage.radiusKm || x.distance - y.distance);

  const best = matches[0];
  if (!best) {
    return {
      authority: null,
      routing: {
        method: 'NONE',
        suggested: true,
        note: 'No configured authority covers this location. An administrator will assign it manually.',
        isDemoData: false,
      },
    };
  }

  return {
    authority: best.a,
    routing: {
      method: 'COVERAGE_MATCH',
      suggested: true,
      note: `Suggested from configured coverage area (${best.distance.toFixed(1)} km from the centre of "${best.a.name}"). Not an official jurisdiction decision.`,
      isDemoData: best.a.isDemoData,
    },
  };
}
