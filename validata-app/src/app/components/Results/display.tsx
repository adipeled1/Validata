"use client";

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDateForDisplay } from './service';
import DataGrid from '../ui/DataGrid';

const toDateStr = (value: any): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

// Participant ids are like "P-1001" - sort by the numeric part, not
// lexicographically (which would put "P-2" before "P-100").
const participantSortValue = (name: any): number => {
  const digits = String(name ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

type SortableKey = 'enrollmentDate' | 'testDate' | 'participant';
type SortDirection = 'asc' | 'desc';

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-md)',
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

interface ResultsDisplayProps {
  sortedMeasurements: any[];
  participants?: any[];
  onMarkInvalid: (id: any) => void;
}

const ResultsDisplay = ({ sortedMeasurements, participants = [], onMarkInvalid }: ResultsDisplayProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [filterParticipant, setFilterParticipant] = useState('');
  const [filterEnrollDate, setFilterEnrollDate] = useState('');
  const [filterTestDate, setFilterTestDate] = useState('');
  // Defaults to matching the incoming order: sortedMeasurements (from
  // service.ts's sortMeasurementsDescending) already arrives newest-first by
  // timestamp, and Test Date is the closest visible column to that - without
  // this, the header would show the neutral icon on all three columns even
  // though the rows are, in effect, already sorted.
  const [sortKey, setSortKey] = useState<SortableKey | null>('testDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Clicking an unsorted (or differently-sorted) column starts it at desc;
  // clicking the already-active column flips direction instead of resetting.
  const toggleSort = (key: SortableKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const droppedParticipantIds = new Set(
    participants
      .filter((p) => String(p.status || '').toLowerCase() === 'dropped')
      .map((p) => p.id)
  );
  const isMeasurementValid = (m: any) =>
    m.isValid !== false && !droppedParticipantIds.has(m.participant);

  const uniqueParticipants = useMemo(() => {
    const names = sortedMeasurements.map((m) => m.participant).filter(Boolean);
    return [...new Set(names)].sort() as string[];
  }, [sortedMeasurements]);

  const displayMeasurements = useMemo(() => {
    return sortedMeasurements.filter((m) => {
      if (filterParticipant && m.participant !== filterParticipant) return false;
      const enrollStr = toDateStr(m.enrollmentDate || m.enrollment_date);
      const testStr = toDateStr(m.testDate || m.test_date);
      if (filterEnrollDate && enrollStr !== filterEnrollDate) return false;
      if (filterTestDate && testStr !== filterTestDate) return false;
      return true;
    });
  }, [sortedMeasurements, filterParticipant, filterEnrollDate, filterTestDate]);

  const hasActiveFilters = filterParticipant || filterEnrollDate || filterTestDate;
  const clearFilters = () => {
    setFilterParticipant('');
    setFilterEnrollDate('');
    setFilterTestDate('');
  };

  // Applied after filtering - sorting doesn't change which rows are shown,
  // only their order. Null sortKey leaves displayMeasurements in its
  // incoming order (sortedMeasurements is already newest-first by timestamp).
  const sortedDisplayMeasurements = useMemo(() => {
    if (!sortKey) return displayMeasurements;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...displayMeasurements].sort((a, b) => {
      if (sortKey === 'participant') {
        return (participantSortValue(a.participant) - participantSortValue(b.participant)) * dir;
      }
      const field = sortKey === 'enrollmentDate' ? 'enrollmentDate' : 'testDate';
      const rawField = sortKey === 'enrollmentDate' ? 'enrollment_date' : 'test_date';
      const aStr = toDateStr(a[field] || a[rawField]);
      const bStr = toDateStr(b[field] || b[rawField]);
      // Rows with no date always sort last, regardless of direction.
      if (!aStr && !bStr) return 0;
      if (!aStr) return 1;
      if (!bStr) return -1;
      return aStr < bStr ? -dir : aStr > bStr ? dir : 0;
    });
  }, [displayMeasurements, sortKey, sortDirection]);

  const sortIcon = (key: SortableKey) => {
    if (sortKey !== key) return <ArrowDownUp size={11} style={{ opacity: 0.5 }} />;
    return sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
  };

  const sortableHeader = (label: string, key: SortableKey) => (
    <span
      onClick={() => toggleSort(key)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      {sortIcon(key)}
    </span>
  );

  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const worksheetData = sortedMeasurements
        .filter(isMeasurementValid)
        .map((m) => ({
          'Enrollment Date': formatDateForDisplay(m.enrollmentDate || m.enrollment_date),
          'Test Date': formatDateForDisplay(m.testDate || m.test_date),
          Participant: m.participant,
          Goniometer: m.goniometer || '-',
          'AI/ML Model': m.aiModel || '-',
          Notes: m.notes || '-',
        }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
      XLSX.writeFile(workbook, 'validata-results.xlsx');
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkInvalidClick = (id: any) => {
    // ICH E6(R3) COR-01: delegate to parent — reason modal is owned by ResultsControl.
    onMarkInvalid(id);
  };

  const columns = [
    {
      key: 'enrollmentDate',
      label: sortableHeader('Enrolled', 'enrollmentDate'),
      width: '100px',
      render: (m: any) => (
        <span style={{ color: 'var(--text-timestamp)', fontFamily: 'var(--font-data)' }}>
          {formatDateForDisplay(m.enrollmentDate || m.enrollment_date) || '—'}
        </span>
      ),
    },
    {
      key: 'testDate',
      label: sortableHeader('Test Date', 'testDate'),
      width: '100px',
      render: (m: any) => (
        <span style={{ color: 'var(--text-timestamp)', fontFamily: 'var(--font-data)' }}>
          {formatDateForDisplay(m.testDate || m.test_date) || '—'}
        </span>
      ),
    },
    {
      key: 'participant',
      label: sortableHeader('Participant', 'participant'),
      width: '100px',
      render: (m: any) => (
        <span style={{ color: 'var(--text-id)', fontFamily: 'var(--font-data)' }}>{m.participant}</span>
      ),
    },
    { key: 'goniometer', label: 'Goniometer', width: '100px', render: (m: any) => m.goniometer ?? '—' },
    { key: 'aiModel', label: 'AI/ML Model', width: '100px', render: (m: any) => m.aiModel ?? '—' },
    { key: 'notes', label: 'Notes', render: (m: any) => m.notes ?? '—' },
    {
      key: '_validity',
      label: 'Validity',
      width: '90px',
      render: (m: any) => {
        const isValid = isMeasurementValid(m);
        return isValid ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleMarkInvalidClick(m.id); }}
            style={{
              padding: '1px 8px',
              fontSize: 'var(--font-size-sm)',
              background: 'transparent',
              color: 'var(--status-active)',
              border: '1px solid var(--status-active)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Valid
          </button>
        ) : (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-dropped)' }}>Invalid</span>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            OVERVIEW & ANALYSIS / Results Table
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Results Table
          </h1>
        </div>
        <button
          onClick={handleExportToExcel}
          disabled={isExporting}
          style={{
            padding: '5px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Participant
          </label>
          <select
            value={filterParticipant}
            onChange={(e) => setFilterParticipant(e.target.value)}
            style={inputStyle}
            aria-label="Filter by participant"
          >
            <option value="">All participants</option>
            {uniqueParticipants.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Enrollment Date
          </label>
          <input
            type="date"
            value={filterEnrollDate}
            onChange={(e) => setFilterEnrollDate(e.target.value)}
            style={inputStyle}
            aria-label="Filter by enrollment date"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Test Date
          </label>
          <input
            type="date"
            value={filterTestDate}
            onChange={(e) => setFilterTestDate(e.target.value)}
            style={inputStyle}
            aria-label="Filter by test date"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              alignSelf: 'flex-end',
              padding: '4px 8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {displayMeasurements.length} / {sortedMeasurements.length} measurements
        </span>
      </div>

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        rows={sortedDisplayMeasurements}
        keyField="id"
        emptyMessage="No measurements match the current filters."
      />
    </div>
  );
};

export default ResultsDisplay;
