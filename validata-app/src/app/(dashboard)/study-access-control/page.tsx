"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { UserMinus, Plus, RefreshCw } from 'lucide-react';

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];

const STUDY_ROLES = [
  'investigator',
  'site_coordinator',
  'data_manager',
  'monitor',
  'auditor',
  'irb_reviewer',
  'team_member',
];

interface Member {
  user_id: string;
  study_id: string;
  study_role: string;
  granted_at: string;
  profiles?: { email: string; role: string };
  email?: string;
}

interface ProfileItem {
  id: string;
  email: string;
  role: string;
  status: string;
}

const colHeaderStyle: React.CSSProperties = {
  padding: '0 10px 6px',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-col-header)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
};

const cellStyle: React.CSSProperties = {
  padding: '0 10px',
  height: '32px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

export default function StudyAccessControlPage() {
  const { userRole, isDemoMode } = useSession();
  const { studies } = useStudy();

  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addStudyRole, setAddStudyRole] = useState(STUDY_ROLES[0]);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Select first study by default
  useEffect(() => {
    if (studies.length > 0 && !selectedStudyId) {
      setSelectedStudyId(studies[0].id);
    }
  }, [studies, selectedStudyId]);

  const fetchMembers = useCallback(async (studyId: string) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/admin/study-members?studyId=${studyId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        setMembers([]);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setAllProfiles((data as ProfileItem[]).filter((p) => p.status === 'active'));
      }
    } catch {
      setAllProfiles([]);
    }
  }, []);

  useEffect(() => {
    if (selectedStudyId) {
      fetchMembers(selectedStudyId);
    }
  }, [selectedStudyId, fetchMembers]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddMember = async () => {
    if (!selectedStudyId || !addUserId) return;
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/study-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId: selectedStudyId, userId: addUserId, studyRole: addStudyRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? 'Failed to add member.');
      } else {
        setShowAddPanel(false);
        setAddUserId('');
        setAddStudyRole(STUDY_ROLES[0]);
        fetchMembers(selectedStudyId);
      }
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedStudyId) return;
    if (!window.confirm('Remove this member from the study?')) return;
    try {
      await fetch('/api/admin/study-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId: selectedStudyId, userId }),
      });
      fetchMembers(selectedStudyId);
    } catch {
      // ignore
    }
  };

  if (!ADMIN_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to study access control.
      </div>
    );
  }

  const selectedStudy = studies.find((s) => s.id === selectedStudyId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Study Access Control
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Study Access Control
        </h1>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Grant or revoke per-study access for research staff. ICH E6(R3) AUTH-05.
        </div>
      </div>

      {isDemoMode && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--status-warning)' }}>
          Demo mode — changes are not persisted.
        </div>
      )}

      {/* Two-pane layout */}
      <div style={{ display: 'flex', border: '1px solid var(--border)', minHeight: '400px' }}>
        {/* Left pane: study list */}
        <div style={{
          width: '200px',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            Studies
          </div>
          {studies.map((study) => (
            <div
              key={study.id}
              onClick={() => setSelectedStudyId(study.id)}
              style={{
                padding: '7px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                background: study.id === selectedStudyId ? 'var(--bg-selection)' : 'transparent',
                borderLeft: study.id === selectedStudyId ? '2px solid var(--accent-soft)' : '2px solid transparent',
                color: study.id === selectedStudyId ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {study.name}
            </div>
          ))}
          {studies.length === 0 && (
            <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>No studies found.</div>
          )}
        </div>

        {/* Right pane: members table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedStudy ? (
            <>
              {/* Pane header */}
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface)',
              }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudy.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => selectedStudyId && fetchMembers(selectedStudyId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                  <button
                    onClick={() => setShowAddPanel((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                  >
                    <Plus size={11} /> Add Member
                  </button>
                </div>
              </div>

              {/* Add member inline panel */}
              {showAddPanel && (
                <div style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-surface-alt)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>User</label>
                    <select
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 6px', fontFamily: 'var(--font-ui)' }}
                    >
                      <option value="">— Select user —</option>
                      {allProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.email} ({p.role})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Study Role</label>
                    <select
                      value={addStudyRole}
                      onChange={(e) => setAddStudyRole(e.target.value)}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 6px', fontFamily: 'var(--font-ui)' }}
                    >
                      {STUDY_ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={!addUserId || addLoading}
                    style={{ padding: '5px 12px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '12px', cursor: !addUserId || addLoading ? 'not-allowed' : 'pointer', opacity: !addUserId || addLoading ? 0.6 : 1 }}
                  >
                    {addLoading ? 'Adding…' : 'Add'}
                  </button>
                  {addError && (
                    <div style={{ fontSize: '11px', color: 'var(--status-dropped)' }}>{addError}</div>
                  )}
                </div>
              )}

              {/* Members table */}
              <div style={{ overflowY: 'auto' }}>
                {loadingMembers ? (
                  <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>
                ) : members.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    No members assigned to this study yet. Click "Add Member" to grant access.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={colHeaderStyle}>Email</th>
                        <th style={colHeaderStyle}>Study Role</th>
                        <th style={colHeaderStyle}>Granted At</th>
                        <th style={{ ...colHeaderStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m, i) => {
                        const email = m.profiles?.email ?? m.email ?? m.user_id;
                        return (
                          <tr
                            key={m.user_id}
                            style={{
                              background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <td style={cellStyle}>
                              <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px' }}>{email}</span>
                            </td>
                            <td style={{ ...cellStyle, fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {m.study_role.replace(/_/g, ' ')}
                            </td>
                            <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--text-timestamp)' }}>
                              {new Date(m.granted_at).toLocaleDateString()}
                            </td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                title="Remove from study"
                                style={{ background: 'transparent', border: 'none', color: 'var(--status-dropped)', cursor: 'pointer', padding: '3px', display: 'inline-flex' }}
                              >
                                <UserMinus size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '32px' }}>
              Select a study from the left panel.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
