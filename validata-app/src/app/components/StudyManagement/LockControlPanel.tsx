"use client";

// Lock state is a property of a study, so it's surfaced right on that
// study's own header - as a plain-language sentence, not a colored badge,
// so it can't be mistaken for the "Active Workspace" badge next to it
// (workspace selection and data-entry lock are unrelated axes of state).
// Actually locking/unlocking happens in StudyLockModal, which this links
// out to - keeping the compliance action and its audit trail in one place
// instead of duplicating the control here.
import { useState, useEffect, useCallback } from 'react';
import type { LockableStudy } from './StudyLockModal';
import { useSession } from '../../../context/SessionContext';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import mockData from '../../../mockData.json';

export default function LockControlPanel({ studyId, onManage }: { studyId: string; onManage: () => void }) {
  const { isDemoMode } = useSession();
  const [study, setStudy] = useState<LockableStudy | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode) {
      const base = (mockData.studies as LockableStudy[]).find((s) => s.id === studyId);
      if (!base) { setStudy(null); return; }
      const override = clientDemoStore.getStudyLockOverride(studyId);
      setStudy(override ? { ...base, ...override } : base);
      return;
    }
    try {
      const res = await fetch('/api/studies');
      const data = await res.json();
      if (data.error) return;
      const match = Array.isArray(data) ? data.find((s: LockableStudy) => s.id === studyId) : null;
      setStudy(match ?? null);
    } catch {
      // Leave study null - the sentence below just won't render.
    }
  }, [studyId, isDemoMode]);

  useEffect(() => {
    load();
  }, [load]);

  if (!study) return null;

  const isLocked = study.lock_state === 'locked';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
        <span style={{
          display: 'inline-flex', width: '16px', height: '16px', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          color: isLocked ? 'var(--color-error)' : 'var(--status-active)',
        }}>
          {isLocked ? '🔒' : '🔓'}
        </span>
        {isLocked ? (
          <span>
            Data entry is locked — {study.lock_reason ?? 'no reason given'}
            {study.locked_by ? <> (by {study.locked_by})</> : null}
          </span>
        ) : (
          <span>Data entry is open for this study.</span>
        )}
      </div>

      <button
        onClick={onManage}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', fontSize: 'var(--font-size-sm)',
        }}
      >
        Manage data lock →
      </button>
    </div>
  );
}
