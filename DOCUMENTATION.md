# Share2Fix: Civic Infrastructure Intelligence & Resolution Platform
## Comprehensive Product Overview & Technical Architecture Specification

---

## Executive Summary

**Share2Fix** is an enterprise-grade civic issue intelligence and resolution platform designed to modernize public infrastructure maintenance, civic accountability, and municipal service delivery across Sri Lanka.

Traditional civic complaint systems in developing nations suffer from three structural points of failure:
1. **Unstructured Ingestion**: Citizens report issues via ad-hoc social media posts, phone calls, or physical letters without geographic coordinates, standardized categorization, or cryptographic verification.
2. **Opaque Routing & Triage**: Complaints sit in administrative silos because routing between local municipal councils (Municipal Councils, Urban Councils, Pradeshiya Sabhas) and national statutory bodies (Road Development Authority, National Water Supply & Drainage Board, Ceylon Electricity Board) is manual and error-prone.
3. **Absence of Proof & Post-Resolution Closure**: Cases are frequently closed administratively without photographic proof of work, leaving citizens unable to confirm whether repairs actually occurred or to dispute substandard contractor delivery.

Share2Fix transforms community complaints from an unmonitored social grievance feed into an auditable, data-driven operational workflow. By fusing **Google Gemini Multimodal AI**, **cryptographic image verification**, **geospatial routing algorithms**, and a **tamper-evident audit trail**, Share2Fix establishes an end-to-end pipeline: from the moment a resident photographs an infrastructure defect to automated triage, verified municipal repair, and final community verification.

```
+-------------------------------------------------------------------------------------------------------+
|                                        THE SHARE2FIX PIPELINE                                         |
+-------------------------------------------------------------------------------------------------------+
|   [ Citizen ]            [ AI & Behavioral ]          [ Routing Engine ]         [ Authority ]        |
|  Reports issue      ->  Multimodal validation    ->   Smallest coverage     ->  Reviews queue         |
|  with photo & GPS       Trust score computation       jurisdiction match        Executes repair       |
|                                                                                       |               |
|   [ Citizen ]            [ Public Ledger ]             [ Photo Proof ]                v               |
|  Confirms/Disputes  <-  Immutable timeline       <-   Officer uploads       <-  Marks RESOLVED with   |
|  resolution             audit record                  resolution evidence       before/after proof    |
+-------------------------------------------------------------------------------------------------------+
```

---

# PART I: CLIENT & STAKEHOLDER PRODUCT MANUAL

## 1. Problem Statement & Regional Context

Municipal and public infrastructure delivery in Sri Lanka faces acute operational challenges:
* **Overlapping Jurisdictions**: A single roadway may fall under the Road Development Authority (national highways), a Provincial Council (secondary roads), or a Municipal Council (local lanes). A broken water line may belong to the National Water Supply and Drainage Board (NWSDB) while running directly under a local council roadway. When issues arise, complaints bounce between agencies, causing weeks of delay.
* **Information Asymmetry**: Citizens have zero visibility into maintenance schedules, queue status, or responsible divisions. Local governments lack unified field data, heatmaps of acute infrastructure decay, or objective triage metrics.
* **Vulnerability to Spam & Fraud**: Open public complaint portals regularly drown in unverified claims, internet memes, duplicated photos taken off online forums, or politically motivated false reports.

Share2Fix bridges this divide by providing an objective, transparent, and structured interface that benefits all participants in the civic ecosystem.

---

## 2. Platform Value Proposition

### For Citizens & Residents
* **Instant, Frictionless Reporting**: Submit an incident in under 45 seconds using mobile GPS, interactive Leaflet/OpenStreetMap coordinates, automated reverse geocoding, and photo capture.
* **AI-Assisted Guidance**: Intelligent classification automatically identifies the defect type (pothole, blocked drain, illegal dump, broken streetlight, water main burst) and urgency tier without requiring technical knowledge.
* **Transparent Action Tracking**: Move beyond a generic "ticket received" email. Citizens follow a real-time status tracker (`SUBMITTED` -> `UNDER_REVIEW` -> `ACCEPTED` -> `IN_PROGRESS` -> `RESOLVED`) with officer updates and photos of the completed repair.
* **Democratic Peer Accountability**: Citizens can upvote nearby issues to signal community severity and publicly confirm or dispute marked resolutions.

