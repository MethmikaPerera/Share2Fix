'use client';

import { Building2, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { AUTHORITY_TYPES, CATEGORIES, labelOf } from '@/lib/constants';
import type { Authority, AuthorityType, Category } from '@/types';

interface FormState {
  name: string;
  type: AuthorityType;
  lat: string;
  lng: string;
  radiusKm: string;
  description: string;
  categories: Category[];
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  type: 'MUNICIPAL_COUNCIL',
  lat: '',
  lng: '',
  radiusKm: '5',
  description: '',
  categories: [],
  email: '',
  phone: '',
  address: '',
  isActive: true,
};

const fromAuthority = (a: Authority): FormState => ({
  name: a.name,
  type: a.type,
  lat: String(a.coverage.centerLatitude),
  lng: String(a.coverage.centerLongitude),
  radiusKm: String(a.coverage.radiusKm),
  description: a.coverage.description,
  categories: a.handlesCategories,
  email: a.contact.email,
  phone: a.contact.phone,
  address: a.contact.address,
  isActive: a.isActive,
});

export default function AdminAuthoritiesPage() {
  const { data, loading, error, reload } = useAsync((s) => api.get<Authority[]>('/admin/authorities', s), []);
  const [editing, setEditing] = useState<{ id: string | null; state: FormState } | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Authorities"
        description="Configure which authority covers which area. Routing suggests the most specific matching coverage circle, so official jurisdiction data can replace this later."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, state: EMPTY })}>
            New authority
          </Button>
        }
      />

      {editing && (
        <AuthorityForm
          key={editing.id ?? 'new'}
          id={editing.id}
          initial={editing.state}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No authorities configured" description="Run the seed script for demo data, or create one here." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {data!.map((a) => (
            <Card key={a.id} className={`p-6 ${a.isActive ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <Building2 className="mt-1 h-5 w-5 shrink-0 text-ink-faint" strokeWidth={1.5} aria-hidden />
                  <div>
                    <h2 className="text-xl leading-snug">{a.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-faint">{labelOf(AUTHORITY_TYPES, a.type)}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ id: a.id, state: fromAuthority(a) })}>
                  Edit
                </Button>
              </div>
              <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm text-ink-soft">
                <div>
                  Coverage: {a.coverage.radiusKm} km around {a.coverage.centerLatitude.toFixed(3)}, {a.coverage.centerLongitude.toFixed(3)}
                </div>
                <div>Handles: {a.handlesCategories.length ? a.handlesCategories.map((c) => labelOf(CATEGORIES, c)).join(', ') : 'All categories'}</div>
                <div>Officers: {a.officerCount}</div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] ${a.isActive ? 'border-brand/30 bg-brand-tint text-brand-deep' : 'border-line bg-sunken text-ink-faint'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${a.isActive ? 'bg-brand' : 'bg-ink-faint'}`} aria-hidden />
                  {a.isActive ? 'Active' : 'Inactive'}
                </span>
                {a.isDemoData && <span className="rounded-full border border-brass/50 bg-brass-tint px-2.5 py-[3px] text-brass-ink">Demo data</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AuthorityForm({ id, initial, onClose, onSaved }: { id: string | null; initial: FormState; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const lat = Number(f.lat);
    const lng = Number(f.lng);
    const radius = Number(f.radiusKm);
    if (f.name.trim().length < 3) return setError('Enter the authority name.');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return setError('Enter a valid centre latitude and longitude.');
    if (!Number.isFinite(radius) || radius < 0.5 || radius > 500) return setError('Radius must be between 0.5 and 500 km.');
    setBusy(true);
    try {
      const body = {
        name: f.name.trim(),
        type: f.type,
        coverage: { centerLatitude: lat, centerLongitude: lng, radiusKm: radius, description: f.description.trim() },
        handlesCategories: f.categories,
        contact: { email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim() },
        isActive: f.isActive,
      };
      if (id) await api.patch(`/admin/authorities/${id}`, body);
      else await api.post('/admin/authorities', body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader title={id ? 'Edit authority' : 'New authority'} />
      <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2" noValidate>
        {error && (
          <div className="sm:col-span-2">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <Field label="Name" htmlFor="a-name" required>
          <Input id="a-name" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Type" htmlFor="a-type">
          <Select id="a-type" value={f.type} onChange={(e) => set('type', e.target.value as AuthorityType)}>
            {AUTHORITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Coverage centre latitude" htmlFor="a-lat" required>
          <Input id="a-lat" inputMode="decimal" placeholder="6.9271" value={f.lat} onChange={(e) => set('lat', e.target.value)} />
        </Field>
        <Field label="Coverage centre longitude" htmlFor="a-lng" required>
          <Input id="a-lng" inputMode="decimal" placeholder="79.8612" value={f.lng} onChange={(e) => set('lng', e.target.value)} />
        </Field>
        <Field label="Coverage radius (km)" htmlFor="a-radius" required hint="Smaller radius = more specific. The smallest matching circle wins.">
          <Input id="a-radius" inputMode="decimal" value={f.radiusKm} onChange={(e) => set('radiusKm', e.target.value)} />
        </Field>
        <Field label="Coverage description" htmlFor="a-desc">
          <Input id="a-desc" maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[0.8125rem] font-semibold">Categories handled (none selected = all)</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = f.categories.includes(c.value);
              return (
                <label
                  key={c.value}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium ring-1 ring-inset transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${on ? 'bg-brand text-white ring-brand' : 'bg-surface text-ink-soft ring-line-strong hover:bg-sunken hover:text-ink'}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => set('categories', on ? f.categories.filter((x) => x !== c.value) : [...f.categories, c.value])}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="Contact email" htmlFor="a-email">
          <Input id="a-email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Contact phone" htmlFor="a-phone">
          <Input id="a-phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Address" htmlFor="a-address">
          <Input id="a-address" value={f.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          Active (receives new reports)
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" loading={busy}>
            {id ? 'Save changes' : 'Create authority'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
