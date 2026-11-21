/**
 * End-to-end test against the REAL running stack (Firebase project, Gemini, Cloudflare R2).
 *
 *   1. start the backend:  npm run dev:backend
 *   2. run:                npx tsx scripts/e2e.ts      (from backend/)
 *
 * It creates throwaway users/reports prefixed "[E2E TEST]", drives the whole workflow through the HTTP API
 * and deletes everything it created (Auth users, Firestore docs, R2 images) at the end.
 * Passwords/tokens are never printed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { COLLECTIONS, adminAuth, db } from '../src/config/firebase';
import { authoritiesRepo } from '../src/repositories/authorities.repository';
import { usersRepo } from '../src/repositories/users.repository';
import { storageService } from '../src/services/storage.service';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api';
const TAG = `[E2E TEST]`;
const RUN = Date.now().toString(36);

// ------------------------------------------------------------------ helpers
let passed = 0;
const failures: string[] = [];
const section = (s: string) => console.log(`\n== ${s}`);
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail !== undefined ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  }
}

interface Res {
  status: number;
  body: any;
}
async function call(
  method: string,
  p: string,
  opts: { token?: string; json?: unknown; form?: FormData; headers?: Record<string, string> } = {},
): Promise<Res> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: string | FormData | undefined;
  if (opts.form) body = opts.form;
  else if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(`${API}${p}`, { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** Minimal valid PNG (solid colour) so the real image pipeline (magic bytes, R2, Gemini) is exercised. */