### For Municipal Councils & Statutory Authorities
* **Pre-Screened, High-Fidelity Queues**: Field officers receive structured incident tickets enriched with severity ratings, AI summaries, GPS accuracy, and duplicate checks, eliminating manual triage overhead.
* **Automated Fraud Screening**: Built-in behavioral algorithms score every submission, flagging staged images, non-civic photos (selfies, memes, indoor rooms), and impossible transit velocity before field teams are dispatched.
* **Resolution Accountability**: Field officers must upload physical evidence photos and technical notes before marking an issue resolved. This creates an unshakeable defense against claims of inaction and ensures contractor performance standards.
* **Actionable Spatial Intelligence**: Interactive map views and cluster dashboards identify regional infrastructure bottlenecks, enabling preemptive maintenance rather than reactive patching.

### For Central Government & Executive Oversight
* **Cross-Agency Visibility**: Central oversight monitors resolution metrics, average resolution turnaround times, and citizen dispute rates across diverse administrative bodies.
* **Data-Driven Resource Allocation**: Objective incident volume and severity statistics justify budgetary distribution to high-impact divisions and underserved wards.

---

## 3. Stakeholder Workflows & User Personas

```
+-----------------------------------------------------------------------------------------------+
|                                      SYSTEM ROLES & ACCESS                                    |
+----------------------+------------------------------------------------------------------------+
| Role                 | Key Responsibilities & Capabilities                                    |
+----------------------+------------------------------------------------------------------------+
| CITIZEN              | - Create incident reports with photos, GPS, and descriptions           |
|                      | - Upvote / support community reports to raise civic priority           |
|                      | - Comment and participate in public discussions                        |
|                      | - Flag spam, duplicates, or staged content                             |
|                      | - Confirm or dispute resolution evidence once repairs are reported     |
+----------------------+------------------------------------------------------------------------+
| AUTHORITY_OFFICER    | - Access dedicated organizational incident queue                       |
|                      | - Update ticket status (Accept, Put In Progress, Resolve, Reject)       |
|                      | - Publish real-time operational progress notes to the public timeline  |
|                      | - Upload mandatory resolution evidence photos before ticket closure    |
|                      | - Reassign misrouted tickets to the appropriate agency                 |
|                      | - View authority-level resolution statistics and performance metrics   |
+----------------------+------------------------------------------------------------------------+
| ADMIN                | - Manage municipal authorities, coverage zones, and contact channels   |
|                      | - Provision and audit staff and officer accounts                       |
|                      | - Review platform-wide fraud alerts, disputed resolutions, and flags   |
|                      | - Manually assign or reroute unassigned tickets across boundaries      |
|                      | - Review comprehensive system-wide performance and health dashboards   |
+----------------------+------------------------------------------------------------------------+
```

### Citizen Journey: From Discovery to Resolution Confirmation
1. **Detection**: A resident encounters a severe water main leak flooding a roadway in Kandy.
2. **Submission**: The resident opens Share2Fix, clicks "Report Issue", snaps a photo, and clicks "Use Current Location". The reverse geocoder populates the street address.
3. **AI Pre-Analysis**: The backend multimodal engine confirms the image shows a ruptured water pipe, tags it as `WATER_LEAK`, assigns `HIGH` priority, and summarizes the disruption.
4. **Automated Dispatch**: The geographic routing engine matches the coordinate to the Kandy Municipal Council / NWSDB zone and routes the ticket to their queue.
5. **Timeline Updates**: The resident receives in-app notifications as the water authority accepts the ticket and posts an update: *"Repair crew dispatched to valve station 4."*
6. **Resolution & Evidence**: The crew repairs the main, snaps a photo of the restored pipe, and marks the ticket `RESOLVED`.
7. **Verification**: The resident and local neighbors inspect the site. They click **Confirm Fix**; if the repair was incomplete, they click **Dispute Fix** with photographic evidence, automatically signaling supervisory review.

