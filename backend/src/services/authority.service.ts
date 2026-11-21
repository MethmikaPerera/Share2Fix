import { authoritiesRepo } from '../repositories/authorities.repository';
import { AppError } from '../utils/errors';
import { toAuthorityDto } from '../utils/mappers';
import type { AuthorityInput, AuthorityUpdateInput } from '../validators/schemas';

export const authorityService = {
  async list(includeInactive = false) {
    const all = await authoritiesRepo.list();
    return (includeInactive ? all : all.filter((a) => a.isActive)).map(toAuthorityDto);
  },

  async create(input: AuthorityInput) {
    const id = authoritiesRepo.newId();
    const saved = await authoritiesRepo.upsert(id, { ...input, officerIds: [], isDemoData: false });
    return toAuthorityDto(saved);
  },

  async update(id: string, input: AuthorityUpdateInput) {
    if (!(await authoritiesRepo.get(id))) throw AppError.notFound('Authority not found');
    // Merge nested objects field-by-field so partial updates cannot wipe sibling fields.
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      if ((k === 'coverage' || k === 'contact') && v && typeof v === 'object') {
        for (const [nk, nv] of Object.entries(v)) if (nv !== undefined) patch[`${k}.${nk}`] = nv;
      } else {
        patch[k] = v;
      }
    }
    return toAuthorityDto(await authoritiesRepo.update(id, patch));
  },
};
