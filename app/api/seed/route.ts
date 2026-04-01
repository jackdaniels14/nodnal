import { NextResponse } from 'next/server';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import db from '@/lib/firestore';

// ─── Property Account Field Definitions ─────────────────────────────────────

const PROPERTY_TYPE_ID = 'rtype-property-account';

const FIELDS = [
  { id: 'f-state', name: 'State', type: 'select' as const, options: ['Prospect', 'Active', 'Inactive', 'Lost'], required: true },
  { id: 'f-number', name: 'Account Number', type: 'text' as const, required: true },
  { id: 'f-customer', name: 'Customer', type: 'text' as const, required: true },
  { id: 'f-mgmt', name: 'Management Company', type: 'text' as const },
  { id: 'f-city', name: 'City', type: 'text' as const },
  { id: 'f-units', name: 'Unit Count', type: 'number' as const },
  { id: 'f-rep', name: 'Rep', type: 'text' as const },
  { id: 'f-address', name: 'Physical Address', type: 'text' as const },
  { id: 'f-billing', name: 'Billing Method', type: 'select' as const, options: ['Email', 'Mail', 'Portal'] },
  { id: 'f-term', name: 'Term', type: 'text' as const },
  { id: 'f-exempt-fees', name: 'Exempt from Processing Fees', type: 'boolean' as const },
  { id: 'f-master', name: 'Master Account', type: 'boolean' as const },
  { id: 'f-cash', name: 'Cash Account', type: 'boolean' as const },
  { id: 'f-send-change-notice', name: 'Send Change Order Notice', type: 'boolean' as const },
  { id: 'f-require-po', name: 'Require Purchase Order', type: 'boolean' as const },
  { id: 'f-group-line', name: 'Group Line Items On Invoice', type: 'boolean' as const },
  { id: 'f-trip-charge', name: 'Mandatory Trip Charge', type: 'boolean' as const },
  { id: 'f-am-installs', name: 'Always AM Installs', type: 'boolean' as const },
  { id: 'f-rep-review', name: 'Require Rep Review On New Order', type: 'boolean' as const },
  { id: 'f-installer-notes', name: 'Installer Notes', type: 'richtext' as const },
  { id: 'f-internal-notes', name: 'Internal Notes', type: 'richtext' as const },
  { id: 'f-pricing-date', name: 'Pricing Presented On', type: 'date' as const },
  { id: 'f-include-summary', name: 'Include Order Summary', type: 'boolean' as const },
  { id: 'f-sep-extra-prep', name: 'Separate Extra Prep', type: 'boolean' as const },
];

// ─── Seed Properties ────────────────────────────────────────────────────────