### Authority Officer Journey: High-Efficiency Queue Management
1. **Morning Review**: The municipal engineer logs into the Authority Operations Portal.
2. **Prioritized Filtering**: The queue automatically sorts tickets by priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and status. Tickets with behavioral risk flags display visual caution badges with trust breakdowns.
3. **Investigation & Work**: An officer marks an accepted pothole ticket as `IN_PROGRESS` and adds an operational note detailing the scheduled asphalt delivery.
4. **Completion**: Once field workers finish, the officer uploads a clear photo of the asphalt surface, enters the work completion memo, and marks the issue `RESOLVED`.

---

## 4. Issue Classification Taxonomy

Share2Fix standardizes civic reporting into seven explicit operational categories and four priority levels:

### Infrastructure Categories
* `ROAD_DAMAGE`: Potholes, road surface erosion, collapsed embankments, sinkholes, broken road dividers.
* `WASTE_MANAGEMENT`: Uncollected garbage heaps, illegal dumping sites, overflowing public bins, hazardous biological waste.
* `DRAINAGE`: Blocked roadside canals, flooded culverts, collapsed stormwater drains, mosquito-breeding stagnant reservoirs.
* `STREET_LIGHTING`: Defective bulbs, dangling electrical fixtures, unlit pedestrian crossings, broken poles.
* `WATER_LEAK`: Burst municipal supply lines, leaking valves, contaminated drinking water standpipes, overflowing cisterns.
* `PUBLIC_PROPERTY`: Damaged public benches, vandalized bus stop shelters, damaged children's playground equipment, broken regulatory road signs.
* `OTHER`: Unclassified civic defects requiring discretionary manual review.

### Priority Matrix
* `CRITICAL`: Immediate threat to life, limb, or catastrophic property loss (e.g., live severed power lines in water, deep sinkhole on a high-speed arterial roadway, collapsed bridge railing). SLA target: **< 4 hours**.
* `HIGH`: Severe public disruption, major health risk, or substantial traffic blockade (e.g., burst primary water main, heavily flooded intersection, large illegal garbage dump near school). SLA target: **< 24 hours**.
* `MEDIUM`: Ongoing public nuisance or moderate infrastructure impairment (e.g., standard potholes on residential lanes, defective streetlights, overflowing public bin). SLA target: **< 72 hours**.
* `LOW`: Aesthetic defects, minor wear-and-tear, or non-hazardous maintenance requests (e.g., faded road signage, cosmetic park bench crack). SLA target: **< 7 days**.

---

# PART II: TECHNICAL ARCHITECTURE & ENGINEERING SPECIFICATION

## 1. System Topology & Technology Stack

Share2Fix is engineered as a decoupled, multi-tier system leveraging serverless data infrastructure and an Express 5 API layer.

```
                                  [ Browser / Mobile Client ]
                                  Next.js 15 (App Router) + React 19
                                  Tailwind CSS v4 + Leaflet GIS
                                                |
                         HTTPS + Bearer Token   |   Multipart Form Uploads
                                                v
                                  [ Express 5 API Gateway ]
                                  Node.js 20/22 + TypeScript
                  +-----------------------------+-----------------------------+
                  |                             |                             |
                  v                             v                             v
       [ Security & Auth ]             [ Intelligence & ML ]          [ Storage Tier ]
       - Firebase Admin SDK            - Google Gemini 3.5 API        - Cloudflare R2
         (RS256 Token Verify)            (Multimodal @google/genai)     (S3-Compatible Object Store)
       - Helmet + CORS Whitelist       - Cryptographic Image Hasher   - Google Cloud Firestore
       - express-rate-limit            - Haversine Geo Routing          (NoSQL Database with
       - Magic-Byte Mime Sniffer       - Comment Sentiment Engine       Composite Indexes)
```

