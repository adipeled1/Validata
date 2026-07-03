import { useState } from 'react';

interface Props {
  title: string;
  body: string;
  reasonLabel: string;
  reasonRequired?: boolean;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// Modal that collects an optional (or required) reason before confirming a
// destructive action. Replaces window.confirm for ICH E6(R3) COR-01
// compliance — every correction or status change must capture a justification.
export default function ConfirmWithReasonModal({
  title,
  body,
  reasonLabel,
  reasonRequired = false,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState('');

  const canSubmit = !reasonRequired || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{body}</p>

        <label className="block text-sm font-medium mb-1">
          {reasonLabel}
          {reasonRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          rows={3}
          placeholder={reasonRequired ? 'Required' : 'Optional'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(reason.trim())}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
