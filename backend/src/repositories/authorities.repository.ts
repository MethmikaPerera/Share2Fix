import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import type { AuthorityDoc } from '../types';

const col = () => db.collection(COLLECTIONS.authorities);

export const authoritiesRepo = {
  newId: () => col().doc().id,

  async get(id: string): Promise<AuthorityDoc | null> {
    const snap = await col().doc(id).get();
    return snap.exists ? (snap.data() as AuthorityDoc) : null;
  },

  async list(): Promise<AuthorityDoc[]> {
    const snap = await col().orderBy('name').get();
    return snap.docs.map((d) => d.data() as AuthorityDoc);
  },

  async listActive(): Promise<AuthorityDoc[]> {
    return (await this.list()).filter((a) => a.isActive);
  },

  async upsert(id: string, data: Omit<AuthorityDoc, 'createdAt' | 'updatedAt' | 'authorityId'>): Promise<AuthorityDoc> {
    const ref = col().doc(id);
    const existing = await ref.get();
    await ref.set(
      {
        ...data,
        authorityId: id,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    return (await ref.get()).data() as AuthorityDoc;
  },

  async update(id: string, patch: Record<string, unknown>): Promise<AuthorityDoc> {
    const ref = col().doc(id);
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
    return (await ref.get()).data() as AuthorityDoc;
  },

  async addOfficer(id: string, uid: string) {
    await col().doc(id).update({ officerIds: FieldValue.arrayUnion(uid), updatedAt: FieldValue.serverTimestamp() });
  },

  async removeOfficer(id: string, uid: string) {
    await col().doc(id).update({ officerIds: FieldValue.arrayRemove(uid), updatedAt: FieldValue.serverTimestamp() });
  },
};
