"use client";

import { useState } from 'react';
import { getParticipantStats } from './utils';
import DataGrid from '../ui/DataGrid';
import StatusDot from '../ui/StatusDot';

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

const StatBlock = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      padding: '10px 16px',
      minWidth: '120px',
    }}
  >
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>
      {label}
    </div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
      {value}
    </div>
  </div>
);

const ParticipantsView = ({ participants = [] }: { participants?: any[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.healthStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = getParticipantStats(participants);

  const columns = [
    {
      key: 'id',
      label: 'Participant ID',
      width: '120px',
      render: (row: any) => (
        <span style={{ color: 'var(--text-id)', fontFamily: 'var(--font-data)' }}>{row.id}</span>
      ),
    },
    { key: 'age', label: 'Age', width: '60px', render: (row: any) => row.age ?? 'N/A' },
    { key: 'gender', label: 'Gender', width: '80px', render: (row: any) => row.gender ?? 'N/A' },
    {
      key: 'healthStatus',
      label: 'Health Status',
      width: '140px',
      render: (row: any) => {
        const hs = row.healthStatus ?? 'N/A';
        const color = hs === 'Healthy' ? 'var(--status-active)' : hs === 'Ankle Injured' ? 'var(--status-dropped)' : 'var(--text-muted)';
        return <span style={{ color, fontSize: '12px' }}>{hs}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (row: any) => <StatusDot status={row.status ?? 'active'} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          PARTICIPANTS & DATA / Participant Viewer
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Participant Viewer
        </h1>
      </div>

      {/* Stat blocks */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <StatBlock label="Total" value={participants.length} />
        <StatBlock label="Avg Age" value={stats.avgAge + ' yrs'} />
        <StatBlock label="Healthy" value={stats.healthyCount} color="var(--status-active)" />
        <StatBlock label="Ankle Injured" value={stats.ankleInjuredCount} color="var(--status-dropped)" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by ID…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, width: '200px' }}
          aria-label="Search participants by ID"
        />
        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Health Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
          aria-label="Filter by health status"
        >
          <option value="All">All</option>
          <option value="Healthy">Healthy</option>
          <option value="Ankle Injured">Ankle Injured</option>
        </select>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredParticipants.length} of {participants.length} participants
        </span>
      </div>

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        rows={filteredParticipants}
        keyField="id"
        emptyMessage="No participants match the criteria."
      />
    </div>
  );
};

export default ParticipantsView;