### Component Breakdown
| Layer | Core Technology | Architectural Purpose |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript | Server and client component rendering, responsive UI, accessible forms. |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | High-performance atomic CSS utilizing custom civic palettes. |
| **GIS & Geocoding** | Leaflet, OpenStreetMap, Nominatim API | Interactive mapping, GPS coordinate picking, reverse address resolution. |
| **API Gateway** | Express 5, Node.js, TypeScript | Request orchestration, security middleware, validation pipelines. |
| **Validation Engine** | Zod v3 | Strict runtime boundary schema validation for queries, params, and bodies. |
| **Identity & Access** | Firebase Authentication + Firestore RBAC | Email/password credential verification, server-enforced role resolution. |
| **Primary Database** | Google Cloud Firestore (via Firebase Admin) | Low-latency document store with atomic transactions and composite queries. |
| **Asset Storage** | Cloudflare R2 (AWS S3 Client) | S3-compatible, zero-egress fee object storage; server-mediated streaming. |
| **Multimodal AI** | Google Gemini (`@google/genai` SDK) | Image authenticity verification, automated categorization, priority scoring. |

---

## 2. Security Architecture & Threat Mitigation

Share2Fix implements zero-trust design across network, storage, authentication, and application layers:

### Dual-Layer Identity & Access Control
1. **Client Identity**: The frontend interacts with Firebase Authentication to obtain signed JSON Web Tokens (JWTs).
2. **Server Verification**: The backend validates the cryptographic signature of every incoming token using the Firebase Admin SDK (`verifyIdToken`).
3. **Database-Backed RBAC**: Roles (`CITIZEN`, `AUTHORITY_OFFICER`, `ADMIN`) are **never trusted from the token claims or client payloads**. Instead, the backend reads the caller's immutable profile document directly from Firestore on every sensitive invocation.
4. **Organizational Scope Isolation**: An `AUTHORITY_OFFICER` can only modify reports explicitly assigned to their specific `authorityId`. Attempting to update a ticket belonging to another jurisdiction triggers a `403 FORBIDDEN` error.

### Hardened Media Upload Pipeline
Allowing public file uploads is a primary vector for remote code execution, server exhaustion, and storage pollution. Share2Fix protects the upload lifecycle through multi-stage inspection:
* **Memory-Buffered Ingestion**: Multer holds incoming files in memory buffers (`storage: multer.memoryStorage()`) up to a strict **5 MB** ceiling.
* **MIME-Type & Extension Whitelisting**: Only `image/jpeg`, `image/png`, and `image/webp` are permitted.
* **Magic-Byte Binary Inspection**: File extensions and HTTP `Content-Type` headers can be spoofed. Share2Fix parses the initial bytes of each buffer to confirm legitimate file signatures:
  * **JPEG**: `FF D8 FF`
  * **PNG**: `89 50 4E 47 0D 0A 1A 0A`
  * **WebP**: `52 49 46 46` followed by `57 45 42 50` at offset 8.
  Files with spoofed headers are rejected immediately with a `400 BAD_REQUEST`.
* **Credential Isolation**: Images are uploaded from the server to Cloudflare R2 using short-lived S3 command executions. R2 secret credentials never touch the browser.

### Tiered Rate Limiting
Configured using `express-rate-limit` to defend against denial of service and API quota exhaustion:
* **Global Rate Limit**: 100 requests per 15 minutes per IP address.
* **Write Limiter**: 30 state-changing requests per 15 minutes for comments, upvotes, and verifications.
* **Strict Limiter**: 10 high-cost operations (new report submission, AI triage) per 15 minutes.

### Defense-in-Depth Firestore Rules
Firestore security rules enforce deny-by-default access. Direct client writes to the `reports`, `authorities`, or `report_timeline` collections are completely blocked. All data mutations must flow through the validated Express API gateway.

---

## 3. Intelligent Subsystems & Algorithms

### A. Multimodal AI Triage & Verification (`ai.service.ts`)
When a citizen submits a report, the backend transmits the issue description and primary photograph to Google Gemini using structured JSON schema constraints:

```typescript
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: [...CATEGORIES] },
    priority: { type: Type.STRING, enum: [...PRIORITIES] },
    summary: { type: Type.STRING, description: 'One concise sentence describing the issue.' },
    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    confidence: { type: Type.NUMBER },
    verification: {
      type: Type.OBJECT,
      properties: {
        isCivicIssue: { type: Type.BOOLEAN },
        matchesDescription: { type: Type.BOOLEAN },
        authenticityScore: { type: Type.NUMBER },
        flagged: { type: Type.BOOLEAN },
        flagReason: { type: Type.STRING }
      },
      required: ['isCivicIssue', 'matchesDescription', 'authenticityScore', 'flagged', 'flagReason']
    }
  },
  required: ['category', 'priority', 'summary', 'keywords', 'confidence', 'verification']
};
```

