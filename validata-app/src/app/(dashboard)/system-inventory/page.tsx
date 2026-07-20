"use client";

import { useSession } from '../../../context/SessionContext';
import DataGrid from '../../components/ui/DataGrid';
import { ADMIN_ROLES, canAccessPage } from '../../../lib/permissions';

// ICH E6(R3) META-04: System inventory register.

// Illustrative register — student project. Validation statuses below describe
// vendor-published claims (e.g. Supabase's/Vercel's own SOC 2 marketing) or
// the honest current state of this codebase; none have been independently
// verified, and no IQ/OQ/PQ protocol has been executed. See DISCLAIMER.md.
const SYSTEM_COMPONENTS = [
  {
    name: 'Validata EDC Application',
    type: 'Custom Software',
    version: 'See git SHA in deployment',
    vendor: 'Internal Development',
    gampCategory: '5 — Custom Application',
    validationStatus: 'IQ/OQ/PQ not executed (student project)',
    notes: 'See DISCLAIMER.md — no formal validation protocol has been run against this codebase',
  },
  {
    name: 'Next.js Framework',
    type: 'Development Framework',
    version: '16.x',
    vendor: 'Vercel Inc.',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source framework; not independently validated by this project',
    notes: '',
  },
  {
    name: 'Supabase (PostgreSQL)',
    type: 'Database Platform',
    version: 'PostgreSQL 15',
    vendor: 'Supabase Inc.',
    gampCategory: '4 — Configurable Software',
    validationStatus: 'Vendor claims SOC 2 Type II (not independently verified); free tier has no PITR',
    notes: 'RLS policies documented in supabase_setup.sql',
  },
  {
    name: 'Vercel (Hosting)',
    type: 'Infrastructure',
    version: 'N/A (PaaS)',
    vendor: 'Vercel Inc.',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Vendor claims SOC 2 Type II (not independently verified); HTTPS enforced',
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
    version: '^3.25.76',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'All API input boundaries validated via Zod schemas in src/lib/schemas.ts',
  },
  {
    name: 'Recharts',
    type: 'Charting Library',
    version: '^3.8.1',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'Powers the Analysis dashboard charts (src/app/components/Analysis/charts/*)',
  },
  {
    name: 'jsPDF',
    type: 'PDF Generation Library',
    version: '^4.2.1',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'Used for exported report generation',
  },
  {
    name: 'html2canvas-pro',
    type: 'DOM-to-Image Library',
    version: '^2.0.4',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'Used alongside jsPDF for exported report generation',
  },
  {
    name: 'SWR',
    type: 'Data-Fetching Library',
    version: '^2.4.2',
    vendor: 'Open Source (MIT)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'Client-side data fetching/caching used across dashboard pages',
  },
  {
    name: 'xlsx (SheetJS)',
    type: 'Spreadsheet Import Library',
    version: '^0.18.5',
    vendor: 'Open Source (Apache 2.0)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'Parses XLSX/CSV measurement batch imports (src/hooks/useFileImport.ts)',
  },
  {
    name: 'lucide-react',
    type: 'Icon Library',
    version: '^1.17.0',
    vendor: 'Open Source (ISC)',
    gampCategory: '3 — Non-configured Software',
    validationStatus: 'Open-source library; not independently validated by this project',
    notes: 'UI iconography throughout the app',
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
  const { userRole, userStatus } = useSession();

  if (!canAccessPage(userRole, userStatus, ADMIN_ROLES)) {
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
          ADMINISTRATION / System Inventory
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          System Inventory Register
        </h1>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          All system components used in Validata EDC, GAMP categories, and validation status.
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
          Illustrative register — student project; statuses not independently verified (see DISCLAIMER).
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
