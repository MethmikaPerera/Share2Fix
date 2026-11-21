# Share2Fix - Report. Share. Fix.

Community-powered civic issue reporting and resolution for Sri Lanka.
Hackathon theme: **Build Something for the Community**.

Citizens report local problems (potholes, garbage, blocked drains, broken streetlights, water leaks...), neighbours support them,
and the responsible authority accepts, fixes and proves the fix with photo evidence. Citizens then confirm or dispute the resolution.
It is not a social feed: every report becomes a trackable action with a public timeline.

```
Citizen submits a report -> Gemini analyses it -> system suggests an authority -> officer receives it
 -> officer updates status -> officer uploads resolution evidence -> citizen tracks and verifies the fix
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4, lucide-react, Leaflet + OpenStreetMap |
| Backend | Node.js, Express 5, TypeScript, zod, helmet, express-rate-limit, multer |
| Auth + data | Firebase Authentication (email/password) + Cloud Firestore (Firebase Admin SDK on the server) |
| Image storage | **Cloudflare R2** (S3-compatible, free tier), uploaded through the backend |
| AI | Google Gemini via the official `@google/genai` SDK, called only from the backend |

> **Why R2 instead of Firebase Storage?** Firebase Storage now requires the paid Blaze plan. R2 has a free tier
> (10 GB, no egress fees). Uploads go browser -> Express -> R2, so R2 credentials never reach the browser.

## Repository layout

```
backend/    Express API  (routes, controllers, services, repositories, middleware, validators, config, types, utils)
frontend/   Next.js app  (app/, components/, features/, hooks/, lib/, types/)
firestore.rules, firestore.indexes.json, firebase.json   Firestore security rules + composite indexes
```

## Quick start

Requirements: Node.js 20+ (tested on 22), npm 10+.

```powershell
npm install                 # installs both workspaces
```

Then complete the three setups below (Firebase, R2, Gemini), fill in the two `.env` files, and run:

```powershell
npm run seed                # demo authorities (demonstration data)
npm run dev:backend         # http://localhost:4000
npm run dev:frontend        # http://localhost:3000   (second terminal)
```

### 1. Firebase (existing project)

1. Firebase console -> **Build -> Authentication -> Sign-in method** -> enable **Email/Password** and **Google**
   (Google: pick a project support email and save). `localhost` is already an authorised domain; add your production domain under
   *Authentication -> Settings -> Authorized domains*. First-time Google users automatically get a **CITIZEN** profile.
2. **Build -> Firestore Database** -> *Create database* (production mode). Pick a region close to you (e.g. `asia-south1`).
3. **Project settings -> General -> Your apps -> Web app (`</>`)** -> register an app and copy the config values into
   `frontend/.env.local` (copy from `frontend/.env.example`). These are public identifiers, not secrets.
4. **Project settings -> Service accounts -> Generate new private key.** Save the JSON as `backend/secrets/serviceAccount.json`
   (that folder is git-ignored) and set in `backend/.env`:
   ```
   FIREBASE_PROJECT_ID=<your project id>
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
   ```
   **Never commit this file or paste it anywhere public.**
5. Deploy the security rules and indexes (log in once with `npx firebase login`):
   ```powershell
   npx firebase use <your-project-id>
   npm run firebase:deploy-rules
   ```
   Composite indexes take a few minutes to build. Until they are ready, filtered list queries return a
   `FAILED_PRECONDITION` error; the Firestore console shows build progress.

### 2. Cloudflare R2 (free image storage)

1. Cloudflare dashboard -> **R2 Object Storage** -> create a bucket (e.g. `share2fix-media`). R2 may ask for a payment method on file
   to activate; the free tier (10 GB) is not charged.
2. Bucket -> **Settings -> Public access** -> enable the **r2.dev subdomain** (or attach a custom domain). Copy the public URL.
3. R2 overview -> **Manage API tokens -> Create API token** with *Object Read & Write* on that bucket. Copy the Access Key ID and Secret.
4. Fill in `backend/.env`:
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=share2fix-media
   R2_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
   ```
   Report photos are public by design (reports are public), but contain no personal data.

### 3. Gemini API key

