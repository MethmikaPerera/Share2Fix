'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { authErrorMessage } from '@/lib/authErrors';
import { errorMessage } from '@/lib/api';
import { homePathFor, useAuth } from './AuthProvider';

function SetupNotice() {
  const { configured } = useAuth();
  if (configured) return null;
  return (
    <Alert tone="warning" title="Firebase is not configured">
      Add your Firebase web config to <code>frontend/.env.local</code> (see the README) and restart the dev server.
    </Alert>
  );
}

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-forest-muted">{subtitle}</p>
      <div className="space-y-4">
        <SetupNotice />
        {children}
      </div>
      <div className="mt-6 border-t border-line pt-4 text-center text-sm text-forest-muted">{footer}</div>
    </Card>
  );
}

/** Redirects a signed-in user away from auth pages. */
function useRedirectIfSignedIn() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (!loading && profile) {
      const next = params.get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : homePathFor(profile.role));
    }
  }, [loading, profile, router, params]);
}

function LoginInner() {
  const { login, sessionError } = useAuth();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useRedirectIfSignedIn();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  const next = params.get('next');
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to report issues and track their progress."
      footer={
        <>
          New to Share2Fix?{' '}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {(error || sessionError) && <Alert tone="error">{error ?? sessionError}</Alert>}
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-right text-sm">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" loading={busy} className="w-full" size="lg" disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function RegisterInner() {
  const { register } = useAuth();
  const params = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useRedirectIfSignedIn();

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() });
    } catch (err) {
      setError((err as { code?: string }).code?.startsWith('auth/') ? authErrorMessage(err) : errorMessage(err));
      setBusy(false);
    }
  }

  const next = params.get('next');
  return (
    <AuthCard
      title="Create your account"
      subtitle="Join your community in reporting and fixing local problems."
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Full name" htmlFor="fullName" required>
          <Input id="fullName" autoComplete="name" required minLength={2} maxLength={80} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone" hint="Only shared with the authority handling your report.">
          <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Password" htmlFor="password" required hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" required error={mismatch ? 'Passwords do not match' : undefined}>
          <Input id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        </Field>
        <Button type="submit" loading={busy} className="w-full" size="lg" disabled={!form.fullName || !form.email || !form.password}>
          Create account
        </Button>
        <p className="text-center text-xs text-forest-muted">New accounts are citizen accounts. Authority access is granted by an administrator.</p>
      </form>
    </AuthCard>
  );
}

export function RegisterForm() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      // Do not reveal whether the email exists.
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') setSent(true);
      else setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to choose a new password."
      footer={<Link href="/login" className="font-semibold">Back to sign in</Link>}
    >
      {sent ? (
        <Alert tone="success" title="Check your inbox">
          If an account exists for {email}, a password reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email" htmlFor="email" required>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg" disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
