/**
 * Seeds DEMONSTRATION data and manages bootstrap admins.
 *
 *   npm run seed                              -> upserts demo authorities
 *   npm run seed -- --admin you@example.com   -> promotes an already-registered user to ADMIN
 *   npm run seed -- --demo-users              -> creates demo officer/admin/citizen accounts
 *                                                (requires SEED_DEMO_PASSWORD in the environment)
 */
import { adminAuth } from '../src/config/firebase';
import { authoritiesRepo } from '../src/repositories/authorities.repository';
import { usersRepo } from '../src/repositories/users.repository';
import type { AuthorityDoc, Category, Role } from '../src/types';

type Seed = Omit<AuthorityDoc, 'createdAt' | 'updatedAt' | 'authorityId' | 'officerIds' | 'isDemoData' | 'isActive'> & { id: string };

const ALL: Category[] = [];

// DEMONSTRATION DATA ONLY: coverage circles are approximations and do NOT represent official jurisdictions.
const DEMO_AUTHORITIES: Seed[] = [
  {
    id: 'demo-colombo-mc',
    name: 'Colombo Municipal Council (Demo)',
    type: 'MUNICIPAL_COUNCIL',
    coverage: { centerLatitude: 6.9271, centerLongitude: 79.8612, radiusKm: 9, description: 'Demo coverage: central Colombo' },
    handlesCategories: ALL,
    contact: { email: 'demo-colombo@share2fix.example', phone: '', address: 'Colombo (demonstration data)' },
  },
  {
    id: 'demo-kandy-mc',
    name: 'Kandy Municipal Council (Demo)',
    type: 'MUNICIPAL_COUNCIL',
    coverage: { centerLatitude: 7.2906, centerLongitude: 80.6337, radiusKm: 7, description: 'Demo coverage: Kandy city' },
    handlesCategories: ALL,
    contact: { email: 'demo-kandy@share2fix.example', phone: '', address: 'Kandy (demonstration data)' },
  },
  {
    id: 'demo-galle-mc',
    name: 'Galle Municipal Council (Demo)',
    type: 'MUNICIPAL_COUNCIL',
    coverage: { centerLatitude: 6.0329, centerLongitude: 80.217, radiusKm: 7, description: 'Demo coverage: Galle city' },
    handlesCategories: ALL,
    contact: { email: 'demo-galle@share2fix.example', phone: '', address: 'Galle (demonstration data)' },
  },
  {
    id: 'demo-jaffna-mc',
    name: 'Jaffna Municipal Council (Demo)',
    type: 'MUNICIPAL_COUNCIL',
    coverage: { centerLatitude: 9.6615, centerLongitude: 80.0255, radiusKm: 7, description: 'Demo coverage: Jaffna city' },
    handlesCategories: ALL,
    contact: { email: 'demo-jaffna@share2fix.example', phone: '', address: 'Jaffna (demonstration data)' },
  },
  {
    id: 'demo-national-roads',
    name: 'National Roads Agency (Demo)',
    type: 'NATIONAL_AGENCY',
    coverage: { centerLatitude: 7.8731, centerLongitude: 80.7718, radiusKm: 260, description: 'Demo coverage: island-wide, road issues only' },
    handlesCategories: ['ROAD_DAMAGE'],
    contact: { email: 'demo-roads@share2fix.example', phone: '', address: 'Island-wide (demonstration data)' },
  },
  {
    id: 'demo-district-fallback',
    name: 'District Secretariat - General Fallback (Demo)',
    type: 'DISTRICT_SECRETARIAT',
    coverage: { centerLatitude: 7.8731, centerLongitude: 80.7718, radiusKm: 300, description: 'Demo fallback: island-wide, all categories' },
    handlesCategories: ALL,
    contact: { email: 'demo-district@share2fix.example', phone: '', address: 'Island-wide (demonstration data)' },
  },
];

async function seedAuthorities() {
  for (const { id, ...a } of DEMO_AUTHORITIES) {
    const existing = await authoritiesRepo.get(id);
    await authoritiesRepo.upsert(id, { ...a, officerIds: existing?.officerIds ?? [], isActive: true, isDemoData: true });
    console.log(`  authority ${existing ? 'updated' : 'created'}: ${a.name}`);
  }
}

async function ensureUser(email: string, fullName: string, role: Role, authorityId: string | null, password: string) {
  let uid: string;
  try {
    uid = (await adminAuth.getUserByEmail(email)).uid;
  } catch {
    uid = (await adminAuth.createUser({ email, password, displayName: fullName })).uid;
  }
  const existing = await usersRepo.get(uid);
  if (existing) {
    await usersRepo.update(uid, { role, authorityId, fullName, isActive: true });
  } else {
    await usersRepo.create({ uid, email, fullName, role, authorityId, phone: '', profileImage: '', isActive: true });
  }
  if (authorityId) await authoritiesRepo.addOfficer(authorityId, uid);
  console.log(`  user ready: ${email} (${role})`);
}

async function promoteAdmin(email: string) {
  const rec = await adminAuth.getUserByEmail(email).catch(() => null);
  if (!rec) throw new Error(`No Firebase Auth user with email ${email}. Register in the app first, then re-run.`);
  const existing = await usersRepo.get(rec.uid);
  if (existing) await usersRepo.update(rec.uid, { role: 'ADMIN', authorityId: null, isActive: true });
  else
    await usersRepo.create({
      uid: rec.uid,
      email: email.toLowerCase(),
      fullName: rec.displayName ?? email.split('@')[0]!,
      role: 'ADMIN',
      authorityId: null,
      phone: '',
      profileImage: '',
      isActive: true,
    });
  console.log(`  ${email} is now an ADMIN`);
}

async function main() {
  const args = process.argv.slice(2);
  const adminIdx = args.indexOf('--admin');

  if (adminIdx !== -1) {
    const email = args[adminIdx + 1];
    if (!email) throw new Error('Usage: npm run seed -- --admin you@example.com');
    await promoteAdmin(email);
    return;
  }

  console.log('Seeding demo authorities (demonstration data)...');
  await seedAuthorities();

  if (args.includes('--demo-users')) {
    const password = process.env.SEED_DEMO_PASSWORD;
    if (!password || password.length < 8) throw new Error('Set SEED_DEMO_PASSWORD (min 8 chars) to create demo users.');
    console.log('Creating demo users...');
    await ensureUser('admin@share2fix.demo', 'Demo Admin', 'ADMIN', null, password);
    await ensureUser('officer.colombo@share2fix.demo', 'Demo Officer (Colombo)', 'AUTHORITY_OFFICER', 'demo-colombo-mc', password);
    await ensureUser('officer.kandy@share2fix.demo', 'Demo Officer (Kandy)', 'AUTHORITY_OFFICER', 'demo-kandy-mc', password);
    await ensureUser('citizen@share2fix.demo', 'Demo Citizen', 'CITIZEN', null, password);
  }
  console.log('Done.');
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