Create a key in [Google AI Studio](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `backend/.env`.
`GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` (fast; `gemini-2.5-flash` is no longer available to new API keys). Change it if Google retires that model.
If the key is missing or Gemini is rate-limited or down, reports are still accepted using the citizen's category and a default priority.

### 4. Environment files

| File | Purpose |
|---|---|
| `backend/.env` | copy of `backend/.env.example` - server secrets (Firebase Admin, Gemini, R2) |
| `frontend/.env.local` | copy of `frontend/.env.example` - API URL + public Firebase web config |

The backend validates its environment at start-up and exits with a clear list of missing variables.

## Accounts and roles

* Anyone can **register** from the app. Registration always creates a **CITIZEN**; the role is never taken from the client.
* **First administrator:** register normally in the app, then run
  ```powershell
  npm run seed -- --admin you@example.com
  ```
* The admin then creates **authority officers** under *Admin -> Users* (and links them to an authority).
* Optional demo accounts for a live demo (admin, two officers, one citizen):
  ```powershell
  $env:SEED_DEMO_PASSWORD = "choose-a-demo-password"
  npm run seed -- --demo-users
  ```
  Demo logins: `admin@share2fix.demo`, `officer.colombo@share2fix.demo`, `officer.kandy@share2fix.demo`, `citizen@share2fix.demo`.

## How the core workflow works

1. **Submit** (`POST /api/reports`, multipart): validates input (zod) and images (type, size **and magic bytes**), uploads to R2,
   runs Gemini on description + first photo, suggests an authority from configured coverage areas, writes the report, a
   `report_timeline` entry and an `assignments` record. If Gemini fails the report is still saved (`aiAnalysis.status = "UNAVAILABLE"`).
2. **Route**: `services/routing.service.ts` picks the *smallest matching coverage circle* (that handles the category). It is a
   **suggestion based on geography, not proof of official jurisdiction**, and the seeded authorities are clearly labelled **demo data**.
   If nothing matches the report is unassigned and an admin assigns it. Officers/admins can reassign; every change is recorded.
3. **Authority** works the report: `SUBMITTED -> UNDER_REVIEW -> ACCEPTED -> IN_PROGRESS -> RESOLVED` (or `REJECTED`).
   Resolving or rejecting requires an explanation; resolving requires at least one evidence photo. Each change writes a timeline event
   inside a Firestore transaction and notifies the reporter.
4. **Citizen verifies**: while `RESOLVED`, citizens confirm or dispute the fix. This is stored separately
   (`resolution_verifications`) and never changes the authority's status; an officer can re-open a disputed report.

## API overview (`/api`)

| Area | Endpoints |
|---|---|
| Auth/profile | `POST /auth/profile`, `GET/PATCH /users/me` |
| Reports (public read) | `GET /reports`, `GET /reports/map`, `GET /reports/:id`, `GET /reports/:id/timeline`, `GET /reports/:id/comments` |
| Reports (citizen) | `POST /reports`, `GET /reports/mine`, `POST /reports/:id/support`, `POST /reports/:id/verify`, `POST /reports/:id/comments`, `PATCH /reports/:id/classification`, `POST /ai/analyze` |
| Reports (staff) | `GET /reports/managed`, `POST /reports/:id/status`, `POST /reports/:id/progress`, `POST /reports/:id/reassign`, `GET /stats/authority` |
| Admin | `GET /admin/stats`, `GET/POST /admin/users`, `PATCH /admin/users/:id`, `GET/POST /admin/authorities`, `PATCH /admin/authorities/:id` |
| Other | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /authorities`, `GET /stats/public` |

All responses use `{ success, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

## Security model

* Firebase ID tokens are verified on every protected route; the **role is read from Firestore**, never from the client or token.
* Role checks are enforced in the API (`requireRole`) and again per report (an officer can only manage reports assigned to their authority).
* Public report responses never include the reporter's uid; the map returns only title, category, status, priority and coordinates.
* `firestore.rules` is deny-by-default: no client writes except a whitelist of own-profile fields (so nobody can self-promote to admin)
  and the `read` flag on own notifications. Reports contain reporter identifiers, so they are **not** directly readable by the public via the client SDK; the sanitised API serves public data.
* Helmet, strict CORS allow-list, JSON body limit, rate limits (global, per-user on expensive/write endpoints), upload limits (5 MB, JPEG/PNG/WebP, magic-byte check).
* Gemini output is schema-constrained **and** re-validated with zod before storage; user text is passed as data with an injection-resistant prompt.
* Secrets live only in git-ignored env files / the service-account file.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:backend` / `npm run dev:frontend` | development servers |
| `npm run typecheck` | typecheck both workspaces |
| `npm run build` | production build of both |
| `npm run seed` | seed demo authorities (`-- --admin <email>`, `-- --demo-users`) |
| `npm run firebase:deploy-rules` | deploy Firestore rules + indexes |

## Known limitations (MVP)

* Authority data is demonstration data with circular coverage areas; plug official boundaries into `routing.service.ts`.
* Report text search runs over the already-loaded page (Firestore has no full-text search); filters and pagination are server-side.
* Notifications are in-app only (polled every 60 s); no email/SMS.
* `npm audit` reports a high advisory in a transitive `@grpc/grpc-js` copy that ships inside the Firebase *client* SDK's Firestore package.
  This app only uses `firebase/auth` in the browser, so that code is never loaded. Do not run `npm audit fix --force` (it downgrades Firebase).