#### Verification Capabilities:
1. **Civic Authenticity Check (`isCivicIssue`)**: Differentiates authentic outdoor infrastructure defects from selfies, domestic interiors, pets, screenshots, and internet memes.
2. **Text-Image Cross-Correlation (`matchesDescription`)**: Verifies that the submitted photo corresponds directly to the problem described in the text (e.g., flags an incident where the text describes a collapsed bridge but the photo depicts a clean sidewalk).
3. **Prompt Injection Defense**: Citizen input is wrapped in isolated `<report>` XML delimiters and marked strictly as untrusted data to prevent prompt override attacks.
4. **Resilient Circuit Fallback**: If Gemini encounters rate limits or upstream service interruptions, the system captures the failure, flags `aiAnalysis.status = "UNAVAILABLE"`, and falls back to citizen-selected categories and standard priorities without dropping the ticket.

### B. Anti-Abuse & Behavioral Integrity Engine (`behavioral.service.ts`)
Every report undergoes algorithmic behavioral scrutiny before publication, producing a dynamic **Trust Score (0 to 100)**:

```
Trust Score = 100 - Penalties
Where Penalties = Duplicate Image Penalty (50)
                + Rapid Burst Submission Penalty (35)
                + Impossible Travel Velocity Penalty (35)
                + Non-Civic Image AI Penalty (40)
                + Description Mismatch AI Penalty (25)
                + High Hourly Volume Penalty (20)
                + Redundant Nearby Submission Penalty (20)
```

```
Risk Classification:
- Trust Score >= 75  =>  LOW RISK    (Normal queue processing)
- Trust Score 45-74  =>  MEDIUM RISK (Marked with warning badge for review)
- Trust Score < 45   =>  HIGH RISK   (Escalated directly to admin queue)
```

#### Integrity Checks:
1. **Cryptographic Image Deduplication**: Computes SHA-256 hashes of all uploaded image buffers and queries the `imageHashes` Firestore array index. Submitting a photo that already exists in the database triggers an immediate 50-point penalty.
2. **Submission Velocity Analysis**: Queries the reporter's history. Submitting $\ge 3$ reports within 5 minutes incurs a 35-point penalty; submitting $\ge 8$ reports within 1 hour incurs a 20-point penalty.
3. **Geo-Anomaly & Impossible Travel Speed**: Calculates distance $\Delta d$ (via Haversine formula) between the current report and the user's previous report. If the time delta $\Delta t < 3\text{ hours}$, the implied velocity is calculated:
   $$v = \frac{\Delta d}{\Delta t}$$
   If $\Delta d > 25\text{ km}$ and $v > 180\text{ km/h}$, an impossible travel flag is logged (-35 points).
4. **Micro-Distance Redundancy**: If a user submits another report within 25 meters of their previous submission within 2 hours, a redundancy penalty is applied (-20 points).

### C. Geographic Routing Engine (`routing.service.ts`)
To assign the responsible municipal council or utility branch, Share2Fix employs a geographic nearest-containment algorithm based on the Haversine great-circle distance:

$$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
*(where $R = 6371\text{ km}$, $\varphi$ is latitude, and $\lambda$ is longitude)*

#### Selection Priority:
1. Filters active authorities whose registered service categories include the report's category.
2. Filters authorities whose coverage radius ($r$) encompasses the coordinates: $d \le r$.
3. **Specificity Rule**: Sorts matching authorities by **ascending radius** ($r_1 < r_2$). A local Municipal Council with an 8 km radius takes precedence over a Provincial Secretariat with a 50 km radius.
4. Ties are broken by distance to the coverage center.
5. If no coverage zone matches, the ticket is safely routed to the **Unassigned Administrative Pool** for manual assignment.

### D. Community Sentiment & Dispute Analysis
When citizens comment on a report, Gemini runs an asynchronous consensus scan over the discussion thread:
* Evaluates whether comments allege that the issue is staged, already resolved, or placed at an incorrect location.
* Computes `disputeConfidence` and extracts concrete dispute reasons.
* Alerts municipal supervisors if public consensus contradicts an officer's `RESOLVED` status.

