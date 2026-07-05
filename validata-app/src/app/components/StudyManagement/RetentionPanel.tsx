"use client";

// fable_system_review §3.3/§3.2: extracted out of the StudyManagement god
// component (it was one of several distinct responsibilities crammed into
// one 851-line file) and converted to SWR in the same pass.
import { useState } from 'react';
import useSWR from 'swr';
import { ShieldAlert } from 'lucide-react';

interface DeletedStudy {
  id: string;
  name: string;
  deleted_at: string;
  retention_hold: boolean;
  created_at: string;
}

async function fetchDeletedStudies(): Promise<DeletedStudy[]> {
  const res = await fetch('/api/studies?deleted=true');
  if (!res.ok) return [];
  return res.json();
}

export default function RetentionPanel() {
  const { data: deletedStudies = [] } = useSWR('deleted-studies', fetchDeletedStudies);
  const [destructionMessage, setDestructionMessage] = useState<Record<string, string>>({});

  if (deletedStudies.length === 0) return null;

  const handleRequestDestruction = async (studyId: string) => {
    const reason = window.prompt('Reason for destruction request (ICH E6(R3) RET-02):');
    if (!reason) return;
    try {
      const res = await fetch('/api/admin/destruction-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId, reason }),
      });
      const data = await res.json();
      setDestructionMessage((prev) => ({ ...prev, [studyId]: data.error ?? data.message ?? 'Request submitted.' }));
    } catch (e: any) {
      setDestructionMessage((prev) => ({ ...prev, [studyId]: e.message }));
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
      }}>
        <ShieldAlert size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
          Deleted Studies — Retention
        </span>
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', padding: '8px 12px' }}>
        Soft-deleted studies are retained for a minimum of 15 years before physical destruction can be requested.
      </div>
      {deletedStudies.map((s, i) => (
        <div key={s.id} style={{
          padding: '8px 12px',
          background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: 'var(--font-size-md)', fontFamily: 'var(--font-data)' }}>
              {s.name} {s.retention_hold && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-warning)' }}>(retention hold)</span>}
            </span>
            <button
              onClick={() => handleRequestDestruction(s.id)}
              style={{ fontSize: 'var(--font-size-xs)', padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--status-dropped)', cursor: 'pointer' }}
            >
              Request Destruction
            </button>
          </div>
          {destructionMessage[s.id] && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{destructionMessage[s.id]}</div>
          )}
        </div>
      ))}
    </div>
  );
}