const SEED_DATA = [
  { state: 'Prospect', number: 'MFA 000001', customer: '100 On 6th', mgmt: 'Allied Residential', city: 'Seattle', units: 45 },
  { state: 'Prospect', number: 'MFA 004004', customer: '101 Broadway', mgmt: 'Blanton Turner', city: 'Seattle', units: 44 },
  { state: 'Prospect', number: 'MFA 002960', customer: '1020', mgmt: 'Metropolitan Management', city: 'Seattle', units: 45 },
  { state: 'Prospect', number: 'MFA 001083', customer: '10549 Stone Ave N', mgmt: '', city: 'Seattle', units: 1 },
  { state: 'Prospect', number: 'FMA 008022', customer: '10550 Midvale Ave N Unit #3', mgmt: 'Cascade Properties', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 003944', customer: '1111 East Olive', mgmt: 'Indigo Property Management', city: 'Seattle', units: 80 },
  { state: 'Prospect', number: 'MFA 004597', customer: '1120 Dexter', mgmt: 'Owner managed', city: 'Seattle', units: 89 },
  { state: 'Prospect', number: 'MFA 003229', customer: '116 Apartments', mgmt: 'TRF', city: 'Seattle', units: 12 },
  { state: 'Prospect', number: 'MFA 003585', customer: '127 Rainier', mgmt: '', city: 'Seattle', units: 10 },
  { state: 'Prospect', number: 'MFA 004614', customer: '12th Ave 4plex', mgmt: 'Walsh Property Management', city: 'Seattle', units: 4 },
  { state: 'Prospect', number: 'FMA 000517', customer: '12th Ave Arts', mgmt: 'Community Roots Housing', city: 'Seattle', units: 88 },
  { state: 'Prospect', number: 'MFA 001066', customer: '1308 Apartments', mgmt: 'TRF', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 004276', customer: '1356 Alki', mgmt: 'Bradford Way Properties', city: 'Seattle', units: 10 },
  { state: 'Prospect', number: 'MFA 000488', customer: '135th Apartments', mgmt: 'NW Development Trust', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 001951', customer: '13th Ave Fourplex', mgmt: 'Walsh Property Management', city: 'Seattle', units: 4 },
  { state: 'Prospect', number: 'MFA 003993', customer: '1404 Boylston', mgmt: 'Redside Partners', city: 'Seattle', units: 107 },
  { state: 'Prospect', number: 'MFA 000558', customer: '1415 1st Ave Ne Apartments', mgmt: 'Cornell & Associates', city: 'Seattle', units: 16 },
  { state: 'Prospect', number: 'MFA 001064', customer: '1417 Apartments', mgmt: 'TRF', city: 'Seattle', units: 18 },
  { state: 'Prospect', number: 'MFA 004482', customer: '1421 2nd Ave Ne', mgmt: 'Owner managed', city: 'Seattle', units: 12 },
  { state: 'Prospect', number: 'MFA 004762', customer: '1440 Nw 52nd St', mgmt: 'Walsh Property Management', city: 'Seattle', units: 23 },
  { state: 'Prospect', number: 'MFA 001941', customer: '14th Ave', mgmt: 'Metropolitan Management', city: 'Seattle', units: 6 },
  { state: 'Prospect', number: 'MFA 003405', customer: '15015', mgmt: '', city: 'Seattle', units: 42 },
  { state: 'Prospect', number: 'MFA 004738', customer: '1515 Belmont Ave', mgmt: 'Stratford Company', city: 'Seattle', units: 39 },
  { state: 'Prospect', number: 'MFA 002136', customer: '1531 Apartments', mgmt: 'Westlake Associates', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 001084', customer: '1545 Apartments', mgmt: 'TRF', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 000247', customer: '15544 Property', mgmt: 'Pacific Ridge Real Estate', city: 'Seattle', units: 3 },
  { state: 'Prospect', number: 'MFA 000118', customer: '1611 On Lake Union', mgmt: 'Greystar', city: 'Seattle', units: 55 },
  { state: 'Prospect', number: 'MFA 004682', customer: '1613 Summit Ave', mgmt: 'Peak Living Property Services', city: 'Seattle', units: 15 },
  { state: 'Prospect', number: 'MFA 006754', customer: '1634 Sw 114', mgmt: 'Owner managed', city: 'Seattle', units: 4 },
  { state: 'Prospect', number: 'MFA 004633', customer: '1700 Madison', mgmt: 'Owner managed', city: 'Seattle', units: 80 },
  { state: 'Prospect', number: 'MFA 001429', customer: '1771 Nw 59th St', mgmt: 'Dave Poletti and Associates', city: 'Seattle', units: 5 },
  { state: 'Prospect', number: 'MFA 000590', customer: '17th Ave Apartments', mgmt: 'Redside Partners', city: 'Seattle', units: 7 },
  { state: 'Prospect', number: 'MFA 002074', customer: '1800 Eastlake Ave', mgmt: 'Cornell & Associates', city: 'Seattle', units: 30 },
  { state: 'Prospect', number: 'MFA 005384', customer: '1807 1st Ave, Seattle, Wa 98101', mgmt: 'InCity', city: 'Seattle', units: 72 },
  { state: 'Prospect', number: 'MFA 001911', customer: '18th Avenue Apartments', mgmt: 'Community Roots Housing', city: 'Seattle', units: 9 },
  { state: 'Prospect', number: 'MFA 001892', customer: '1909 Apartments', mgmt: 'TRF', city: 'Seattle', units: 0 },
  { state: 'Prospect', number: 'MFA 003589', customer: '19th & Mercer', mgmt: '11Residential', city: 'Seattle', units: 54 },
  { state: 'Prospect', number: 'MFA 002647', customer: '2020 Jackson Housing', mgmt: '', city: 'Seattle', units: 71 },
  { state: 'Prospect', number: 'MFA 002627', customer: '2028 Apartments', mgmt: 'TRF', city: 'Seattle', units: 8 },
  { state: 'Prospect', number: 'MFA 002384', customer: '2034', mgmt: 'Pacific Crest', city: 'Seattle', units: 10 },
  { state: 'Prospect', number: 'MFA 007189', customer: '206 Bell', mgmt: 'Weidner Investment Services', city: 'Seattle', units: 123 },
  { state: 'Prospect', number: 'MFA 001033', customer: '207 N 104th', mgmt: 'TARGA', city: 'Seattle', units: 9 },
  { state: 'Prospect', number: 'MFA 002032', customer: '210 Apartments', mgmt: 'West Sea Group', city: 'Seattle', units: 9 },
  { state: 'Prospect', number: 'MFA 007179', customer: '2222 Gilman Drive', mgmt: 'Yateswood', city: 'Seattle', units: 15 },
  { state: 'Prospect', number: 'MFA 003145', customer: '2237 62nd', mgmt: 'Walsh Property Management', city: 'Seattle', units: 5 },
  { state: 'Prospect', number: 'MFA 004473', customer: '2451 Nw 59th St', mgmt: 'Walsh Property Management', city: 'Seattle', units: 5 },
  { state: 'Prospect', number: 'MFA 002404', customer: '2770 Alki Ave Sw', mgmt: 'Alki Properties', city: 'Seattle', units: 32 },
  { state: 'Prospect', number: 'FMA 002185', customer: '2900 On 1st', mgmt: 'Cushman & Wakefield', city: 'Seattle', units: 135 },
  { state: 'Prospect', number: 'MFA 007563', customer: '3021 Ne 140th St', mgmt: 'Cascade Properties', city: 'Seattle', units: 8 },
  { state: 'Prospect', number: 'FMA 001049', customer: '3030 Lake City', mgmt: '11Residential', city: 'Seattle', units: 113 },
];

export async function POST() {
  try {
    // 1. Create the Property Account record type
    const typeRef = doc(collection(db, 'record-types'), PROPERTY_TYPE_ID);
    await setDoc(typeRef, {
      name: 'Property Account',
      icon: '🏢',
      color: 'bg-emerald-500',
      fields: FIELDS,
      createdAt: new Date().toISOString(),
    });

    // 2. Batch-write all seed records
    const now = new Date().toISOString();
    let batchCount = 0;
    let batch = writeBatch(db);

    for (let i = 0; i < SEED_DATA.length; i++) {
      const s = SEED_DATA[i];
      const recId = `rec-seed-${i.toString().padStart(4, '0')}`;
      const recRef = doc(collection(db, 'records'), recId);

      batch.set(recRef, {
        typeId: PROPERTY_TYPE_ID,
        data: {
          'f-state': s.state,
          'f-number': s.number,
          'f-customer': s.customer,
          'f-mgmt': s.mgmt,
          'f-city': s.city,
          'f-units': s.units,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: 'seed',
      });

      batchCount++;
      if (batchCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      typeId: PROPERTY_TYPE_ID,
      recordCount: SEED_DATA.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
