import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import type { UserDoc } from '../types';

const col = () => db.collection(COLLECTIONS.users);

export const usersRepo = {
  ref: (uid: string) => col().doc(uid),

  async get(uid: string): Promise<UserDoc | null> {
    const snap = await col().doc(uid).get();
    return snap.exists ? (snap.data() as UserDoc) : null;
  },

  /** Fails with ALREADY_EXISTS if a profile is already there. */
  async create(data: Omit<UserDoc, 'createdAt' | 'updatedAt'>): Promise<UserDoc> {
    const ref = col().doc(data.uid);
    await ref.create({ ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return (await ref.get()).data() as UserDoc;
  },

  async update(uid: string, patch: Partial<Omit<UserDoc, 'uid' | 'createdAt' | 'updatedAt'>>): Promise<UserDoc> {
    const ref = col().doc(uid);
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
    return (await ref.get()).data() as UserDoc;
  },

  async list(limit = 300): Promise<UserDoc[]> {
    const snap = await col().orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as UserDoc);
  },

  async count(): Promise<number> {
    return (await col().count().get()).data().count;
  },

  async listAdmins(): Promise<UserDoc[]> {
    const snap = await col().where('role', '==', 'ADMIN').where('isActive', '==', true).get();
    return snap.docs.map((d) => d.data() as UserDoc);
  },
};
