"use client";

import { useState } from 'react';
import DataGrid from '../ui/DataGrid';
import StatusDot from '../ui/StatusDot';
import InlinePanel from '../ui/InlinePanel';

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
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  padding: '5px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

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
}: ParticipantsDisplayProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const goalPercent = recruitmentGoal
    ? Math.min(100, Math.round((recruitedCount / recruitmentGoal) * 100))
    : 0;

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
    { key: 'healthStatus', label: 'Health Status', width: '120px', render: (row: any) => row.healthStatus || row.health_status || '—' },
    {
      key: 'enrollmentDateDisplay',
      label: 'Enrolled',
      width: '100px',
    },
    {
      key: '_actions',
      label: 'Actions',
      width: '200px',
      render: (row: any) => {
        const s = String(row.status || '').toLowerCase();
        if (s === 'dropped') return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Dropped</span>;
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCompleted(row.id); }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                background: s === 'completed' ? 'var(--status-active)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s === 'completed' ? 'Unmark' : 'Mark Complete'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDrop(row.id); }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
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
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            PARTICIPANTS & DATA / Participant Registry
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Participant Registry
          </h1>
        </div>
        <button
          onClick={() => setIsPanelOpen(true)}
          style={{
            padding: '5px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Participant
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '12px',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Total: <strong style={{ color: 'var(--text-primary)' }}>{participants.length}</strong>
        </span>
        {recruitmentGoal && (
          <>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Recruited: <strong style={{ color: 'var(--text-primary)' }}>{recruitedCount}</strong> / {recruitmentGoal}
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
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{goalPercent}%</span>
          </>
        )}

        {isMentor && (
          <form onSubmit={onGoalSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
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
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Set Goal
            </button>
          </form>
        )}
      </div>

      {/* DataGrid */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DataGrid
          columns={columns}
          rows={participants}
          keyField="id"
          selectedKeys={selectedKeys}
          onSelectChange={setSelectedKeys}
          emptyMessage="No participants found."
        />
      </div>

      {/* Add Participant InlinePanel */}
      <InlinePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} title="Add Participant">
        <form onSubmit={(e) => { onSubmit(e); setIsPanelOpen(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '8px',
              fontSize: '11px',
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
              fontSize: '10px',
              color: 'var(--status-pending)',
              lineHeight: 1.5,
            }}
          >
            <strong>ICH E6(R3) CONSENT-01:</strong> After enrolling, create a formal consent record in the Compliance section.
          </div>

          <button
            type="submit"
            style={{
              padding: '7px 0',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add Participant
          </button>
        </form>
      </InlinePanel>
    </div>
  );
};

export default ParticipantsDisplay;
