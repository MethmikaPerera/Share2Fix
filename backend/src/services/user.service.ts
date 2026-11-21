import { adminAuth } from '../config/firebase';
import { authoritiesRepo } from '../repositories/authorities.repository';
import { usersRepo } from '../repositories/users.repository';
import type { Role } from '../types';
import { AppError } from '../utils/errors';
import { toAuthorityDto, toUserDto } from '../utils/mappers';
import { cleanText } from '../utils/text';

const isAlreadyExists = (e: unknown) => (e as { code?: number | string })?.code === 6 || (e as { code?: string })?.code === 'already-exists';

async function withAuthority(user: Awaited<ReturnType<typeof usersRepo.get>>) {
  if (!user) throw AppError.notFound('User not found');
  const authority = user.authorityId ? await authoritiesRepo.get(user.authorityId) : null;
  return { ...toUserDto(user), authority: authority ? toAuthorityDto(authority) : null };
}

export const userService = {
  /** Creates the Firestore profile for a freshly registered Firebase Auth user. Role is ALWAYS CITIZEN. */
  async createProfile(firebaseUser: { uid: string; email: string }, input: { fullName: string; phone: string }) {
    try {
      const created = await usersRepo.create({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: cleanText(input.fullName, 80),
        phone: input.phone,
        role: 'CITIZEN',
        profileImage: '',
        isActive: true,
        authorityId: null,
      });
      return withAuthority(created);
    } catch (err) {
      if (isAlreadyExists(err)) throw AppError.conflict('A profile already exists for this account', 'PROFILE_EXISTS');
      throw err;
    }
  },

  async me(uid: string) {
    return withAuthority(await usersRepo.get(uid));
  },

  async updateMe(uid: string, input: { fullName?: string; phone?: string }) {
    const patch: { fullName?: string; phone?: string } = {};
    if (input.fullName !== undefined) patch.fullName = cleanText(input.fullName, 80);
    if (input.phone !== undefined) patch.phone = input.phone;
    return withAuthority(await usersRepo.update(uid, patch));
  },

  // ----------------------------------------------------------------- admin
  async list() {
    const users = await usersRepo.list();
    const authorities = new Map((await authoritiesRepo.list()).map((a) => [a.authorityId, a.name]));
    return users.map((u) => ({ ...toUserDto(u), authorityName: u.authorityId ? (authorities.get(u.authorityId) ?? null) : null }));
  },

  async adminCreate(input: {
    fullName: string;
    email: string;
    password: string;
    role: Exclude<Role, 'CITIZEN'>;
    authorityId: string | null;
  }) {
    if (input.role === 'AUTHORITY_OFFICER') {
      const authority = await authoritiesRepo.get(input.authorityId!);
      if (!authority) throw AppError.badRequest('Authority not found');
    }
    let authUid: string;
    try {
      const rec = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.fullName,
      });
      authUid = rec.uid;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-exists') throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS');
      if (code === 'auth/invalid-password') throw AppError.badRequest('Password must be at least 6 characters');
      throw err;
    }
    try {
      const created = await usersRepo.create({
        uid: authUid,
        email: input.email.toLowerCase(),
        fullName: cleanText(input.fullName, 80),
        phone: '',
        role: input.role,
        profileImage: '',
        isActive: true,
        authorityId: input.role === 'AUTHORITY_OFFICER' ? input.authorityId : null,
      });
      if (created.authorityId) await authoritiesRepo.addOfficer(created.authorityId, created.uid);
      return withAuthority(created);
    } catch (err) {
      await adminAuth.deleteUser(authUid).catch(() => undefined);
      throw err;
    }
  },

  async adminUpdate(
    actorUid: string,
    uid: string,
    input: { fullName?: string; role?: Role; authorityId?: string | null; isActive?: boolean },
  ) {
    const existing = await usersRepo.get(uid);
    if (!existing) throw AppError.notFound('User not found');

    if (uid === actorUid && (input.role && input.role !== 'ADMIN' || input.isActive === false)) {
      throw AppError.forbidden('You cannot demote or deactivate your own administrator account', 'SELF_LOCKOUT');
    }

    const nextRole = input.role ?? existing.role;
    let nextAuthority = input.authorityId !== undefined ? input.authorityId : existing.authorityId;
    if (nextRole !== 'AUTHORITY_OFFICER') nextAuthority = null;
    if (nextRole === 'AUTHORITY_OFFICER') {
      if (!nextAuthority) throw AppError.badRequest('Authority officers must belong to an authority');
      if (!(await authoritiesRepo.get(nextAuthority))) throw AppError.badRequest('Authority not found');
    }

    const patch: Record<string, unknown> = { role: nextRole, authorityId: nextAuthority };
    if (input.fullName !== undefined) patch.fullName = cleanText(input.fullName, 80);
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const updated = await usersRepo.update(uid, patch);

    if ((existing.authorityId ?? null) !== nextAuthority) {
      if (existing.authorityId) await authoritiesRepo.removeOfficer(existing.authorityId, uid).catch(() => undefined);
      if (nextAuthority) await authoritiesRepo.addOfficer(nextAuthority, uid);
    }
    if (input.isActive !== undefined) {
      await adminAuth.updateUser(uid, { disabled: !input.isActive });
      if (!input.isActive) await adminAuth.revokeRefreshTokens(uid);
    }
    return withAuthority(updated);
  },
};
