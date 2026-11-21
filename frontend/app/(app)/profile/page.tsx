'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileForm />
    </RequireAuth>
  );
}

function ProfileForm() {
  const { profile, refreshProfile, resetPassword } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  if (!profile) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await api.patch('/users/me', { fullName: fullName.trim(), phone: phone.trim() });
      await refreshProfile();
      setMsg({ tone: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    try {
      await resetPassword(profile!.email);
      setMsg({ tone: 'success', text: `Password reset email sent to ${profile!.email}.` });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" description="Manage how your name and contact details appear to the authorities handling your reports." />
      <Card className="max-w-2xl p-7 sm:p-8">
        <dl className="mb-7 grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line pb-7 text-sm">
          <div>
            <dt className="eyebrow mb-1">Email</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>
          <div>
            <dt className="eyebrow mb-1">Account type</dt>
            <dd className="font-medium">{ROLE_LABELS[profile.role]}</dd>
          </div>
          {profile.authority && (
            <div className="col-span-2">
              <dt className="eyebrow mb-1">Authority</dt>
              <dd className="font-medium">{profile.authority.name}</dd>
            </div>
          )}
          <div>
            <dt className="eyebrow mb-1">Member since</dt>
            <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
          </div>
        </dl>

        <form onSubmit={save} className="space-y-5" noValidate>
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <Field label="Full name" htmlFor="p-name" required>
            <Input id="p-name" value={fullName} minLength={2} maxLength={80} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="p-phone">
            <Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} disabled={fullName.trim().length < 2}>
              Save changes
            </Button>
            <Button type="button" variant="secondary" onClick={sendReset}>
              Email me a password reset link
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
