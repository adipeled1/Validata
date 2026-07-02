import { useState, useMemo } from 'react';
import { FileSpreadsheet, CheckCircle, X, ArrowDownUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDateForDisplay } from './service';
import HoverTooltip from '../common/HoverTooltip';

const RESULTS_EXPORT_HEADERS = ['Enrollment Date', 'Test Date', 'Participant', 'Goniometer', 'AI/ML Model', 'Notes'];

const toDateStr = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const ResultsDisplay = ({ sortedMeasurements, participants = [], onMarkInvalid }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [filterParticipant, setFilterParticipant] = useState('');
  const [filterEnrollDate, setFilterEnrollDate] = useState('');
  const [filterTestDate, setFilterTestDate] = useState('');
  const [sortColumn, setSortColumn] = useState(null);

  const droppedParticipantIds = new Set(
    participants
      .filter((p) => String(p.status || '').toLowerCase() === 'dropped')
      .map((p) => p.id)
  );
  const isMeasurementValid = (m) => m.isValid !== false && !droppedParticipantIds.has(m.participant);

  const uniqueParticipants = useMemo(() => {
    const names = sortedMeasurements.map((m) => m.participant).filter(Boolean);
    return [...new Set(names)].sort();
  }, [sortedMeasurements]);

  const handleSortClick = (col) => {
    setSortColumn((prev) => (prev === col ? null : col));
  };

  const displayMeasurements = useMemo(() => {
    let result = sortedMeasurements.filter((m) => {
      if (filterParticipant && m.participant !== filterParticipant) return false;
      const enrollStr = toDateStr(m.enrollmentDate || m.enrollment_date);
      const testStr = toDateStr(m.testDate || m.test_date);
      if (filterEnrollDate && enrollStr !== filterEnrollDate) return false;
      if (filterTestDate && testStr !== filterTestDate) return false;
      return true;
    });

    if (sortColumn === 'enrollmentDate') {
      result = [...result].sort((a, b) => {
        const da = new Date(a.enrollmentDate || a.enrollment_date || 0).getTime();
        const db = new Date(b.enrollmentDate || b.enrollment_date || 0).getTime();
        return db - da;
      });
    } else if (sortColumn === 'testDate') {
      result = [...result].sort((a, b) => {
        const da = new Date(a.testDate || a.test_date || 0).getTime();
        const db = new Date(b.testDate || b.test_date || 0).getTime();
        return db - da;
      });
    } else if (sortColumn === 'participant') {
      result = [...result].sort((a, b) => {
        const numA = parseInt(String(a.participant || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.participant || '').replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });
    }

    return result;
  }, [sortedMeasurements, filterParticipant, filterEnrollDate, filterTestDate, sortColumn]);

  const hasActiveFilters = filterParticipant || filterEnrollDate || filterTestDate;
  const clearFilters = () => {
    setFilterParticipant('');
    setFilterEnrollDate('');
    setFilterTestDate('');
  };

  // Plain function (not a component) so it doesn't get remounted on every render.
  const renderSortIcon = (col) => {
    if (sortColumn !== col) return <ArrowDownUp className="w-3.5 h-3.5 opacity-40" />;
    return <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const handleExportToExcel = () => {
    setIsExporting(true);
    setShowToast(true);

    try {
      const worksheetData = sortedMeasurements
        .filter(isMeasurementValid)
        .map(m => ({
          'Enrollment Date': formatDateForDisplay(m.enrollmentDate || m.enrollment_date),
          'Test Date': formatDateForDisplay(m.testDate || m.test_date),
          'Participant': m.participant,
          'Goniometer': m.goniometer || '-',
          'AI/ML Model': m.aiModel || '-',
          'Notes': m.notes || '-'
        }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: RESULTS_EXPORT_HEADERS });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
      XLSX.writeFile(workbook, 'validata-results.xlsx');
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setIsExporting(false);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleMarkInvalidClick = (id) => {
    if (window.confirm('Mark this measurement invalid? This cannot be undone and it will be excluded from all statistics.')) {
      onMarkInvalid(id);
    }
  };

  return (
    <section className="app-section">
      {showToast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-[#10b981] text-white px-6 py-3 rounded shadow-lg transition-all duration-300">
          <span className="font-medium text-sm">Preparing Excel report... Download will begin shortly.</span>
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Results</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Research data collected from all participants.
          </p>
        </div>

        <button
          onClick={handleExportToExcel}
          disabled={isExporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Export Results to Excel</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800" id="results-pdf-container">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Research Data View
        </h3>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Participant</label>
            <select
              value={filterParticipant}
              onChange={(e) => setFilterParticipant(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All participants</option>
              {uniqueParticipants.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Enrollment Date</label>
            <input
              type="date"
              value={filterEnrollDate}
              onChange={(e) => setFilterEnrollDate(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Test Date</label>
            <input
              type="date"
              value={filterTestDate}
              onChange={(e) => setFilterTestDate(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline self-end pb-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {displayMeasurements.length === 0 ? (
            <p className="text-center py-6 text-slate-500 dark:text-slate-400">No data to display</p>
          ) : (
            displayMeasurements.map((m, index) => {
              const isValid = isMeasurementValid(m);
              return (
                <div
                  key={index}
                  className={`border border-slate-200 dark:border-slate-800 rounded-lg p-4 ${isValid ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.participant}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{m.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-1">
                    <span>Enrolled: {formatDateForDisplay(m.enrollmentDate || m.enrollment_date)}</span>
                    <span dir="ltr">Test Date: {formatDateForDisplay(m.testDate || m.test_date)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Goniometer: {m.goniometer || '-'}</span>
                    <span>AI/ML Model: {m.aiModel || '-'}</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Notes: {m.notes || '-'}</p>
                  <div className="flex items-center justify-end mt-2">
                    {isValid ? (
                      <button
                        onClick={() => handleMarkInvalidClick(m.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Valid
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                        <X className="w-3.5 h-3.5" /> Invalid
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                <th
                  className="py-3 px-3 font-medium cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => handleSortClick('enrollmentDate')}
                >
                  <span className="flex items-center gap-1.5">Enrollment Date {renderSortIcon('enrollmentDate')}</span>
                </th>
                <th
                  className="py-3 px-3 font-medium cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => handleSortClick('testDate')}
                >
                  <span className="flex items-center gap-1.5">Test Date {renderSortIcon('testDate')}</span>
                </th>
                <th
                  className="py-3 px-3 font-medium cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => handleSortClick('participant')}
                >
                  <span className="flex items-center gap-1.5">Participant {renderSortIcon('participant')}</span>
                </th>
                <th className="py-3 px-3 font-medium">Goniometer</th>
                <th className="py-3 px-3 font-medium">AI/ML Model</th>
                <th className="py-3 px-3 font-medium">Notes</th>
                <th className="py-3 px-3 font-medium">Valid/Invalid</th>
              </tr>
            </thead>
            <tbody>
              {displayMeasurements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-500 dark:text-slate-400">
                    No data to display
                  </td>
                </tr>
              ) : (
                displayMeasurements.map((m, index) => {
                  const isValid = isMeasurementValid(m);
                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isValid ? '' : 'opacity-60'}`}
                    >
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400" dir="ltr">{formatDateForDisplay(m.enrollmentDate || m.enrollment_date)}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{formatDateForDisplay(m.testDate || m.test_date)}</td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-100">{m.participant}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.goniometer || '-'}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.aiModel || '-'}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.notes || '-'}</td>
                      <td className="py-3 px-3">
                        {isValid ? (
                          <HoverTooltip text="Permanently excludes this measurement from statistics. This cannot be undone.">
                            <button
                              onClick={() => handleMarkInvalidClick(m.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Valid
                            </button>
                          </HoverTooltip>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                            <X className="w-3.5 h-3.5" /> Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ResultsDisplay;