---

## 4. Report Lifecycle State Machine

Every report follows an explicit, transactionally recorded state machine:

```
                 +---------------+
                 |   SUBMITTED   |
                 +---------------+
                         |
                         v
                 +---------------+
                 | UNDER_REVIEW  |
                 +---------------+
                    /         \
                   /           \
                  v             v
          +------------+   +------------+
          |  ACCEPTED  |   |  REJECTED  |
          +------------+   +------------+
                |
                v
          +-------------+
          | IN_PROGRESS | <---------------+
          +-------------+                 |
                |                         |
                v                         | (Officer Reopens
          +-------------+                 |  after Citizen Dispute)
          |  RESOLVED   | ----------------+
          +-------------+
             |       |
             v       v
         [CONFIRMED] [DISPUTED]
         (Citizen Verification)
```

### State Definitions & Validation Rules:
* `SUBMITTED`: Created by a citizen. AI triage and behavioral analysis executed.
* `UNDER_REVIEW`: Officer has opened the ticket and is reviewing feasibility and jurisdiction.
* `ACCEPTED`: Authority acknowledges responsibility and queues the issue for field work.
* `IN_PROGRESS`: Field teams or contractors are on-site performing repairs.
* `RESOLVED`: **Strict Gate**: Requires at least one photographic resolution proof uploaded by the officer and a written explanation ($\ge 10$ characters).
* `REJECTED`: Requires a mandatory justification explaining why the request cannot be fulfilled (e.g., duplicate, private property, non-civic).

### Immutable Audit Trail (`report_timeline`)
State transitions execute inside Firestore database transactions. Every transition writes an unalterable log record:
* `previousStatus` and `newStatus`
* `updatedByUid`, `updatedByName`, and `updatedByRole`
* `explanation` memo
* URLs of attached resolution evidence photos
* ISO 8601 server timestamp

---

## 5. Database Schema & Data Dictionary

Share2Fix uses Google Cloud Firestore. Document structures and key collections are detailed below:

### Collection: `reports`
Primary collection for all civic infrastructure incidents.
```typescript
interface ReportDoc {
  id: string;                                // Auto-generated document ID
  title: string;                             // Incident title (5 - 120 chars)
  description: string;                       // Detailed incident description (10 - 2000 chars)
  category: Category;                        // ROAD_DAMAGE | WASTE_MANAGEMENT | DRAINAGE | etc.
  priority: Priority;                        // LOW | MEDIUM | HIGH | CRITICAL
  status: Status;                            // SUBMITTED | UNDER_REVIEW | ACCEPTED | IN_PROGRESS | RESOLVED | REJECTED
  categorySource: 'CITIZEN' | 'AI' | 'OFFICER';
  prioritySource: 'AI' | 'DEFAULT' | 'CITIZEN' | 'OFFICER';
  imageUrls: string[];                       // Cloudflare R2 public CDN URLs
  imageHashes: string[];                     // SHA-256 hashes of image buffers for deduplication
  location: {
    latitude: number;                        // WGS84 coordinate (-90 to +90)
    longitude: number;                       // WGS84 coordinate (-180 to +180)
    address: string;                         // Street address or reverse-geocoded description
    city?: string;                           // Administrative city or district
  };
  targetCompany?: string | null;             // Optional public utility (e.g. CEB, NWSDB)
  targetBranch?: string | null;              // Optional localized station or depot
  assignedAuthorityId: string | null;        // Foreign key to authorities collection
  assignedAuthorityName: string | null;
  routing: {
    method: 'COVERAGE_MATCH' | 'NONE' | 'MANUAL';
    suggested: boolean;
    note: string;
    isDemoData: boolean;
  };
  aiAnalysis: {
    status: 'OK' | 'UNAVAILABLE';
    category: Category | null;
    priority: Priority | null;
    summary: string;
    keywords: string[];
    confidence: number;
    model: string | null;
    imageVerification?: {
      isCivicIssue: boolean;
      matchesDescription: boolean;
      authenticityScore: number;
      flagged: boolean;
      flagReason: string;
    };
  };
  behavioralCheck?: {
    trustScore: number;                      // 0 to 100
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    flags: string[];
    passed: boolean;
  };
  supportCount: number;                      // Denormalized count of citizen upvotes
  commentCount: number;                      // Denormalized count of discussion comments
  flagCount: number;                         // Count of citizen abuse flags
  isFlagged: boolean;                        // True if flagCount >= threshold
  verification: {
    confirmed: number;                       // Count of positive resolution confirmations
    disputed: number;                        // Count of dispute flags
  };
  resolution: {
    explanation: string;
    evidenceUrls: string[];
    resolvedBy: string;
    resolvedAt: Timestamp;
  } | null;
  createdBy: string;                         // Reporter's Firebase UID (sanitized on public read)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt: Timestamp | null;
}
```

