"use client";

import { useSession } from '../../../context/SessionContext';
import DataGrid from '../../components/ui/DataGrid';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

// ICH E6(R3) META-04: System inventory register.

const SYSTEM_COMPONENTS = [
  {
    name: 'Validata EDC Application',
    type: 'Custom Software',
    version: 'See git SHA in deployment',
    vendor: 'Internal Development',
    gampCategory: '5 — Custom Application',
    validationStatus: 'IQ complete; OQ in progress',
    notes: 'See docs/validation_master_plan.md for current test protocol status',
  },
  {
    name: 'Next.js Framework',
    type: 'Development Framework',
    version: '16.x',
    vendor: 'Vercel Inc.',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Vendor-qualified (part of EDC system validation)',
    notes: '',
  },
  {
    name: 'Supabase (PostgreSQL)',
    type: 'Database Platform',
    version: 'PostgreSQL 15',
    vendor: 'Supabase Inc.',
    gampCategory: '4 — Configurable Software',
    validationStatus: 'Vendor SOC 2 Type II certified; PITR enabled',
    notes: 'RLS policies documented in supabase_setup.sql',
  },
  {
    name: 'Vercel (Hosting)',
    type: 'Infrastructure',
    version: 'N/A (PaaS)',
    vendor: 'Vercel Inc.',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Vendor SOC 2 Type II certified; HTTPS enforced',
    notes: 'Demo mode is opt-in and off by default: requires NEXT_PUBLIC_DEMO_ENABLED=true and DEMO_SESSION_SECRET, both absent in production',
  },
  {
    name: 'Supabase Auth',
    type: 'Authentication Service',
    version: 'Bundled with Supabase platform',
    vendor: 'Supabase Inc.',
    gampCategory: '4 — Configurable Software',
    validationStatus: 'Vendor-managed; email/password with JWT sessions',
    notes: 'Demo mode bypass requires an explicit opt-in env var and a signed, HttpOnly session cookie minted server-side',
  },
  {
    name: 'Zod Schema Validation',
    type: 'Input Validation Library',
    version: 'v3.x',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Vendor-tested; validated as part of EDC OQ',
    notes: 'All API input boundaries validated via Zod schemas in src/lib/schemas.ts',
  },
] as const;

// Add an id field for DataGrid keyField
const rows = SYSTEM_COMPONENTS.map((c, i) => ({ ...c, id: String(i) }));

const columns = [
  { key: 'name', label: 'Component', width: '200px', render: (c: any) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span> },
  { key: 'type', label: 'Type', width: '140px' },
  { key: 'version', label: 'Version', width: '160px', render: (c: any) => <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>{c.version}</span> },
  { key: 'vendor', label: 'Vendor', width: '140px' },
  { key: 'gampCategory', label: 'GAMP Cat.', width: '180px' },
  { key: 'validationStatus', label: 'Validation Status' },
  { key: 'notes', label: 'Notes', render: (c: any) => <span style={{ color: 'var(--text-muted)' }}>{c.notes || '—'}</span> },
];

export default function SystemInventoryPage() {
  const { userRole } = useSession();

  if (!hasRole(userRole, ADMIN_ROLES)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to the system inventory register.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          SYSTEM / System Inventory
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          System Inventory Register
        </h1>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          All system components used in Validata EDC, GAMP categories, and validation status.
        </div>
      </div>

      <DataGrid
        columns={columns}
        rows={rows}
        keyField="id"
        emptyMessage="No components listed."
      />

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
        Last reviewed: 2026-07-03. Next review due: per change control or annual CSV review cycle.
      </div>
    </div>
  );
}