function makePng(w = 96, h = 96, rgb: [number, number, number] = [120, 110, 100]): Buffer {
  const crc = (buf: Buffer) => {
    const n = zlib.crc32(buf);
    const out = Buffer.alloc(4);
    out.writeUInt32BE(n >>> 0);
    return out;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    return Buffer.concat([len, td, crc(td)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
/** Unique synthetic PNG per call (the platform rejects byte-identical duplicate photos). */
const png = (rgb?: [number, number, number]) =>
  new Blob([new Uint8Array(makePng(96, 96, rgb ?? [crypto.randomInt(30, 220), crypto.randomInt(30, 220), crypto.randomInt(30, 220)]))], { type: 'image/png' });

/**
 * Optional REAL civic photo (E2E_PHOTO=C:\path\pothole.jpg). The platform's Gemini image check rejects non-civic images,
 * so the full happy path needs a genuine photo. A random trailing suffix makes every upload byte-unique.
 */
const REAL_PHOTO = process.env.E2E_PHOTO && fs.existsSync(process.env.E2E_PHOTO) ? fs.readFileSync(process.env.E2E_PHOTO) : null;
const REAL_EXT = REAL_PHOTO ? path.extname(process.env.E2E_PHOTO!).toLowerCase() : '';
const REAL_MIME = REAL_EXT === '.png' ? 'image/png' : 'image/jpeg';
const photo = (): [Blob, string] =>
  REAL_PHOTO && REAL_EXT !== '.webp'
    ? [new Blob([new Uint8Array(Buffer.concat([REAL_PHOTO, crypto.randomBytes(16)]))], { type: REAL_MIME }), `photo${REAL_EXT || '.jpg'}`]
    : [png(), 'photo.png'];

function webApiKey(): string {
  const envFile = path.resolve(process.cwd(), '../frontend/.env.local');
  const m = fs.readFileSync(envFile, 'utf8').match(/^NEXT_PUBLIC_FIREBASE_API_KEY=(.+)$/m);
  if (!m) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY not found in frontend/.env.local');
  return m[1]!.trim();
}

/** Exchanges an Admin-SDK custom token for a real Firebase ID token (what the browser would send). */
async function idTokenFor(uid: string): Promise<string> {
  const custom = await adminAuth.createCustomToken(uid);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${webApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  const json = (await res.json()) as { idToken?: string; error?: { message: string } };
  if (!json.idToken) throw new Error(`Could not obtain ID token: ${json.error?.message ?? res.status}`);
  return json.idToken;
}

// ------------------------------------------------------------- state / cleanup
const created = { authUids: [] as string[], reportIds: [] as string[], authorityIds: [] as string[], imageUrls: new Set<string>() };

async function newAuthUser(label: string) {
  const email = `e2e-${label}-${RUN}@share2fix.test`;
  const rec = await adminAuth.createUser({ email, displayName: `${TAG} ${label}`, password: crypto.randomBytes(18).toString('base64url') });
  created.authUids.push(rec.uid);
  return { uid: rec.uid, email };
}

async function cleanup() {
  section('Cleanup');
  try {
    for (const id of created.reportIds) {
      const snap = await db.collection(COLLECTIONS.reports).doc(id).get();
      const data = snap.data();
      if (data?.imageUrls) (data.imageUrls as string[]).forEach((u) => created.imageUrls.add(u));
      for (const col of [COLLECTIONS.timeline, COLLECTIONS.comments, COLLECTIONS.assignments, COLLECTIONS.verifications, COLLECTIONS.supports, COLLECTIONS.notifications]) {
        const docs = await db.collection(col).where('reportId', '==', id).get();
        for (const d of docs.docs) {
          const ev = d.data().evidenceUrls as string[] | undefined;
          ev?.forEach((u) => created.imageUrls.add(u));
          await d.ref.delete();
        }
      }
      await snap.ref.delete();
    }
    await storageService.deleteByUrls([...created.imageUrls]);
    for (const id of created.authorityIds) await db.collection(COLLECTIONS.authorities).doc(id).delete();
    for (const uid of created.authUids) {
      await db.collection(COLLECTIONS.users).doc(uid).delete().catch(() => undefined);
      await adminAuth.deleteUser(uid).catch(() => undefined);
    }
    // remove test officers from the demo authorities' officerIds
    for (const a of await authoritiesRepo.list()) {
      for (const uid of created.authUids) if (a.officerIds?.includes(uid)) await authoritiesRepo.removeOfficer(a.authorityId, uid);
    }
    console.log(`  removed ${created.reportIds.length} reports, ${created.imageUrls.size} images, ${created.authUids.length} auth users, ${created.authorityIds.length} authorities`);
  } catch (e) {
    console.log('  CLEANUP ERROR (check manually):', (e as Error).message);
  }
}

// ------------------------------------------------------------------------ main
async function main() {
  const health = await fetch(API.replace(/\/api$/, '/health')).catch(() => null);
  if (!health?.ok) throw new Error(`Backend is not reachable at ${API}. Start it with: npm run dev:backend`);

  section('Setup: throwaway users');
  const adminU = await newAuthUser('admin');
  await usersRepo.create({ uid: adminU.uid, email: adminU.email, fullName: `${TAG} Admin`, role: 'ADMIN', phone: '', profileImage: '', isActive: true, authorityId: null });
  const citA = await newAuthUser('citizen-a');
  const citB = await newAuthUser('citizen-b');
  const [adminTok, tokA, tokB] = await Promise.all([idTokenFor(adminU.uid), idTokenFor(citA.uid), idTokenFor(citB.uid)]);
  check('obtained real Firebase ID tokens', !!adminTok && !!tokA && !!tokB);

  // ------------------------------------------------------------------ auth
  section('Auth, profile and basic access control');
  check('no token -> 401', (await call('GET', '/users/me')).status === 401);
  check('garbage token -> 401', (await call('GET', '/users/me', { token: 'not-a-token' })).status === 401);
  check('valid token but no profile -> 403 PROFILE_REQUIRED', (await call('GET', '/users/me', { token: tokA })).body?.error?.code === 'PROFILE_REQUIRED');

  let r = await call('POST', '/auth/profile', { token: tokA, json: { fullName: `${TAG} Citizen A`, phone: '0771234567', role: 'ADMIN' } });
  check('registration creates profile (201)', r.status === 201, r.body);
  check('role forced to CITIZEN even if client sends ADMIN', r.body?.data?.role === 'CITIZEN', r.body?.data?.role);
  r = await call('POST', '/auth/profile', { token: tokA, json: { fullName: 'Dup' } });
  check('duplicate profile -> 409', r.status === 409, r.status);
  r = await call('POST', '/auth/profile', { token: tokB, json: { fullName: `${TAG} Citizen B` } });
  check('citizen B profile created', r.status === 201, r.body);
  r = await call('PATCH', '/users/me', { token: tokA, json: { fullName: `${TAG} Citizen A2` } });
  check('profile update keeps phone (partial update)', r.status === 200 && r.body?.data?.phone === '0771234567', r.body?.data);
  r = await call('PATCH', '/users/me', { token: tokA, json: { role: 'ADMIN', fullName: `${TAG} Citizen A` } });
  check('role cannot be changed via profile update', (await call('GET', '/users/me', { token: tokA })).body?.data?.role === 'CITIZEN');
  check('citizen -> /admin/users forbidden (403)', (await call('GET', '/admin/users', { token: tokA })).status === 403);
  check('citizen -> /reports/managed forbidden (403)', (await call('GET', '/reports/managed', { token: tokA })).status === 403);
  check('citizen -> /stats/authority forbidden (403)', (await call('GET', '/stats/authority', { token: tokA })).status === 403);

  // --------------------------------------------------------------- admin
  section('Admin: create officers, authorities');
  const colombo = 'demo-colombo-mc';
  const kandy = 'demo-kandy-mc';
  r = await call('POST', '/admin/users', {
    token: adminTok,
    json: { fullName: `${TAG} Officer Colombo`, email: `e2e-off-colombo-${RUN}@share2fix.test`, password: crypto.randomBytes(12).toString('base64url'), role: 'AUTHORITY_OFFICER', authorityId: colombo },
  });
  check('admin creates Colombo officer (201)', r.status === 201, r.body);
  const offColUid: string = r.body?.data?.uid;
  if (offColUid) created.authUids.push(offColUid);
  r = await call('POST', '/admin/users', {
    token: adminTok,
    json: { fullName: `${TAG} Officer Kandy`, email: `e2e-off-kandy-${RUN}@share2fix.test`, password: crypto.randomBytes(12).toString('base64url'), role: 'AUTHORITY_OFFICER', authorityId: kandy },
  });
  const offKanUid: string = r.body?.data?.uid;
  if (offKanUid) created.authUids.push(offKanUid);
  check('admin creates Kandy officer (201)', r.status === 201, r.body);
  r = await call('POST', '/admin/users', { token: adminTok, json: { fullName: 'x y', email: `bad-${RUN}@share2fix.test`, password: 'longenough1', role: 'AUTHORITY_OFFICER' } });
  check('officer without authority rejected (400)', r.status === 400, r.status);
  const [colTok, kanTok] = await Promise.all([idTokenFor(offColUid), idTokenFor(offKanUid)]);

  r = await call('POST', '/admin/authorities', {
    token: adminTok,
    json: { name: `${TAG} Authority`, type: 'OTHER', coverage: { centerLatitude: 7.5, centerLongitude: 80.5, radiusKm: 3 }, handlesCategories: ['DRAINAGE'], contact: { email: 'e2e@share2fix.test' } },
  });
  check('admin creates authority (201)', r.status === 201, r.body);
  const authId: string = r.body?.data?.id;
  if (authId) created.authorityIds.push(authId);
  r = await call('PATCH', `/admin/authorities/${authId}`, { token: adminTok, json: { name: `${TAG} Authority renamed` } });
  check('partial authority update does not reset other fields', r.status === 200 && r.body?.data?.isActive === true && r.body?.data?.handlesCategories?.[0] === 'DRAINAGE' && r.body?.data?.contact?.email === 'e2e@share2fix.test', r.body?.data);
  check('officer -> /admin/stats forbidden', (await call('GET', '/admin/stats', { token: colTok })).status === 403);

  // ------------------------------------------------------------------ AI
  section('Gemini analysis preview');
  const f = new FormData();
  f.set('title', `${TAG} Pothole`);
  f.set('description', 'A large deep pothole in the middle of the main road near the bus stand, vehicles are swerving to avoid it.');
  f.append('images', ...photo());
  r = await call('POST', '/ai/analyze', { token: tokA, form: f });
  console.log(`  info  AI status: ${r.body?.data?.status}${r.body?.data?.failureReason ? ` (${r.body.data.failureReason})` : ''}${r.body?.data?.category ? ` -> ${r.body.data.category}/${r.body.data.priority}` : ''}`);
  check('/ai/analyze responds (never errors)', r.status === 200 && !!r.body?.data?.status, r.body);
  check('Gemini returned a valid structured analysis', r.body?.data?.status === 'OK' && !!r.body.data.category && !!r.body.data.priority && !!r.body.data.imageVerification, r.body?.data);
  console.log(`  info  image verification: ${JSON.stringify(r.body?.data?.imageVerification)}`);

  // --------------------------------------------------------- create report
  section('Report submission');
  const mk = (over: Record<string, string> = {}, files: [Blob, string][] = [photo()]) => {
    const fd = new FormData();
    const fields: Record<string, string> = {
      title: `${TAG} Pothole near bus stand ${RUN}`,
      description: 'A large deep pothole in the middle of the main road near the bus stand, vehicles are swerving to avoid it.',
      category: 'ROAD_DAMAGE',
      latitude: '6.9271',
      longitude: '79.8612',
      address: 'Galle Road, Colombo',
      ...over,
    };
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    files.forEach(([b, n]) => fd.append('images', b, n));
    return fd;
  };
  r = await call('POST', '/reports', { token: tokA, form: mk({}, []) });
  check('missing photo -> 400 PHOTO_REQUIRED', r.status === 400 && r.body?.error?.code === 'PHOTO_REQUIRED', r.body);
  r = await call('POST', '/reports', { token: tokA, form: mk({}, [[new Blob(['MZ-not-an-image'], { type: 'image/png' }), 'evil.png']]) });
  check('fake image (wrong magic bytes) rejected -> 400', r.status === 400, r.body);
  r = await call('POST', '/reports', { token: tokA, form: mk({}, [[new Blob(['<html>'], { type: 'text/html' }), 'x.html']]) });
  check('non-image mime rejected -> 400', r.status === 400, r.body);
  r = await call('POST', '/reports', { token: tokA, form: mk({ latitude: '51.5', longitude: '-0.12' }) });
  check('location outside Sri Lanka -> 400', r.status === 400, r.body);
  r = await call('POST', '/reports', { token: tokA, form: mk({ title: 'x' }) });
  check('invalid title -> 400 with field details', r.status === 400 && Array.isArray(r.body?.error?.details), r.body);
  r = await call('POST', '/reports', { token: offColUid ? colTok : '', form: mk() });
  check('officer cannot create reports -> 403', r.status === 403, r.status);

  r = await call('POST', '/reports', { token: tokA, form: mk() });
  check('valid report created (201)', r.status === 201, r.body);
  const rep = r.body?.data;
  const rid: string = rep?.id;
  if (rid) created.reportIds.push(rid);
  check('routed to Colombo MC (suggested)', rep?.assignedAuthority?.id === colombo && rep?.routing?.suggested === true && rep?.routing?.isDemoData === true, rep?.routing);
  check('initial status SUBMITTED (or UNDER_REVIEW if trust check flagged), aiAnalysis present', ['SUBMITTED', 'UNDER_REVIEW'].includes(rep?.status) && !!rep?.aiAnalysis?.status, rep?.status);
  console.log(`  info  behavioral: trust=${rep?.behavioralCheck?.trustScore} risk=${rep?.behavioralCheck?.riskLevel} flags=${JSON.stringify(rep?.behavioralCheck?.flags)}`);
  if (!rid) throw new Error(`Report creation failed, cannot continue the workflow: ${JSON.stringify(r.body?.error ?? r.body)}`);
  console.log(`  info  report AI: ${rep?.aiAnalysis?.status} ${rep?.aiAnalysis?.category ?? ''}/${rep?.aiAnalysis?.priority ?? ''}; priority stored: ${rep?.priority} (${rep?.prioritySource})`);
  rep?.imageUrls?.forEach((u: string) => created.imageUrls.add(u));
  if (rep?.imageUrls?.[0]) {
    const img = await fetch(rep.imageUrls[0]);
    check('uploaded photo is publicly readable from R2 (200, image/png)', img.status === 200 && (img.headers.get('content-type') ?? '').includes('image/png'), `${img.status} ${img.headers.get('content-type')}`);
  } else check('uploaded photo URL returned', false);

  // duplicate photo gate: re-upload the exact bytes of the first photo
  {
    const dupBytes = new Uint8Array(await (await fetch(rep.imageUrls[0])).arrayBuffer());
    const dupRes = await call('POST', '/reports', { token: tokB, form: mk({ title: `${TAG} Duplicate photo ${RUN}` }, [[new Blob([dupBytes], { type: 'image/png' }), 'dup.png']]) });
    check('byte-identical photo from another user rejected (400 DUPLICATE_IMAGE_DETECTED)', dupRes.status === 400 && dupRes.body?.error?.code === 'DUPLICATE_IMAGE_DETECTED', dupRes.body?.error ?? dupRes.status);
    if (dupRes.status === 201 && dupRes.body?.data?.id) created.reportIds.push(dupRes.body.data.id);
  }

  // a location with no matching authority (middle of the Indian Ocean side of SL bounds) -> fallback authority or none
  r = await call('POST', '/reports', { token: tokA, form: mk({ title: `${TAG} Jaffna drain ${RUN}`, category: 'DRAINAGE', latitude: '9.6615', longitude: '80.0255' }) });
  const rep2 = r.body?.data;
  if (rep2?.id) created.reportIds.push(rep2.id);
  rep2?.imageUrls?.forEach((u: string) => created.imageUrls.add(u));
  check('second report routed to Jaffna MC', rep2?.assignedAuthority?.id === 'demo-jaffna-mc', rep2?.assignedAuthority);

  // ----------------------------------------------------------- public read
  section('Public reads and privacy');
  r = await call('GET', `/reports/${rid}`);
  check('public report readable without login', r.status === 200 && r.body?.data?.title?.includes(TAG), r.status);
  const raw = JSON.stringify(r.body);
  const leaked = [citA.uid, 'createdBy', 'Citizen A', citA.email].filter((n) => raw.includes(n));
  check('public report hides reporter identity (no uid/name/email)', leaked.length === 0 && r.body?.data?.reporter === undefined, `leaked: ${JSON.stringify(leaked.map((x) => (x === citA.uid ? '<uid>' : x)))}`);
  check('public report does not expose behavioral trust score / flags', r.body?.data?.behavioralCheck === undefined || r.body?.data?.behavioralCheck === null, r.body?.data?.behavioralCheck);
  const pubTl = await call('GET', `/reports/${rid}/timeline`);
  check('public timeline does not expose trust score / flags', !JSON.stringify(pubTl.body).match(/trust score|DUPLICATE_IMAGE|GEO_ANOMALY|BURST_VELOCITY|NON_CIVIC/i), pubTl.body?.data?.[0]?.explanation);
  r = await call('GET', '/reports/map');
  const pin = r.body?.data?.find((p: any) => p.id === rid);
  check('map pin present, minimal fields only', !!pin && !('description' in pin) && !('createdBy' in pin) && typeof pin.latitude === 'number', pin);
  r = await call('GET', '/reports?status=SUBMITTED&category=ROAD_DAMAGE&limit=5');
  check('filtered public list works (indexes)', r.status === 200 && r.body?.data?.some((x: any) => x.id === rid), r.body);
  r = await call('GET', '/reports?limit=1');
  check('pagination meta returned', r.status === 200 && 'nextCursor' in (r.body?.meta ?? {}), r.body?.meta);
  r = await call('GET', '/reports/mine', { token: tokA });
  check('citizen A sees own report in /mine', r.body?.data?.some((x: any) => x.id === rid), r.status);
  r = await call('GET', '/reports/mine', { token: tokB });
  check('citizen B does not see it in /mine', !r.body?.data?.some((x: any) => x.id === rid), r.status);
  r = await call('GET', '/reports/doesnotexist123');
  check('unknown report -> 404', r.status === 404, r.status);
  r = await call('GET', '/reports/bad..id');
  check('malformed id -> 400', r.status === 400, r.status);

  // ----------------------------------------------------- support / comments
  section('Support and comments');
  r = await call('POST', `/reports/${rid}/support`, { token: tokA });
  check('cannot support own report (403)', r.status === 403, r.status);
  r = await call('POST', `/reports/${rid}/support`, { token: tokB });
  check('citizen B supports (count 1)', r.status === 200 && r.body?.data?.supported === true && r.body?.data?.supportCount === 1, r.body);
  r = await call('POST', `/reports/${rid}/support`, { token: tokB });
  check('toggle off (count 0)', r.body?.data?.supported === false && r.body?.data?.supportCount === 0, r.body);
  await call('POST', `/reports/${rid}/support`, { token: tokB });
  r = await call('GET', `/reports/${rid}`, { token: tokB });
  check('hasSupported reflected for B, count 1', r.body?.data?.viewer?.hasSupported === true && r.body?.data?.supportCount === 1, r.body?.data?.viewer);
  check('officer cannot "support" (403)', (await call('POST', `/reports/${rid}/support`, { token: colTok })).status === 403);
  r = await call('POST', `/reports/${rid}/comments`, { token: tokB, json: { text: 'I walk past this every day, it is dangerous.' } });
  check('comment created (201)', r.status === 201, r.body);
  r = await call('POST', `/reports/${rid}/comments`, { token: tokB, json: { text: '' } });
  check('empty comment rejected (400)', r.status === 400, r.status);
  r = await call('GET', `/reports/${rid}/comments`);
  check('comments public, no user ids', r.status === 200 && r.body?.data?.length === 1 && !JSON.stringify(r.body).includes(citB.uid), r.body);
  r = await call('GET', '/notifications', { token: tokA });
  check('reporter notified about the comment', r.body?.data?.unread >= 1 && r.body.data.items.some((n: any) => n.type === 'COMMENT'), r.body?.data);

  // ------------------------------------------------- officer authorisation
  section('Authority workflow and authorisation');
  r = await call('GET', '/reports/managed', { token: colTok });
  check('Colombo officer queue contains the report', r.status === 200 && r.body?.data?.some((x: any) => x.id === rid), r.body?.error);
  check('Colombo officer queue excludes Jaffna report', !r.body?.data?.some((x: any) => x.id === rep2?.id));
  r = await call('GET', '/reports/managed?priority=HIGH&status=SUBMITTED', { token: colTok });
  check('officer filters (status+priority) work', r.status === 200, r.body?.error);
  r = await call('GET', `/reports/${rid}`, { token: colTok });
  check('officer sees reporter name + canManage', r.body?.data?.reporter?.name?.includes('Citizen A') && r.body?.data?.viewer?.canManage === true, r.body?.data?.viewer);

  const st = (tok: string, status: string, explanation = '', files: [Blob, string][] = []) => {
    const fd = new FormData();
    fd.set('status', status);
    fd.set('explanation', explanation);
    files.forEach(([b, n]) => fd.append('images', b, n));
    return call('POST', `/reports/${rid}/status`, { token: tok, form: fd });
  };
  r = await st(kanTok, 'ACCEPTED');
  check('Kandy officer cannot touch Colombo report (403)', r.status === 403, r.status);
  r = await call('POST', `/reports/${rid}/reassign`, { token: kanTok, json: { authorityId: kandy, reason: 'steal it' } });
  check('Kandy officer cannot reassign it to themselves (403)', r.status === 403, r.status);
  r = await st(tokA, 'ACCEPTED');
  check('citizen cannot change status (403)', r.status === 403, r.status);
  r = await st(colTok, 'RESOLVED', 'Fixed already, honestly.', [photo()]);
  check('invalid transition SUBMITTED->RESOLVED -> 409', r.status === 409 && r.body?.error?.code === 'INVALID_TRANSITION', r.body);
  if (rep.status === 'SUBMITTED') {
    r = await st(colTok, 'UNDER_REVIEW', '');
    check('SUBMITTED -> UNDER_REVIEW ok', r.status === 200 && r.body?.data?.status === 'UNDER_REVIEW', r.body);
  }
  r = await st(colTok, 'REJECTED', '');
  check('reject without explanation -> 422', r.status === 422 && r.body?.error?.code === 'EXPLANATION_REQUIRED', r.body);
  r = await st(colTok, 'ACCEPTED', 'Team assigned');
  check('UNDER_REVIEW -> ACCEPTED ok', r.status === 200 && r.body?.data?.status === 'ACCEPTED', r.body);
  r = await st(colTok, 'IN_PROGRESS', 'Work starts tomorrow');
  check('ACCEPTED -> IN_PROGRESS ok', r.status === 200 && r.body?.data?.status === 'IN_PROGRESS', r.body);
  r = await st(colTok, 'RESOLVED', 'Pothole filled and compacted with asphalt.');
  check('resolve without evidence -> 422 EVIDENCE_REQUIRED', r.status === 422 && r.body?.error?.code === 'EVIDENCE_REQUIRED', r.body);
  r = await st(colTok, 'RESOLVED', '');
  check('resolve without explanation -> 422', r.status === 422, r.body);

  const pf = new FormData();
  pf.set('explanation', 'Material delivered to site, crew working on it.');
  pf.append('images', ...photo());
  r = await call('POST', `/reports/${rid}/progress`, { token: colTok, form: pf });
  check('progress update with photo ok', r.status === 200 && r.body?.data?.some((e: any) => e.type === 'PROGRESS_UPDATE' && e.evidenceUrls.length === 1), r.body?.error);
  r.body?.data?.forEach((e: any) => e.evidenceUrls?.forEach((u: string) => created.imageUrls.add(u)));

  r = await st(colTok, 'RESOLVED', 'Pothole filled and compacted with asphalt.', [photo()]);
  check('resolve with explanation + evidence ok', r.status === 200 && r.body?.data?.status === 'RESOLVED' && r.body.data.resolution?.evidenceUrls?.length === 1, r.body);
  r.body?.data?.resolution?.evidenceUrls?.forEach((u: string) => created.imageUrls.add(u));
  if (r.body?.data?.resolution?.evidenceUrls?.[0]) {
    const img = await fetch(r.body.data.resolution.evidenceUrls[0]);
    check('resolution evidence readable from R2', img.status === 200, img.status);
  }
  r = await call('POST', `/reports/${rid}/progress`, { token: colTok, form: (() => { const x = new FormData(); x.set('explanation', 'late note'); return x; })() });
  check('no progress updates on resolved report (409)', r.status === 409, r.status);

  r = await call('GET', '/notifications', { token: tokA });
  check('reporter notified of resolution', r.body?.data?.items?.some((n: any) => n.type === 'RESOLUTION'), r.body?.data?.items?.map((n: any) => n.type));

  // ---------------------------------------------------------- verification
  section('Community verification (separate from authority decision)');
  r = await call('POST', `/reports/${rid}/verify`, { token: colTok, json: { status: 'CONFIRMED' } });
  check('officer cannot verify (403)', r.status === 403, r.status);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'DISPUTED', explanation: '' } });
  check('dispute needs an explanation (400)', r.status === 400, r.body);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'CONFIRMED' } });
  check('B confirms -> confirmed 1, status stays RESOLVED', r.status === 200 && r.body?.data?.verification?.confirmed === 1 && r.body.data.status === 'RESOLVED' && r.body.data.viewer.myVerification === 'CONFIRMED', r.body?.data?.verification);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'CONFIRMED' } });
  check('same verification twice -> 409', r.status === 409, r.status);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'DISPUTED', explanation: 'Water still pools in the repaired patch.' } });
  check('B changes to dispute -> confirmed 0, disputed 1, status unchanged', r.status === 200 && r.body?.data?.verification?.confirmed === 0 && r.body.data.verification.disputed === 1 && r.body.data.status === 'RESOLVED', r.body?.data?.verification);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokA, json: { status: 'CONFIRMED' } });
  check('reporter A confirms -> 1/1', r.body?.data?.verification?.confirmed === 1 && r.body.data.verification.disputed === 1, r.body?.data?.verification);

  r = await st(colTok, 'IN_PROGRESS', '');
  check('re-open without explanation -> 422', r.status === 422, r.body);
  r = await st(colTok, 'IN_PROGRESS', 'Reopened after citizen dispute; re-inspecting drainage around patch.');
  check('officer re-opens disputed report', r.status === 200 && r.body?.data?.status === 'IN_PROGRESS' && r.body.data.resolution === null, r.body?.data?.status);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'CONFIRMED' } });
  check('cannot verify a non-resolved report (409)', r.status === 409, r.status);
  r = await st(colTok, 'RESOLVED', 'Re-laid the patch and cleared the drain.', [photo()]);
  r.body?.data?.resolution?.evidenceUrls?.forEach((u: string) => created.imageUrls.add(u));
  check('resolved again: verification counters reset', r.status === 200 && r.body?.data?.verification?.confirmed === 0 && r.body.data.verification.disputed === 0, r.body?.data?.verification);
  r = await call('POST', `/reports/${rid}/verify`, { token: tokB, json: { status: 'CONFIRMED' } });
  check('B can verify the new resolution cycle', r.status === 200 && r.body?.data?.verification?.confirmed === 1, r.body?.data?.verification);

  // ------------------------------------------------------------ reassign
  section('Reassignment and classification');
  r = await call('POST', `/reports/${rid}/reassign`, { token: colTok, json: { authorityId: kandy, reason: '' } });
  check('reassign without reason -> 400', r.status === 400, r.status);
  r = await call('POST', `/reports/${rid}/reassign`, { token: colTok, json: { authorityId: colombo, reason: 'same authority' } });
  check('reassign to same authority -> 409', r.status === 409, r.status);
  r = await call('POST', `/reports/${rid}/reassign`, { token: colTok, json: { authorityId: 'nope-not-real', reason: 'wrong place' } });
  check('reassign to unknown authority -> 400', r.status === 400, r.status);
  r = await call('POST', `/reports/${rid}/reassign`, { token: colTok, json: { authorityId: kandy, reason: 'Location is actually under Kandy jurisdiction (e2e).' } });
  check('Colombo officer reassigns to Kandy', r.status === 200 && r.body?.data?.assignedAuthority?.id === kandy && r.body.data.routing.method === 'MANUAL', r.body?.error ?? r.body?.data?.assignedAuthority);
  r = await call('POST', `/reports/${rid}/progress`, { token: colTok, form: (() => { const x = new FormData(); x.set('explanation', 'still mine?'); return x; })() });
  check('Colombo officer loses access after reassign (403)', r.status === 403, r.status);
  r = await call('GET', '/reports/managed', { token: kanTok });
  check('Kandy officer now sees it in queue', r.body?.data?.some((x: any) => x.id === rid), r.body?.error);

  r = await call('PATCH', `/reports/${rep2.id}/classification`, { token: tokB, json: { category: 'OTHER' } });
  check('other citizen cannot reclassify (403)', r.status === 403, r.status);
  r = await call('PATCH', `/reports/${rep2.id}/classification`, { token: tokA, json: { category: 'WATER_LEAK', priority: 'HIGH' } });
  check('owner corrects category/priority while SUBMITTED', r.status === 200 && r.body?.data?.category === 'WATER_LEAK' && r.body.data.priority === 'HIGH' && r.body.data.categorySource === 'CITIZEN', r.body);
  r = await call('PATCH', `/reports/${rid}/classification`, { token: tokA, json: { category: 'OTHER' } });
  check('owner cannot reclassify after work started (403)', r.status === 403, r.status);
  r = await call('PATCH', `/reports/${rep2.id}/classification`, { token: tokA, json: {} });
  check('empty classification rejected (400)', r.status === 400, r.status);

  // -------------------------------------------------------------- timeline
  section('Timeline');
  r = await call('GET', `/reports/${rid}/timeline`);
  const types = (r.body?.data ?? []).map((e: any) => e.type);
  check('timeline public and ordered', r.status === 200 && types[0] === 'CREATED', types);
  check('timeline has status changes, progress, verifications and assignment', ['STATUS_CHANGE', 'PROGRESS_UPDATE', 'VERIFICATION', 'ASSIGNMENT'].every((t) => types.includes(t)), types);
  const statusSeq = (r.body?.data ?? []).filter((e: any) => e.type === 'STATUS_CHANGE').map((e: any) => e.newStatus).join('>');
  check('status history is exactly as performed', statusSeq.endsWith('ACCEPTED>IN_PROGRESS>RESOLVED>IN_PROGRESS>RESOLVED'), statusSeq);

  // ---------------------------------------------------------------- admin
  section('Admin operations and stats');
  r = await call('GET', '/admin/stats', { token: adminTok });
  check('admin platform stats', r.status === 200 && r.body?.data?.total >= 2 && typeof r.body.data.byStatus?.RESOLVED === 'number', r.body?.error);
  r = await call('GET', '/stats/authority', { token: kanTok });
  check('officer authority stats', r.status === 200 && r.body?.data?.total >= 1, r.body?.error);
  r = await call('GET', '/reports/managed?authorityId=UNASSIGNED', { token: adminTok });
  check('admin can filter unassigned', r.status === 200, r.body?.error);
  r = await call('GET', '/reports/managed?limit=3', { token: adminTok });
  check('admin sees all reports', r.status === 200 && r.body?.data?.length >= 1, r.body?.error);
  r = await call('PATCH', `/admin/users/${adminU.uid}`, { token: adminTok, json: { isActive: false } });
  check('admin cannot deactivate self (403)', r.status === 403, r.status);
  r = await call('PATCH', `/admin/users/${offKanUid}`, { token: adminTok, json: { isActive: false } });
  check('admin deactivates Kandy officer', r.status === 200 && r.body?.data?.isActive === false, r.body?.error);
  r = await call('GET', '/reports/managed', { token: kanTok });
  check('deactivated officer is blocked (403)', r.status === 403, r.status);
  r = await call('GET', '/stats/public');
  check('public stats', r.status === 200 && r.body?.data?.totalReports >= 2, r.body);

  // ------------------------------------------------------------- transport
  section('Transport-level security');
  const pre = await fetch(`${API}/reports`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
  check('CORS: foreign origin not allowed', !pre.headers.get('access-control-allow-origin'), pre.headers.get('access-control-allow-origin'));
  const pre2 = await fetch(`${API}/reports`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' } });
  check('CORS: frontend origin allowed', pre2.headers.get('access-control-allow-origin') === 'http://localhost:3000', pre2.headers.get('access-control-allow-origin'));
  const big = new FormData();
  big.set('title', 'big');
  big.append('images', new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: 'image/png' }), 'big.png');
  r = await call('POST', '/reports', { token: tokA, form: big });
  check('oversize image -> 413', r.status === 413, r.status);
  r = await call('POST', '/reports/xyz/comments', { token: tokA, headers: { 'Content-Type': 'application/json' } });
  check('invalid JSON body handled (400)', r.status === 400, r.status);
}

main()
  .catch((e) => {
    failures.push(`SCRIPT ERROR: ${(e as Error).message}`);
    console.log(`\nSCRIPT ERROR: ${(e as Error).stack ?? e}`);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n=== RESULT: ${passed} passed, ${failures.length} failed ===`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(failures.length ? 1 : 0);
  });
