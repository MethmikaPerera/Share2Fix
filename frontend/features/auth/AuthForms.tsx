'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { authErrorMessage, isPopupDismissed } from '@/lib/authErrors';
import { errorMessage } from '@/lib/api';
import { homePathFor, useAuth } from './AuthProvider';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

/** "Continue with Google" + an "or" divider. Works for both sign-in and first-time sign-up (a citizen profile is created automatically). */
function GoogleSection({ onError }: { onError: (message: string | null) => void }) {
  const { loginWithGoogle, configured } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    onError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
      // On success the auth listener loads the profile and useRedirectIfSignedIn navigates away.
    } catch (err) {
      if (!isPopupDismissed(err)) onError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="lg" className="w-full" loading={busy} disabled={!configured} onClick={onClick} icon={<GoogleLogo />}>
        Continue with Google
      </Button>
      <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-ink-faint" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

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
    <div>
      <h1 className="text-[2.125rem] leading-[1.1]">{title}</h1>
      <p className="mb-8 mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{subtitle}</p>
      <div className="space-y-5">
        <SetupNotice />
        {children}
      </div>
      <div className="mt-8 border-t border-line pt-5 text-center text-sm text-ink-soft">{footer}</div>
    </div>
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
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {(error || sessionError) && <Alert tone="error">{error ?? sessionError}</Alert>}
        <GoogleSection onError={setError} />
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="-mt-1 text-right text-[0.8125rem]">
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
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <GoogleSection onError={setError} />
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
        <p className="text-center text-xs text-ink-faint">New accounts are citizen accounts. Authority access is granted by an administrator.</p>
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
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
