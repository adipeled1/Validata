"use client";

import { useState } from 'react';
import { FlaskConical, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import HoverTooltip from '../common/HoverTooltip';

const StudyManagement = ({ studies, currentStudyId, onAddStudy, onDeleteStudy }) => {
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyGoal, setNewStudyGoal] = useState('');

  const handleCreateStudy = (e) => {
    e.preventDefault();
    if (!newStudyName.trim()) return;
    onAddStudy(newStudyName.trim(), newStudyGoal);
    setNewStudyName('');
    setNewStudyGoal('');
  };

  const handleDeleteStudy = (id) => {
    const study = studies.find((s) => s.id === id);
    if (!study) return;

    // The delete button is disabled in the UI when this is the only study,
    // but guard here too in case it's ever triggered another way.
    if (studies.length <= 1) {
      window.alert('Cannot delete the only study. Create another study first, then delete this one.');
      return;
    }

    if (window.confirm(`Delete study "${study.name}"? This permanently deletes all of its participants and measurements. This cannot be undone.`)) {
      onDeleteStudy(id);
    }
  };

  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Studies Management</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Create or permanently remove studies. Each study&apos;s participants, measurements, and recruitment goal are fully isolated from the others.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Study Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            Create New Study
          </h3>
          <form onSubmit={handleCreateStudy} className="space-y-4">
            <div>
              <label htmlFor="new-study-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Study Name
              </label>
              <input
                id="new-study-name"
                type="text"
                required
                placeholder="e.g. braude's_research_3"
                value={newStudyName}
                onChange={(e) => setNewStudyName(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="new-study-goal" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recruitment Goal (optional)
              </label>
              <input
                id="new-study-goal"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={newStudyGoal}
                onChange={(e) => setNewStudyGoal(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Study
            </button>
          </form>
        </div>

        {/* Studies List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">All Studies</h3>
            <span className="text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 py-1 px-3 rounded-full">
              Total: {studies.length}
            </span>
          </div>

          <div className="space-y-3">
            {studies.length === 0 && (
              <p className="text-center py-6 text-slate-500 dark:text-slate-400">No studies yet. Create one to get started.</p>
            )}
            {studies.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FlaskConical className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recruitment goal: {s.recruitment_goal ?? '—'}
                    </p>
                  </div>
                  {s.id === currentStudyId && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>
                <HoverTooltip
                  text={
                    studies.length <= 1
                      ? 'Cannot delete the only study. Create another study first, then delete this one.'
                      : 'Permanently deletes this study and all of its participants and measurements. This cannot be undone.'
                  }
                >
                  <button
                    onClick={() => handleDeleteStudy(s.id)}
                    disabled={studies.length <= 1}
                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                      studies.length <= 1
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </HoverTooltip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudyManagement;
