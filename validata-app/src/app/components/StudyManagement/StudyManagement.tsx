"use client";

import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Trash2, CheckCircle2, Target, Users, ArrowRight } from 'lucide-react';
import HoverTooltip from '../common/HoverTooltip';
import LockControlPanel from './LockControlPanel';
import RetentionPanel from './RetentionPanel';
import { useStudy } from '../../../context/StudyContext';
import { useSession } from '../../../context/SessionContext';
import { useTabs } from '../../../context/TabContext';
import { updateStudyGoalAction } from '../../../app/actions/studies';


interface Member {
  user_id: string;
  study_id: string;
  study_role: string;
  granted_at: string;
  profiles?: { email: string; role: string };
  email?: string;
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

const colHeaderStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-col-header)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
};

const cellStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
};

const StudyManagement = () => {
  const { studies, currentStudyId, addStudy, deleteStudy, switchStudy } = useStudy();
  const { isDemoMode } = useSession();
  const { openTab } = useTabs();

  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyGoal, setNewStudyGoal] = useState('');

  // Inline Goal Editing state
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Auto-select study
  useEffect(() => {
    if (studies.length > 0 && !selectedStudyId) {
      setSelectedStudyId(currentStudyId ?? studies[0].id);
    }
  }, [studies, selectedStudyId, currentStudyId]);

  const fetchStudyDetails = useCallback(async (studyId: string) => {
    setLoadingDetails(true);
    try {
      if (isDemoMode) {
        // Mock members
        const mockMembers: Member[] = [
          { user_id: '1', study_id: studyId, study_role: 'admin', granted_at: new Date().toISOString(), profiles: { email: 'admin@demo.com', role: 'admin' } },
          { user_id: '2', study_id: studyId, study_role: 'mentor', granted_at: new Date().toISOString(), profiles: { email: 'mentor@demo.com', role: 'mentor' } },
          { user_id: '3', study_id: studyId, study_role: 'investigator', granted_at: new Date().toISOString(), profiles: { email: 'investigator@demo.com', role: 'investigator' } },
        ];
        setMembers(mockMembers);
        setParticipantsCount(5);
      } else {
        const [membersRes, participantsRes] = await Promise.all([
          fetch(`/api/admin/study-members?studyId=${studyId}`),
          fetch(`/api/participants?study_id=${studyId}`),
        ]);

        if (membersRes.ok) {
          setMembers(await membersRes.json());
        } else {
          setMembers([]);
        }

        if (participantsRes.ok) {
          const participantsData = await participantsRes.json();
          setParticipantsCount(participantsData.length);
        } else {
          setParticipantsCount(0);
        }
      }
    } catch (e) {
      console.error('Error fetching details:', e);
    } finally {
      setLoadingDetails(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (selectedStudyId) {
      fetchStudyDetails(selectedStudyId);
    }
  }, [selectedStudyId, fetchStudyDetails]);

  const handleCreateStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyName.trim()) return;
    addStudy(newStudyName.trim(), newStudyGoal);
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
      deleteStudy(id);
      setSelectedStudyId(null);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudyId) return;
    const goalVal = parseInt(goalInput);
    if (isNaN(goalVal) || goalVal < 1) {
      alert('Goal must be a positive integer.');
      return;
    }

    try {
      if (isDemoMode) {
        // Mock update in memory studies
        studies.forEach(s => {
          if (s.id === selectedStudyId) s.recruitment_goal = goalVal;
        });
      } else {
        await updateStudyGoalAction({ id: selectedStudyId, recruitmentGoal: goalVal });
        // Update local array element
        studies.forEach(s => {
          if (s.id === selectedStudyId) s.recruitment_goal = goalVal;
        });
      }
      setEditingGoal(false);
    } catch (err: any) {
      alert('Failed to update goal: ' + err.message);
    }
  };

  const selectedStudy = studies.find((s) => s.id === selectedStudyId);
  const isSelectedActiveWorkspace = selectedStudyId === currentStudyId;

  // Recruitment Goal percentage calculations
  const goalValue = selectedStudy?.recruitment_goal ?? 50;
  const progressPercent = Math.min(100, Math.round((participantsCount / goalValue) * 100)) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Study Management
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Studies Hub & Management
        </h1>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Consolidated study workspace. Manage recruitment goals, track researcher rosters, and configure active research workspace study context.
        </div>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px', alignItems: 'start' }}>
        
        {/* Left column: Study list navigation & Create Study form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Create Study Form */}
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

          {/* All Studies List navigation panel */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Studies List
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

            {studies.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                No studies yet. Create one to get started.
              </div>
            ) : (
              studies.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStudyId(s.id);
                    setEditingGoal(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '0 12px',
                    height: '42px',
                    background: s.id === selectedStudyId
                      ? 'var(--bg-selection)'
                      : (i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)'),
                    borderLeft: s.id === selectedStudyId ? '3px solid var(--accent-soft)' : '3px solid transparent',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FlaskConical size={14} style={{ color: s.id === selectedStudyId ? 'var(--accent-soft)' : 'var(--text-ghost)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: s.id === selectedStudyId ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-data)' }}>
                      {s.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {s.id === currentStudyId && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '8px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--status-active)',
                        padding: '1px 4px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        borderRadius: '2px',
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Selected Study Dashboard & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedStudy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Selected Study Header Card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlaskConical size={20} style={{ color: 'var(--accent-soft)' }} />
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-data)', margin: 0 }}>
                      {selectedStudy.name}
                    </h2>
                    {isSelectedActiveWorkspace ? (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--status-active)',
                        padding: '2px 8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--status-active)',
                        borderRadius: '3px',
                        marginLeft: '8px',
                      }}>
                        Active Workspace
                      </span>
                    ) : (
                      <button
                        onClick={() => switchStudy(selectedStudy.id)}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          background: 'var(--bg-surface-alt)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Activate Workspace <ArrowRight size={10} />
                      </button>
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
                      onClick={() => handleDeleteStudy(selectedStudy.id)}
                      disabled={studies.length <= 1}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: studies.length <= 1 ? 'var(--text-ghost)' : 'var(--status-dropped)',
                        cursor: studies.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: studies.length <= 1 ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={12} /> Delete Study
                    </button>
                  </HoverTooltip>
                </div>
              </div>

              {/* Study Stats & Progress Overview */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={12} style={{ color: 'var(--text-muted)' }} />
                  Recruitment Metrics & Performance
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  
                  {/* Left Column: Enrolled participants */}
                  <div style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Enrolled Participants
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-data)' }}>
                      {loadingDetails ? '...' : participantsCount}
                    </div>
                  </div>

                  {/* Right Column: Recruitment Goal */}
                  <div style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Target Goal</span>
                      {!editingGoal && (
                        <button
                          onClick={() => {
                            setGoalInput(String(goalValue));
                            setEditingGoal(true);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-soft)', cursor: 'pointer', fontSize: '9px', fontWeight: 700 }}
                        >
                          Edit Goal
                        </button>
                      )}
                    </div>
                    {editingGoal ? (
                      <form onSubmit={handleUpdateGoal} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="number"
                          min="1"
                          required
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          style={{ ...inputStyle, width: '80px', height: '24px', padding: '2px 6px' }}
                        />
                        <button
                          type="submit"
                          style={{ padding: '2px 8px', fontSize: '10px', border: 'none', borderRadius: 'var(--radius)', background: 'var(--status-active)', color: '#fff', cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoal(false)}
                          style={{ padding: '2px 8px', fontSize: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-data)' }}>
                        {goalValue}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Recruitment Progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{progressPercent}% reached</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-alt)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, var(--accent-soft) 0%, var(--status-active) 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Staff Access Registry (ICH E6(R3) AUTH-05) — read-only here.
                  fable_system_review §3.1: membership was editable in two
                  places (here and User Registry), two code paths hitting the
                  same API with two local caches that could disagree, and a
                  mentor confirming a new investigator's role in User Registry
                  had no way to know they needed to switch screens to also
                  assign them to a study. User Registry is now the single
                  owner of add/remove; this panel just shows current roster
                  with a link to go manage it. */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                    <Users size={12} style={{ color: 'var(--text-muted)' }} />
                    Authorized Research Staff
                  </div>
                  <button
                    onClick={() => openTab('/user-management', 'User Registry')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      background: 'var(--bg-surface-alt)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-secondary)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Manage in User Registry <ArrowRight size={10} />
                  </button>
                </div>

                {/* Roster table (read-only) */}
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {loadingDetails ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>Loading roster...</div>
                  ) : members.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      No staff members assigned yet. Use &quot;Manage in User Registry&quot; to authorize a researcher.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={colHeaderStyle}>Email</th>
                          <th style={colHeaderStyle}>System Role</th>
                          <th style={colHeaderStyle}>Granted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => {
                          const email = m.profiles?.email ?? m.email ?? m.user_id;
                          const roleName = m.profiles?.role ?? m.study_role;
                          return (
                            <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={cellStyle}>
                                <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px' }}>{email}</span>
                              </td>
                              <td style={{ ...cellStyle, textTransform: 'capitalize', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {roleName.replace(/_/g, ' ')}
                              </td>
                              <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', color: 'var(--text-timestamp)', fontSize: '11px' }}>
                                {new Date(m.granted_at).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <LockControlPanel />
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', borderRadius: 'var(--radius)' }}>
              Select a study from the left panel to display recruitment metrics and manage access credentials.
            </div>
          )}
        </div>
      </div>

      {/* Deleted studies — retention & destruction-request workflow (RET-02, RET-03) */}
      <RetentionPanel />
    </div>
  );
};

export default StudyManagement;
