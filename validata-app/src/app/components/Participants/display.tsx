"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import DataGrid from '../ui/DataGrid';
import StatusDot from '../ui/StatusDot';
import InlinePanel from '../ui/InlinePanel';
import ConsentForm, { type ConsentFormValues } from '../Consent/ConsentForm';
import type { CreateConsentRecordInput } from '../Consent/service';

interface ConsentVersionEntry { id: number; version: string; }
interface ConsentRecordEntry { id: string; participant_id: string; form_version_id: number; method: string; copy_delivered: boolean; witnessed_by: string | null; notes: string | null; created_at: string; }

const EMPTY_CONSENT_FORM = (participantId: string): ConsentFormValues => ({
  participantId,
  formVersionId: '',
  method: 'written',
  witnessedBy: '',
  copyDelivered: false,
  notes: '',
});

interface ParticipantsDisplayProps {
  participants: any[];
  age: string;
  onAgeChange: (v: string) => void;
  gender: string;
  onGenderChange: (v: string) => void;
  healthStatus: string;
  onHealthStatusChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDrop: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  recruitedCount: number;
  recruitmentGoal: number | null;
  isMentor: boolean;
  goalInput: string;
  onGoalInputChange: (v: string) => void;
  onGoalSubmit: (e: React.FormEvent) => void;
  consentVersions: ConsentVersionEntry[];
  consentRecords: ConsentRecordEntry[];
  canRecordConsent: boolean;
  onRecordConsent: (input: Omit<CreateConsentRecordInput, 'studyId' | 'isDemoMode' | 'currentUserEmail'>) => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-md)',
  padding: '5px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

