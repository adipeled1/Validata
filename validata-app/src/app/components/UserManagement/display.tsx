import React, { useState } from 'react';
import { UserCheck, Shield, Trash2, ShieldAlert, AlertCircle, RefreshCw, UserMinus, Clock, X, Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  candidate_expires_at?: string;
}

interface Study {
  id: string;
  name: string;
}

interface UserManagementDisplayProps {
  users: User[];
  isLoading: boolean;
  error: string;
  currentUserEmail: string;
  viewerRole: string;
  studies: Study[];
  membershipsByUser: Record<string, string[]>;
  onRoleChange: (userId: string, newRole: string) => void;
  onStatusChange: (userId: string, newStatus: string) => void;
  onDelete: (userId: string) => void;
  onRefresh: () => void;
  onAddStudyMember: (userId: string, studyId: string) => void;
  onRemoveStudyMember: (userId: string, studyId: string) => void;
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
  fontFamily: 'var(--font-ui)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

const STATUS_COLOR: Record<string, string> = {
  candidate: 'var(--status-warning)',
  active: 'var(--status-active)',
  pending: 'var(--status-pending)',
  suspended: 'var(--status-dropped)',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  fontSize: '10px',
  padding: '1px 5px',
  background: 'var(--bg-surface-alt)',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

// Studies a non-mentor/admin user belongs to, shown as removable chips with a
// "+ Add" popover checklist — lets a mentor staff someone for a study without
// ever leaving User Registry (Study Access Control still exists separately,
// for the study-centric "who's on this study" view).
function StudiesCell({
  userId,
  allStudies,
  memberStudyIds,
  onAdd,
  onRemove,
}: {
  userId: string;
  allStudies: Study[];
  memberStudyIds: string[];
  onAdd: (userId: string, studyId: string) => void;
  onRemove: (userId: string, studyId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const memberSet = new Set(memberStudyIds);
  const memberStudies = allStudies.filter((s) => memberSet.has(s.id));

  return (
    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      {memberStudies.map((s) => (
        <span key={s.id} style={chipStyle}>
          {s.name}
          <button
            onClick={() => onRemove(userId, s.id)}
            title={`Remove from ${s.name}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Add to a study"
        style={{ ...chipStyle, cursor: 'pointer', color: 'var(--accent-soft)' }}
      >
        <Plus size={9} /> Add
      </button>
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 10,
              minWidth: '200px', maxHeight: '220px', overflowY: 'auto',
              background: 'var(--bg-editor)', border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)', padding: '6px',
            }}
          >
            {allStudies.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}>No studies found.</div>
            ) : (
              allStudies.map((s) => {
                const checked = memberSet.has(s.id);
                return (
                  <label
                    key={s.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '3px 4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => (checked ? onRemove(userId, s.id) : onAdd(userId, s.id))}
                    />
                    {s.name}
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

const UserManagementDisplay = ({
  users,
  isLoading,
  error,
  currentUserEmail,
  viewerRole,
  studies,
  membershipsByUser,
  onRoleChange,
  onStatusChange,
  onDelete,
  onRefresh,
  onAddStudyMember,
  onRemoveStudyMember,
}: UserManagementDisplayProps) => {
  const viewerIsAdmin = viewerRole === 'admin';
  const candidates = users.filter((u) => u.status === 'candidate');
  const activeUsers = users.filter((u) => u.status !== 'candidate');
  // A plain mentor can't touch an account that's already mentor/admin —
  // separation of duties so mentors can't demote/suspend/delete each other.
  const canManage = (targetRole: string) => viewerIsAdmin || (targetRole !== 'mentor' && targetRole !== 'admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            ADMINISTRATION / User Management
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            User Access Control
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage system access, roles, and approval status for all researchers.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <a
            href="/api/admin/access-registry?format=csv"
            title="Download the full access registry as CSV (ICH E6(R3) ACC-01/ACC-02)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
            }}
          >
            Export Access Registry (CSV)
          </a>
          <button
            onClick={onRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '10px 12px',
          background: 'rgba(248, 113, 113, 0.08)',
          border: '1px solid var(--status-dropped)',
          borderRadius: 'var(--radius)',
          fontSize: '12px',
          color: 'var(--status-dropped)',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div><strong>Failed to load users</strong> — {error}</div>
        </div>
      )}

      {/* Candidates section */}
      {!isLoading && candidates.length > 0 && (
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--status-warning)',
            padding: '6px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Clock size={11} />
            Pending Candidates ({candidates.length}) — Auto-expire after 30 days if not approved
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={colHeaderStyle}>Email</th>
                  <th style={colHeaderStyle}>Expires At</th>
                  <th style={{ ...colHeaderStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((user, i) => {
                  const expiresAt = user.candidate_expires_at
                    ? new Date(user.candidate_expires_at).toLocaleDateString()
                    : '—';
                  return (
                    <tr
                      key={user.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={cellStyle}>
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px' }}>{user.email}</span>
                      </td>
                      <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--text-timestamp)' }}>
                        {expiresAt}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          {/* Approve: candidate → active */}
                          <button
                            onClick={() => onStatusChange(user.id, 'active')}
                            title="Approve and activate account"
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-active)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                          >
                            <UserCheck size={14} />
                          </button>
                          {/* Reject: hard delete */}
                          <button
                            onClick={() => onDelete(user.id)}
                            title="Reject and delete account"
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-dropped)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active users table */}
      <div>
        {candidates.length > 0 && (
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            padding: '6px 0',
          }}>
            Active Users
          </div>
        )}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fetching registered profiles…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : activeUsers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '48px', color: 'var(--text-muted)' }}>
              <ShieldAlert size={32} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>No profiles found</div>
              <div style={{ fontSize: '11px' }}>No other users have registered on this platform yet.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={colHeaderStyle}>Email</th>
                  <th style={colHeaderStyle}>Role</th>
                  <th style={colHeaderStyle}>Status</th>
                  <th style={colHeaderStyle}>Studies</th>
                  <th style={{ ...colHeaderStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user, i) => {
                  const isSelf = user.email === currentUserEmail;
                  return (
                    <tr
                      key={user.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {/* Email */}
                      <td style={cellStyle}>
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px' }}>{user.email}</span>
                        {isSelf && (
                          <span style={{
                            marginLeft: '6px',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '1px 4px',
                            background: 'var(--bg-surface-alt)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.05em',
                          }}>
                            YOU
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td style={cellStyle}>
                        {isSelf || !canManage(user.role) ? (
                          <span
                            title={!isSelf && !canManage(user.role) ? 'Only an admin can change a mentor/admin account' : undefined}
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--accent-soft)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Shield size={10} />
                            {user.role === 'admin' ? 'Admin' : user.role === 'mentor' ? 'Mentor' : user.role.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => onRoleChange(user.id, e.target.value)}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: user.role === 'mentor' ? 'var(--accent-soft)' : 'var(--text-secondary)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0',
                              fontFamily: 'var(--font-ui)',
                              outline: 'none',
                            }}
                          >
                            <option value="admin" disabled={!viewerIsAdmin} title={!viewerIsAdmin ? 'Only an admin can grant the admin role' : undefined}>
                              Admin{!viewerIsAdmin ? ' (admin only)' : ''}
                            </option>
                            <option value="mentor">Mentor</option>
                            <option value="investigator">Investigator</option>
                            <option value="site_coordinator">Site Coordinator</option>
                            <option value="data_manager">Data Manager</option>
                            <option value="monitor">Monitor</option>
                            <option value="auditor">Auditor</option>
                            <option value="irb_reviewer">IRB Reviewer</option>
                            <option value="team_member">Team Member</option>
                          </select>
                        )}
                      </td>

                      {/* Status */}
                      <td style={cellStyle}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: STATUS_COLOR[user.status] ?? 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}>
                          {user.status === 'pending' ? 'Pending Approval' : user.status}
                        </span>
                      </td>

                      {/* Studies — mentor/admin are global, not scoped by study_members */}
                      <td style={{ ...cellStyle, height: 'auto', padding: '6px 10px' }}>
                        {user.role === 'mentor' || user.role === 'admin' ? (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>All studies (global)</span>
                        ) : (
                          <StudiesCell
                            userId={user.id}
                            allStudies={studies}
                            memberStudyIds={membershipsByUser[user.id] ?? []}
                            onAdd={onAddStudyMember}
                            onRemove={onRemoveStudyMember}
                          />
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ ...cellStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>

                          {/* Approve pending */}
                          {user.status === 'pending' && canManage(user.role) && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Approve account"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-active)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}


                          {/* Suspend */}
                          {!isSelf && user.status === 'active' && canManage(user.role) && (
                            <button
                              onClick={() => onStatusChange(user.id, 'suspended')}
                              title="Suspend access"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-pending)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserMinus size={14} />
                            </button>
                          )}

                          {/* Unsuspend */}
                          {!isSelf && user.status === 'suspended' && canManage(user.role) && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Activate access"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-active)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && canManage(user.role) && (
                            <button
                              onClick={() => onDelete(user.id)}
                              title="Delete profile"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-dropped)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {!isSelf && !canManage(user.role) && (
                            <span title="Only an admin can manage this account" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              admin only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementDisplay;
