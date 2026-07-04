import React from 'react';
import { UserCheck, Shield, Trash2, ShieldAlert, AlertCircle, RefreshCw, UserMinus, Clock, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  candidate_expires_at?: string;
}

interface UserManagementDisplayProps {
  users: User[];
  isLoading: boolean;
  error: string;
  currentUserEmail: string;
  onRoleChange: (userId: string, newRole: string) => void;
  onStatusChange: (userId: string, newStatus: string) => void;
  onDelete: (userId: string) => void;
  onRefresh: () => void;
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

const UserManagementDisplay = ({
  users,
  isLoading,
  error,
  currentUserEmail,
  onRoleChange,
  onStatusChange,
  onDelete,
  onRefresh,
}: UserManagementDisplayProps) => {
  const candidates = users.filter((u) => u.status === 'candidate');
  const activeUsers = users.filter((u) => u.status !== 'candidate');

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
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: user.role === 'mentor' ? 'var(--accent-soft)' : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {user.role === 'mentor' && <Shield size={10} />}
                          {user.role === 'mentor' ? 'Mentor' : user.role.replace(/_/g, ' ')}
                        </span>
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

                      {/* Actions */}
                      <td style={{ ...cellStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>

                          {/* Approve pending */}
                          {user.status === 'pending' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Approve account"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-active)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}

                          {/* Role toggle */}
                          {!isSelf && (
                            <button
                              onClick={() => onRoleChange(user.id, user.role === 'mentor' ? 'team_member' : 'mentor')}
                              title={`Switch to ${user.role === 'mentor' ? 'Team Member' : 'Mentor'}`}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent-soft)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <Shield size={14} />
                            </button>
                          )}

                          {/* Suspend */}
                          {!isSelf && user.status === 'active' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'suspended')}
                              title="Suspend access"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-pending)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserMinus size={14} />
                            </button>
                          )}

                          {/* Unsuspend */}
                          {!isSelf && user.status === 'suspended' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Activate access"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-active)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && (
                            <button
                              onClick={() => onDelete(user.id)}
                              title="Delete profile"
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-dropped)', cursor: 'pointer', padding: '3px', display: 'flex' }}
                            >
                              <Trash2 size={14} />
                            </button>
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
