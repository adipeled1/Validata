"use client";

import { useState } from 'react';
import { FlaskConical, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import HoverTooltip from '../common/HoverTooltip';

interface StudyManagementProps {
  studies: any[];
  currentStudyId: string | null;
  onAddStudy: (name: string, goal: string) => void;
  onDeleteStudy: (id: string) => void;
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
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

const StudyManagement = ({ studies, currentStudyId, onAddStudy, onDeleteStudy }: StudyManagementProps) => {
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyGoal, setNewStudyGoal] = useState('');

  const handleCreateStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyName.trim()) return;
    onAddStudy(newStudyName.trim(), newStudyGoal);
    setNewStudyName('');
    setNewStudyGoal('');
  };

  const handleDeleteStudy = (id: string) => {
    const study = studies.find((s) => s.id === id);
    if (!study) return;

    if (studies.length <= 1) {
      window.alert('Cannot delete the only study. Create another study first, then delete this one.');
      return;
    }

    if (window.confirm(`Delete study "${study.name}"? This permanently deletes all of its participants and measurements. This cannot be undone.`)) {
      onDeleteStudy(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Study Management
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Studies Management
        </h1>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Create or permanently remove studies. Each study&apos;s participants, measurements, and recruitment goal are fully isolated.
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '12px', alignItems: 'start' }}>
        {/* Create form */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
            Create New Study
          </div>
          <form onSubmit={handleCreateStudy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label htmlFor="new-study-name" style={labelStyle}>Study Name</label>
              <input
                id="new-study-name"
                type="text"
                required
                placeholder="e.g. braude_research_3"
                value={newStudyName}
                onChange={(e) => setNewStudyName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="new-study-goal" style={labelStyle}>Recruitment Goal (optional)</label>
              <input
                id="new-study-goal"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={newStudyGoal}
                onChange={(e) => setNewStudyGoal(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 0',
                background: 'var(--status-active)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Create Study
            </button>
          </form>
        </div>

        {/* Studies list */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
              All Studies
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 8px',
              background: 'var(--bg-surface-alt)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}>
              Total: {studies.length}
            </span>
          </div>

          {studies.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              No studies yet. Create one to get started.
            </div>
          )}

          {studies.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '0 12px',
                height: '40px',
                background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FlaskConical size={14} style={{ color: 'var(--text-ghost)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-data)' }}>
                  {s.name}
                </span>
                {s.id === currentStudyId && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--status-active)',
                    flexShrink: 0,
                  }}>
                    <CheckCircle2 size={10} /> Active
                  </span>
                )}
                {s.recruitment_goal && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    Goal: {s.recruitment_goal}
                  </span>
                )}
              </div>

              <HoverTooltip
                text={
                  studies.length <= 1
                    ? 'Cannot delete the only study. Create another study first.'
                    : 'Permanently delete this study and all its data. Cannot be undone.'
                }
              >
                <button
                  data-testid={`delete-study-${s.id}`}
                  onClick={() => handleDeleteStudy(s.id)}
                  disabled={studies.length <= 1}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: studies.length <= 1 ? 'var(--text-ghost)' : 'var(--status-dropped)',
                    cursor: studies.length <= 1 ? 'not-allowed' : 'pointer',
                    padding: '3px',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </HoverTooltip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudyManagement;