function exportCSV(rows: any[]) {
  const headers = ['ID', 'Status', 'Age', 'Gender', 'Health Status', 'Enrolled'];
  const data = rows.map((p) => [
    p.id,
    p.status ?? '',
    p.age ?? '',
    p.gender ?? '',
    p.healthStatus || p.health_status || '',
    p.enrollmentDateDisplay || p.enrollmentDate || p.enrollment_date || '',
  ]);
  const csv = [headers, ...data].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `participants_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows: any[], filename: string) {
  const data = rows.map((p) => ({
    ID: p.id,
    Status: p.status ?? '',
    Age: p.age ?? '',
    Gender: p.gender ?? '',
    'Health Status': p.healthStatus || p.health_status || '',
    Enrolled: p.enrollmentDateDisplay || p.enrollmentDate || p.enrollment_date || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participants');
  XLSX.writeFile(wb, filename);
}

function ContextMenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '5px 12px',
        textAlign: 'left',
        background: hovered ? 'var(--bg-surface-hover)' : 'transparent',
        border: 'none',
        color: danger ? 'var(--status-dropped)' : 'var(--text-primary)',
        fontSize: 'var(--font-size-md)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function ContextMenu({
  row,
  x,
  y,
  onClose,
  onToggleCompleted,
  onDrop,
}: {
  row: any;
  x: number;
  y: number;
  onClose: () => void;
  onToggleCompleted: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [ready, setReady] = useState(false);
  const status = String(row.status || '').toLowerCase();
  const isDropped = status === 'dropped';
  const isCompleted = status === 'completed';

  // Measure after render, nudge inside viewport, then reveal — prevents flicker
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x,
      y: y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y,
    });
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click or Escape
  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if ('key' in e) {
        if ((e as KeyboardEvent).key === 'Escape') onClose();
        return;
      }
      if (menuRef.current && !menuRef.current.contains((e as MouseEvent).target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => { fn(); onClose(); };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        zIndex: 9999,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        minWidth: '180px',
        padding: '4px 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--font-size-md)',
        visibility: ready ? 'visible' : 'hidden',
      }}
    >
      <div
        style={{
          padding: '4px 12px 6px',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-data)',
          letterSpacing: '0.05em',
        }}
      >
        {row.id}
      </div>
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 4px' }} />

      <ContextMenuItem
        label="Copy ID"
        onClick={act(() => {
          navigator.clipboard.writeText(String(row.id)).catch(() => {});
        })}
      />
      <ContextMenuItem label="Export Row as CSV" onClick={act(() => exportCSV([row]))} />

      {!isDropped && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <ContextMenuItem
            label={isCompleted ? 'Unmark Completed' : 'Mark Complete'}
            onClick={act(() => onToggleCompleted(row.id))}
          />
          <ContextMenuItem
            label="Drop Participant"
            danger
            onClick={act(() => onDrop(row.id))}
          />
        </>
      )}
    </div>
  );
}

const ParticipantsDisplay = ({
  participants,
  age,
  onAgeChange,
  gender,
  onGenderChange,
  healthStatus,
  onHealthStatusChange,
  onSubmit,
  onDrop,
  onToggleCompleted,
  recruitedCount,
  recruitmentGoal,
  isMentor,
  goalInput,
  onGoalInputChange,
  onGoalSubmit,
  consentVersions,
  consentRecords,
  canRecordConsent,
  onRecordConsent,
}: ParticipantsDisplayProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [contextMenu, setContextMenu] = useState<{ row: any; x: number; y: number } | null>(null);

  // Consent panel - opened per-row via "Record Consent"; button stays
  // available after a first record so a participant can have multiple
  // consents (re-consent on protocol amendment, etc).
  const [consentParticipantId, setConsentParticipantId] = useState<string | null>(null);
  const [consentForm, setConsentForm] = useState<ConsentFormValues>(EMPTY_CONSENT_FORM(''));
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const latestConsentByParticipant = useMemo(() => {
    const map = new Map<string, ConsentRecordEntry>();
    for (const r of consentRecords) {
      const existing = map.get(r.participant_id);
      if (!existing || new Date(r.created_at).getTime() > new Date(existing.created_at).getTime()) {
        map.set(r.participant_id, r);
      }
    }
    return map;
  }, [consentRecords]);

  const openConsentPanel = (participantId: string) => {
    setConsentParticipantId(participantId);
    setConsentForm(EMPTY_CONSENT_FORM(participantId));
    setConsentError(null);
  };

  const handleConsentSubmit = async () => {
    if (!consentParticipantId || !consentForm.formVersionId) return;
    setConsentSaving(true);
    setConsentError(null);
    try {
      await onRecordConsent({
        participantId: consentParticipantId,
        formVersionId: consentForm.formVersionId,
        method: consentForm.method,
        copyDelivered: consentForm.copyDelivered,
        witnessedBy: consentForm.witnessedBy || undefined,
        notes: consentForm.notes || undefined,
      });
      setConsentParticipantId(null);
    } catch (e) {
      setConsentError((e as Error).message);
    } finally {
      setConsentSaving(false);
    }
  };

  const goalPercent = recruitmentGoal
    ? Math.min(100, Math.round((recruitedCount / recruitmentGoal) * 100))
    : 0;

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (search && !String(p.id).toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && (p.status ?? 'active').toLowerCase() !== filterStatus) return false;
      if (filterGender !== 'all' && (p.gender ?? '').toLowerCase() !== filterGender) return false;
      return true;
    });
  }, [participants, search, filterStatus, filterGender]);

  const selectedRows = useMemo(
    () => participants.filter((p) => selectedKeys.has(String(p.id))),
    [participants, selectedKeys],
  );

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      render: (row: any) => (
        <span style={{ color: 'var(--text-id)', fontFamily: 'var(--font-data)' }}>{row.id}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row: any) => <StatusDot status={row.status ?? 'active'} />,
    },
    { key: 'age', label: 'Age', width: '60px' },
    { key: 'gender', label: 'Gender', width: '80px' },
    {
      key: 'healthStatus',
      label: 'Health Status',
      width: '120px',
      render: (row: any) => row.healthStatus || row.health_status || '—',
    },
    {
      key: 'enrollmentDateDisplay',
      label: 'Enrolled',
      width: '100px',
    },
    {
      key: '_consent',
      label: 'Consent',
      width: '90px',
      render: (row: any) => {
        const latest = latestConsentByParticipant.get(String(row.id));
        if (!latest) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <span
            title={`${latest.method} · ${latest.created_at ? new Date(latest.created_at).toUTCString() : ''}`}
            style={{ color: 'var(--status-active)' }}
          >
            ✓ on file
          </span>
        );
      },
    },
    {
      key: '_actions',
      label: 'Actions',
      width: canRecordConsent ? '300px' : '200px',
      render: (row: any) => {
        const s = String(row.status || '').toLowerCase();
        const hasConsent = latestConsentByParticipant.has(String(row.id));
        if (s === 'dropped')
          return <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Dropped</span>;
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompleted(row.id);
              }}
              style={{
                padding: '2px 0',
                fontSize: 'var(--font-size-sm)',
                background: s === 'completed' ? 'var(--status-active)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: '100px',
                textAlign: 'center',
              }}
            >
              {s === 'completed' ? 'Unmark' : 'Mark Complete'}
            </button>
            {canRecordConsent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openConsentPanel(String(row.id));
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: 'var(--font-size-sm)',
                  background: hasConsent ? 'transparent' : 'var(--accent-soft)',
                  color: hasConsent ? 'var(--text-secondary)' : '#fff',
                  border: hasConsent ? '1px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Record Consent
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDrop(row.id);
              }}
              style={{
                padding: '2px 8px',
                fontSize: 'var(--font-size-sm)',
                background: 'transparent',
                color: 'var(--status-dropped)',
                border: '1px solid var(--status-dropped)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              Drop
            </button>
          </div>
        );
      },
    },
  ];

  const bulkBtnStyle: React.CSSProperties = {
    padding: '3px 10px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const filterSelectStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-size-md)',
    padding: '4px 6px',
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    outline: 'none',
    height: '28px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            PARTICIPANTS & DATA / Participant Registry
          </div>
          <h1
            style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}
          >
            Participant Registry
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() =>
              exportExcel(
                filteredParticipants,
                `participants_${new Date().toISOString().substring(0, 10)}.xlsx`,
              )
            }
            style={{
              padding: '5px 12px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export Excel
          </button>
          <button
            onClick={() => setIsPanelOpen(true)}
            style={{
              padding: '5px 12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Participant
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '10px',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
          Total: <strong style={{ color: 'var(--text-primary)' }}>{participants.length}</strong>
        </span>
        {recruitmentGoal && (
          <>
            <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
              Recruited:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{recruitedCount}</strong> /{' '}
              {recruitmentGoal}
            </span>
            <div
              style={{
                flex: 1,
                maxWidth: '200px',
                height: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${goalPercent}%`,
                  height: '100%',
                  background: 'var(--accent-soft)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{goalPercent}%</span>
          </>
        )}

        {isMentor && (
          <form
            onSubmit={onGoalSubmit}
            style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}
          >
            <input
              type="number"
              min="1"
              placeholder={recruitmentGoal ? String(recruitmentGoal) : 'Set goal'}
              value={goalInput}
              onChange={(e) => onGoalInputChange(e.target.value)}
              style={{ ...inputStyle, width: '80px' }}
            />
            <button
              type="submit"
              style={{
                padding: '4px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              Set Goal
            </button>
          </form>
        )}
      </div>

      {/* Search & filter row */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search by ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...filterSelectStyle, width: '180px', fontFamily: 'var(--font-data)' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
        </select>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {(search || filterStatus !== 'all' || filterGender !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterGender('all'); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {filteredParticipants.length !== participants.length
            ? `${filteredParticipants.length} of ${participants.length}`
            : null}
        </span>
      </div>

      {/* Bulk action toolbar */}
      {selectedKeys.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            marginBottom: '6px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedKeys.size}</strong> selected
          </span>
          <button
            onClick={() => exportCSV(selectedRows)}
            style={bulkBtnStyle}
          >
            Export CSV
          </button>
          <button
            onClick={() =>
              exportExcel(selectedRows, `participants_selected_${new Date().toISOString().substring(0, 10)}.xlsx`)
            }
            style={bulkBtnStyle}
          >
            Export Excel
          </button>
          <button
            onClick={() => setSelectedKeys(new Set())}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* DataGrid */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DataGrid
          columns={columns}
          rows={filteredParticipants}
          keyField="id"
          selectedKeys={selectedKeys}
          onSelectChange={setSelectedKeys}
          onRowClick={(row) => { setSelectedParticipant(row); setIsPanelOpen(false); }}
          onRowContextMenu={(row, e) => setContextMenu({ row, x: e.clientX, y: e.clientY })}
          emptyMessage={
            search || filterStatus !== 'all' || filterGender !== 'all'
              ? 'No participants match the current filters.'
              : 'No participants found.'
          }
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          row={contextMenu.row}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onToggleCompleted={onToggleCompleted}
          onDrop={onDrop}
        />
      )}

      {/* Participant Detail InlinePanel */}
      <InlinePanel isOpen={!!selectedParticipant && !isPanelOpen} onClose={() => setSelectedParticipant(null)} title="Participant Detail">
        {selectedParticipant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'var(--font-size-md)' }}>
            {[
              { label: 'ID', value: selectedParticipant.id },
              { label: 'Status', value: selectedParticipant.status ?? 'active' },
              { label: 'Age', value: selectedParticipant.age ?? '—' },
              { label: 'Gender', value: selectedParticipant.gender ?? '—' },
              { label: 'Health Status', value: selectedParticipant.healthStatus || selectedParticipant.health_status || '—' },
              { label: 'Enrolled', value: selectedParticipant.enrollmentDateDisplay || selectedParticipant.enrollmentDate || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {label}
                </div>
                <div style={{ color: 'var(--text-primary)', fontFamily: label === 'ID' || label === 'Enrolled' ? 'var(--font-data)' : 'var(--font-ui)' }}>
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </InlinePanel>

      {/* Add Participant InlinePanel */}
      <InlinePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} title="Add Participant">
        <form
          onSubmit={(e) => {
            onSubmit(e);
            setIsPanelOpen(false);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '8px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            The system will generate a unique, anonymous ID for the new participant.
          </div>

          <div>
            <label htmlFor="panel-age" style={labelStyle}>Age</label>
            <input
              id="panel-age"
              type="number"
              required
              min="18"
              max="120"
              placeholder="e.g. 35"
              value={age}
              onChange={(e) => onAgeChange(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="panel-gender" style={labelStyle}>Gender</label>
            <select
              id="panel-gender"
              required
              value={gender}
              onChange={(e) => onGenderChange(e.target.value)}
              style={inputStyle}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="panel-health-status" style={labelStyle}>Health Status</label>
            <select
              id="panel-health-status"
              required
              value={healthStatus}
              onChange={(e) => onHealthStatusChange(e.target.value)}
              style={inputStyle}
            >
              <option value="Healthy">Healthy</option>
              <option value="Ankle Injured">Ankle Injured</option>
            </select>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--status-pending)',
              borderRadius: 'var(--radius)',
              padding: '8px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--status-pending)',
              lineHeight: 1.5,
            }}
          >
            After enrolling, create a formal consent record in the Compliance section.
          </div>

          <button
            type="submit"
            style={{
              padding: '7px 0',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add Participant
          </button>
        </form>
      </InlinePanel>

      {/* Record Consent InlinePanel - same shared ConsentForm the Consent
          Records screen uses (see Consent/ConsentForm.tsx), locked to the
          row's participant. */}
      <InlinePanel isOpen={!!consentParticipantId} onClose={() => setConsentParticipantId(null)} title="Record Consent">
        {consentParticipantId && (
          <ConsentForm
            versions={consentVersions}
            participants={[]}
            lockedParticipantId={consentParticipantId}
            form={consentForm}
            onChange={(field, value) => setConsentForm((p) => ({ ...p, [field]: value } as ConsentFormValues))}
            onSubmit={handleConsentSubmit}
            onCancel={() => setConsentParticipantId(null)}
            saving={consentSaving}
            error={consentError}
          />
        )}
      </InlinePanel>
    </div>
  );
};

export default ParticipantsDisplay;
