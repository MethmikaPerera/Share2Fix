'use client';

import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { AdminUser, Authority, Role } from '@/types';

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const users = useAsync((s) => api.get<AdminUser[]>('/admin/users', s), []);
  const authorities = useAsync((s) => api.get<Authority[]>('/admin/authorities', s), []);
  const [showForm, setShowForm] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function update(uid: string, patch: Partial<{ role: Role; authorityId: string | null; isActive: boolean }>) {
    setRowError(null);
    setBusyId(uid);
    try {
      await api.patch(`/admin/users/${uid}`, patch);
      users.reload();
    } catch (e) {
      setRowError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Citizens register themselves. Create officer and administrator accounts here, link officers to an authority, or deactivate accounts."
        action={
          <Button onClick={() => setShowForm((s) => !s)} icon={<UserPlus className="h-4 w-4" />}>
            {showForm ? 'Close' : 'Add officer / admin'}
          </Button>
        }
      />

      {showForm && (
        <CreateUserForm
          authorities={authorities.data ?? []}
          onCreated={() => {
            setShowForm(false);
            users.reload();
          }}
        />
      )}
      {rowError && (
        <div className="mb-5">
          <Alert tone="error">{rowError}</Alert>
        </div>
      )}

      {users.loading && !users.data ? (
        <Spinner />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : (users.data?.length ?? 0) === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-sunken/70 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Authority</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.data!.map((u) => {
                const self = u.uid === profile?.uid;
                return (
                  <tr key={u.uid} className={`transition-colors hover:bg-paper ${u.isActive ? '' : 'bg-sunken/60 text-ink-faint'}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{u.fullName}</p>
                      <p className="text-xs text-ink-faint">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select
                        aria-label={`Role for ${u.fullName}`}
                        className="!h-9 !w-44"
                        value={u.role}
                        disabled={self || busyId === u.uid}
                        onChange={(e) => {
                          const role = e.target.value as Role;
                          if (role === 'AUTHORITY_OFFICER' && !u.authorityId) {
                            setRowError('Link the officer to an authority first: edit via "Add officer" or choose an authority in the Authority column.');
                            return;
                          }
                          void update(u.uid, { role });
                        }}
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.role === 'AUTHORITY_OFFICER' ? (
                        <Select
                          aria-label={`Authority for ${u.fullName}`}
                          className="!h-9 !w-56"
                          value={u.authorityId ?? ''}
                          disabled={busyId === u.uid}
                          onChange={(e) => void update(u.uid, { authorityId: e.target.value })}
                        >
                          {(authorities.data ?? []).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-ink-faint">&ndash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <Button
                        size="sm"
                        variant={u.isActive ? 'secondary' : 'primary'}
                        disabled={self}
                        loading={busyId === u.uid}
                        onClick={() => {
                          if (u.isActive && !window.confirm(`Deactivate ${u.fullName}? They will be signed out and unable to log in.`)) return;
                          void update(u.uid, { isActive: !u.isActive });
                        }}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function CreateUserForm({ authorities, onCreated }: { authorities: Authority[]; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'AUTHORITY_OFFICER' as 'AUTHORITY_OFFICER' | 'ADMIN', authorityId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.role === 'AUTHORITY_OFFICER' && !form.authorityId) return setError('Choose the authority this officer belongs to.');
    setBusy(true);
    try {
      await api.post('/admin/users', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        authorityId: form.role === 'AUTHORITY_OFFICER' ? form.authorityId : null,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader title="New officer or administrator" />
      <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2" noValidate>
        {error && (
          <div className="sm:col-span-2">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <Field label="Full name" htmlFor="nu-name" required>
          <Input id="nu-name" value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email" htmlFor="nu-email" required>
          <Input id="nu-email" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Temporary password" htmlFor="nu-pass" required hint="At least 8 characters. Share it securely; the user can reset it from the login page.">
          <Input id="nu-pass" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Role" htmlFor="nu-role" required>
          <Select id="nu-role" value={form.role} onChange={set('role')}>
            <option value="AUTHORITY_OFFICER">Authority officer</option>
            <option value="ADMIN">Administrator</option>
          </Select>
        </Field>
        {form.role === 'AUTHORITY_OFFICER' && (
          <Field label="Authority" htmlFor="nu-auth" required>
            <Select id="nu-auth" value={form.authorityId} onChange={set('authorityId')}>
              <option value="">Select...</option>
              {authorities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy}>
            Create account
          </Button>
        </div>
      </form>
    </Card>
  );
}
