"use client";

import { UploadCloud, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const handleDownloadTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([['participant_id', 'goniometer', 'ai_model', 'test_date', 'notes']]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'validata-import-template.xlsx');
};

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
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

interface DataCollectionDisplayProps {
  activeParticipants: any[];
  participantId: string;
  onParticipantChange: (v: string) => void;
  goniometer: string;
  onGoniometerChange: (v: string) => void;
  aiModel: string;
  onAiModelChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  testDate: string;
  onTestDateChange: (v: string) => void;
  onSubmitLog: (e: React.FormEvent) => void;
  uploadedFile: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isImporting: boolean;
  importSummary: any;
  onClearImportSummary: () => void;
}

const DataCollectionDisplay = ({
  activeParticipants,
  participantId,
  onParticipantChange,
  goniometer,
  onGoniometerChange,
  aiModel,
  onAiModelChange,
  notes,
  onNotesChange,
  testDate,
  onTestDateChange,
  onSubmitLog,
  uploadedFile,
  onFileChange,
  fileInputRef,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  isImporting,
  importSummary,
  onClearImportSummary,
}: DataCollectionDisplayProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          PARTICIPANTS & DATA / Data Collection
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Data Collection &amp; Management
        </h1>
      </div>

      {/* Two-pane layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Measurement Log Form */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
            Measurement Log
          </div>
          <form onSubmit={onSubmitLog} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label htmlFor="log-participant" style={labelStyle}>Participant (Active Only)</label>
              <select
                id="log-participant"
                required
                value={participantId}
                onChange={(e) => onParticipantChange(e.target.value)}
                style={inputStyle}
              >
                <option value="" disabled>-- Select Participant --</option>
                {activeParticipants.map((p) => (
                  <option key={p.id} value={p.id}>{p.id}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="log-goniometer" style={labelStyle}>Goniometer</label>
                <input
                  id="log-goniometer"
                  type="text"
                  placeholder="e.g. 45°"
                  value={goniometer}
                  onChange={(e) => onGoniometerChange(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="log-ai-model" style={labelStyle}>AI/ML Model</label>
                <input
                  id="log-ai-model"
                  type="text"
                  placeholder="e.g. 44.8°"
                  value={aiModel}
                  onChange={(e) => onAiModelChange(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="log-test-date" style={labelStyle}>Test Date</label>
              <input
                id="log-test-date"
                type="date"
                value={testDate}
                onChange={(e) => onTestDateChange(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="log-notes" style={labelStyle}>Researcher Notes</label>
              <textarea
                id="log-notes"
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              style={{
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
              Log Measurement
            </button>
          </form>
        </div>

        {/* File Upload */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
              Bulk Import (CSV, JSON, Excel)
            </div>
            <button
              onClick={handleDownloadTemplate}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-link)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={12} />
              Download Template
            </button>
          </div>

          {isImporting ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Processing and importing file…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : importSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <div style={{
                padding: '10px',
                background: importSummary.errorCount === 0 ? 'rgba(78, 201, 176, 0.1)' : 'rgba(220, 220, 170, 0.1)',
                border: `1px solid ${importSummary.errorCount === 0 ? 'var(--status-active)' : 'var(--status-pending)'}`,
                borderRadius: 'var(--radius)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                  <CheckCircle size={14} style={{ color: 'var(--status-active)' }} />
                  Import Complete
                </div>
                Successfully imported <strong>{importSummary.successCount}</strong> measurements.
                {importSummary.errorCount > 0 && <span> Skipped <strong>{importSummary.errorCount}</strong> rows.</span>}
              </div>

              {importSummary.errors?.length > 0 && (
                <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px', background: 'var(--bg-panel)', border: '1px solid var(--status-dropped)', borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--status-dropped)', fontFamily: 'var(--font-data)' }}>
                  {importSummary.errors.map((err: string, i: number) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <button
                onClick={onClearImportSummary}
                style={{ padding: '6px 0', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', marginTop: 'auto' }}
              >
                Import Another File
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px dashed ${isDragging ? 'var(--accent-soft)' : 'var(--border)'}`,
                  background: isDragging ? 'rgba(157, 127, 234, 0.08)' : 'var(--bg-surface-alt)',
                  cursor: 'pointer',
                  padding: '24px',
                  minHeight: '140px',
                  transition: 'all 0.15s',
                }}
              >
                <UploadCloud size={32} style={{ color: 'var(--text-ghost)', marginBottom: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {isDragging ? 'Drop the file here' : 'Click or drag and drop a data file here'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  CSV, Excel (.xlsx/.xls), JSON — up to 50 MB
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={onFileChange}
                  accept=".csv,.json,.xlsx,.xls"
                />
              </div>

              <div style={{ padding: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Expected headers:</div>
                <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)', fontSize: '11px' }}>
                  participant_id, goniometer, ai_model, test_date, notes
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataCollectionDisplay;
