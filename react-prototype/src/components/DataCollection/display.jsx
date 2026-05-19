import React from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';

// Pure presentational component
const DataCollectionDisplay = ({ 
  activeParticipants, 
  participantId, 
  onParticipantChange, 
  goniometer,
  onGoniometerChange,
  protractor,
  onProtractorChange,
  aiModel,
  onAiModelChange,
  notes, 
  onNotesChange, 
  onSubmitLog, 
  uploadedFile, 
  onFileChange, 
  fileInputRef 
}) => {
  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Data Collection & Management</h2>
        <p className="text-slate-500 mt-1">
          Manual measurement logging and raw data file uploads.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Measurement Log */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 border-b pb-2">
            Measurement Log
          </h3>
          <form onSubmit={onSubmitLog} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Participant (Active Only)
              </label>
              <select
                required
                value={participantId}
                onChange={(e) => onParticipantChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Goniometer
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45°"
                  value={goniometer}
                  onChange={(e) => onGoniometerChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Protractor
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45°"
                  value={protractor}
                  onChange={(e) => onProtractorChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  AI/ML Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. 44.8°"
                  value={aiModel}
                  onChange={(e) => onAiModelChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Researcher Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Log Measurement
            </button>
          </form>
        </div>

        {/* File Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 border-b pb-2">
            File Upload
          </h3>
          <div
            className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-6"
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">Click here to select a data file</p>
            <p className="text-xs text-slate-400 mt-1">Supports CSV, Excel, JSON (up to 50MB)</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {uploadedFile && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between bg-green-50 text-green-700 p-3 rounded border border-green-200">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{uploadedFile}</span> uploaded successfully.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DataCollectionDisplay;