### Subcollection: `reports/{reportId}/timeline`
Immutable chronological audit entries for every state modification.

### Collection: `authorities`
Registry of administrative bodies, municipal councils, and statutory corporations.
```typescript
interface AuthorityDoc {
  id: string;
  name: string;                              // e.g. "Colombo Municipal Council"
  type: AuthorityType;                       // MUNICIPAL_COUNCIL | URBAN_COUNCIL | PRADESHIYA_SABHA | NATIONAL_AGENCY
  coverage: {
    centerLatitude: number;
    centerLongitude: number;
    radiusKm: number;                        // Radius of geographic responsibility
    description: string;
  };
  handlesCategories: Category[];             // Supported incident types (empty array = all)
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  officerCount: number;
  isActive: boolean;
  isDemoData: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `users`
Profiles for registered citizens, officers, and administrators.
```typescript
interface UserDoc {
  uid: string;                               // Firebase Auth UID
  fullName: string;
  email: string;
  phone: string;
  role: 'CITIZEN' | 'AUTHORITY_OFFICER' | 'ADMIN';
  authorityId: string | null;                // Non-null for AUTHORITY_OFFICER
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Composite Indexes (`firestore.indexes.json`)
To guarantee sub-second response times on filtered queries across hundreds of thousands of records, compound indexes are maintained for:
* `assignedAuthorityId` + `status` + `createdAt DESC`
* `assignedAuthorityId` + `category` + `createdAt DESC`
* `assignedAuthorityId` + `priority` + `createdAt DESC`
* `status` + `category` + `priority` + `createdAt DESC`
* `createdBy` + `createdAt DESC`

---

## 6. Complete REST API Specification

All API endpoints reside under `/api` and adhere to a strict envelope response contract:
* **Success Envelope**: `{ success: true, data: T, meta?: object }`
* **Error Envelope**: `{ success: false, error: { code: string, message: string, details?: unknown } }`

### Public & Shared Endpoints
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/stats/public` | None | Aggregated system metrics (total reports, resolution rates, category breakdowns). |
| `GET` | `/authorities` | None | Public directory of active authorities and coverage centers. |
| `GET` | `/reports` | Optional | Paginated public report feed with multi-parameter filtering (`category`, `status`, `city`, `cursor`). |
| `GET` | `/reports/map` | None | Lightweight geographic pin coordinates for map rendering. |
| `GET` | `/reports/:id` | Optional | Full details of an incident. Masks reporter UID if caller is unauthenticated. |
| `GET` | `/reports/:id/timeline` | None | Chronological audit history of a report. |
| `GET` | `/reports/:id/comments` | Optional | Public comment thread. |

### Citizen Operations
| Method | Route | Auth Guard | Description |
|---|---|---|---|
| `POST` | `/auth/profile` | Bearer Token | Initializes profile record upon first registration. Role forced to `CITIZEN`. |
| `GET` | `/users/me` | Authenticated | Retrieves current profile, permissions, and assigned authority details. |
| `PATCH` | `/users/me` | Authenticated | Updates current user's profile details. |
| `POST` | `/reports` | `CITIZEN` | Multipart form submission (up to 4 images). Runs AI triage, deduplication, and routing. |
| `GET` | `/reports/mine` | Authenticated | Returns tickets submitted by the authenticated user. |
| `POST` | `/reports/:id/support` | `CITIZEN` | Toggles upvote on an incident to elevate community priority. |
| `POST` | `/reports/:id/comments` | Authenticated | Adds a comment to the report; triggers AI sentiment & fake claim scan. |
| `POST` | `/reports/:id/flag` | `CITIZEN` | Flags a report for abuse, spam, wrong location, or staged media. |
| `POST` | `/reports/:id/verify` | `CITIZEN` | Casts a `CONFIRMED` or `DISPUTED` vote on a `RESOLVED` report with required explanation. |

### Authority Operations
| Method | Route | Auth Guard | Description |
|---|---|---|---|
| `GET` | `/reports/managed` | `AUTHORITY_OFFICER` / `ADMIN` | Fetches tickets assigned to the officer's specific authority. |
| `POST` | `/reports/:id/status` | `AUTHORITY_OFFICER` / `ADMIN` | Updates status (`UNDER_REVIEW`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`). Multipart upload required for resolution photos. |
| `POST` | `/reports/:id/progress` | `AUTHORITY_OFFICER` / `ADMIN` | Posts an operational timeline progress note with optional job-site photos. |
| `POST` | `/reports/:id/reassign` | `AUTHORITY_OFFICER` / `ADMIN` | Transfers ticket jurisdiction to another authority with written justification. |
| `GET` | `/stats/authority` | `AUTHORITY_OFFICER` / `ADMIN` | Workload analytics, mean resolution time, and citizen dispute counts for the authority. |

