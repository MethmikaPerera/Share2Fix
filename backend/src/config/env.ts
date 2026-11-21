import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = z.preprocess(emptyToUndefined, z.string().optional());
const required = (name: string) => z.string({ error: `${name} is required` }).min(1, `${name} is required`);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  FIREBASE_PROJECT_ID: required('FIREBASE_PROJECT_ID'),
  GOOGLE_APPLICATION_CREDENTIALS: optional,
  FIREBASE_SERVICE_ACCOUNT_JSON: optional,

  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  R2_ACCOUNT_ID: required('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: required('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: required('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET: required('R2_BUCKET'),
  R2_PUBLIC_BASE_URL: required('R2_PUBLIC_BASE_URL').transform((v) => v.replace(/\/+$/, '')),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  // eslint-disable-next-line no-console
  console.error(`\nInvalid or missing environment variables in backend/.env:\n${lines.join('\n')}\n`);
  console.error('Copy backend/.env.example to backend/.env and fill in the values (see README).\n');
  process.exit(1);
}

const raw = parsed.data;

if (!raw.GOOGLE_APPLICATION_CREDENTIALS && !raw.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error(
    '\nFirebase Admin credentials missing: set GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_SERVICE_ACCOUNT_JSON.\n',
  );
  process.exit(1);
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
};
