'use client';

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import type { Profile } from '@/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  /** Google popup sign-in. First-time Google users automatically get a CITIZEN profile (see loadProfile). */
  loginWithGoogle: () => Promise<void>;
  register: (input: { fullName: string; email: string; password: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // While registering, the Firestore profile does not exist yet - don't treat that as an error.
  const registering = useRef(false);

  const loadProfile = useCallback(async (user: User) => {
    try {
      setProfile(await api.get<Profile>('/users/me'));
      setSessionError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PROFILE_REQUIRED') {
        // Auth account exists but profile creation never finished: recover by creating it now.
        const fullName = user.displayName || user.email?.split('@')[0] || 'Citizen';
        setProfile(await api.post<Profile>('/auth/profile', { fullName, phone: '' }));
        return;
      }
      if (err instanceof ApiError && err.code === 'ACCOUNT_DISABLED') {
        await signOut(auth);
        setProfile(null);
        setSessionError('This account has been deactivated. Contact an administrator.');
        return;
      }
      setProfile(null);
      setSessionError(err instanceof Error ? err.message : 'Could not load your profile.');
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (registering.current) return;
      setLoading(true);
      await loadProfile(user);
      setLoading(false);
    });
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      configured: isFirebaseConfigured,
      sessionError,
      async login(email, password) {
        setSessionError(null);
        await signInWithEmailAndPassword(auth, email, password);
      },
      async loginWithGoogle() {
        setSessionError(null);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      },
      async register({ fullName, email, password, phone }) {
        setSessionError(null);
        registering.current = true;
        let created: User | null = null;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          created = cred.user;
          await updateProfile(cred.user, { displayName: fullName });
          setProfile(await api.post<Profile>('/auth/profile', { fullName, phone }));
        } catch (err) {
          // Roll back a half-created account so the user can retry with the same email.
          if (created) await created.delete().catch(() => signOut(auth));
          throw err;
        } finally {
          registering.current = false;
          setLoading(false);
        }
      },
      async logout() {
        await signOut(auth);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async refreshProfile() {
        if (auth.currentUser) await loadProfile(auth.currentUser);
      },
    }),
    [firebaseUser, profile, loading, sessionError, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const homePathFor = (role: Profile['role']) =>
  role === 'ADMIN' ? '/admin' : role === 'AUTHORITY_OFFICER' ? '/authority' : '/dashboard';