### Administrative Operations
| Method | Route | Auth Guard | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | `ADMIN` | Comprehensive platform-wide analytics and audit counts. |
| `GET` | `/admin/users` | `ADMIN` | Paginated listing of system users across all roles. |
| `POST` | `/admin/users` | `ADMIN` | Provisions officer and administrative accounts. |
| `PATCH` | `/admin/users/:id` | `ADMIN` | Activates/deactivates accounts, reassigns authority affiliations, or alters roles. |
| `GET` | `/admin/authorities` | `ADMIN` | Complete registry of authorities including inactive/demo configurations. |
| `POST` | `/admin/authorities` | `ADMIN` | Creates new authority entities with geographic radius and categories. |
| `PATCH` | `/admin/authorities/:id`| `ADMIN` | Updates boundary coordinates, contact channels, or service categories. |
| `POST` | `/reports/:id/dismiss-flags` | `ADMIN` | Clears citizen abuse flags after administrative review. |

---

## 7. Deployment, Environment Configuration & Operational Runbook

### Environment Configuration Matrix

#### Backend Configuration (`backend/.env`)
```bash
# Server Networking
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://share2fix.gov.lk

# Google Cloud & Firebase Service Account
FIREBASE_PROJECT_ID=share2fix-prod
GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=d94f284c...
R2_ACCESS_KEY_ID=9e7284...
R2_SECRET_ACCESS_KEY=c39174829...
R2_BUCKET=share2fix-media
R2_PUBLIC_BASE_URL=https://media.share2fix.gov.lk

# Google Gemini Intelligence
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.5-flash-lite
```

#### Frontend Configuration (`frontend/.env.local`)
```bash
# Gateway Connection
NEXT_PUBLIC_API_URL=https://api.share2fix.gov.lk/api

# Public Firebase Web Client Config (Public Identifiers)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=share2fix-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=share2fix-prod
NEXT_PUBLIC_FIREBASE_APP_ID=1:93847291:web:7c38...
```

### Initial Deployment & Initialization Commands
```powershell
# 1. Install root dependencies and workspaces
npm install

# 2. Deploy Firestore Security Rules and Composite Indexes
npm run firebase:deploy-rules

# 3. Compile and Typecheck Workspaces
npm run typecheck

# 4. Seed Administrative Authority Boundaries & Superuser
npm run seed -- --admin admin@share2fix.gov.lk

# 5. Production Build
npm run build
```

---

## 8. Architectural Integrity Summary

Share2Fix bridges the historical divide between community frustration and public sector accountability. By removing the obscurity of manual complaint queues and enforcing photographic proof across every stage of the lifecycle, the platform delivers a reliable, reproducible, and verifiable public service system. Its architecture ensures that community reports receive transparent, automated, and mathematically verified attention from the appropriate authorities.
