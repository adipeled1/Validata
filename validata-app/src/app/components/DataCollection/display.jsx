import { UploadCloud, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const handleDownloadTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([['participant_id', 'goniometer', 'ai_model', 'test_date', 'notes']]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'validata-import-template.xlsx');
};

// Pure presentational component
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
  isImporting,
  importSummary,
  onClearImportSummary
}) => {
  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Data Collection & Management</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manual measurement logging and raw data file uploads.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Measurement Log */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            Measurement Log
          </h3>
          <form onSubmit={onSubmitLog} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Participant (Active Only)
              </label>
              <select
                required
                value={participantId}
                onChange={(e) => onParticipantChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="" disabled>
                  -- Select Participant --
                </option>
                {activeParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Goniometer
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45°"
                  value={goniometer}
                  onChange={(e) => onGoniometerChange(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  AI/ML Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. 44.8°"
                  value={aiModel}
                  onChange={(e) => onAiModelChange(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Test Date
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => onTestDateChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Researcher Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Log Measurement
            </button>
          </form>
        </div>

        {/* File Upload / Import */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Bulk Import (CSV, JSON, Excel)
            </h3>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>

          {isImporting ? (
            <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">Processing and importing file...</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Please do not refresh the page.</p>
            </div>
          ) : importSummary ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${importSummary.errorCount === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'}`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Import Complete
                  </div>
                  <p className="text-sm">
                    Successfully imported <strong>{importSummary.successCount}</strong> measurements.
                    {importSummary.errorCount > 0 && <span> Skipped <strong>{importSummary.errorCount}</strong> rows due to validation errors.</span>}
                  </p>
                </div>

                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-mono space-y-1">
                    <div className="font-semibold mb-1 text-rose-800 dark:text-rose-300">Errors & Warnings:</div>
                    {importSummary.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={onClearImportSummary}
                className="mt-4 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Import Another File
              </button>
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-between">
              <div
                className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer p-6 min-h-[160px]"
                onClick={() => fileInputRef.current.click()}
              >
                <UploadCloud className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Click here to select a data file</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Supports CSV, Excel (.xlsx/.xls), JSON (up to 50MB)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={onFileChange}
                  accept=".csv,.json,.xlsx,.xls"
                />
              </div>

              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Expected Spreadsheet Headers:</p>
                <code className="block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded text-indigo-600 dark:text-indigo-400 font-mono break-all leading-normal">
                  participant_id, goniometer, ai_model, test_date, notes
                </code>
                <p className="mt-1.5 text-slate-400 dark:text-slate-400 leading-normal">
                  * Note: Only active participants are imported. Goniometer and AI Model values must be numeric.
                </p>
                <p className="mt-1.5 text-slate-400 dark:text-slate-400 leading-normal">
                  * Multiple measurements for the same participant: add one row per measurement, repeating the same <code className="text-indigo-600 dark:text-indigo-400 font-mono">participant_id</code> on each row. There is no limit on how many rows one participant can have.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DataCollectionDisplay;
