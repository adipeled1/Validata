"use client";

import { useState } from 'react';
import { parseCSV } from '../lib/csvParser';
import { createMeasurementsBatchAction } from '../app/actions/measurements';
import * as clientDemoStore from '../lib/clientDemoStore';
import { mapMeasurements } from '../lib/mappers';

export interface ImportSummary {
  successCount: number;
  errorCount: number;
  errors: string[];
}

interface FileImportDeps {
  participants: any[];
  currentStudyId: string | null;
  mutateMeasurementsData: (updater: any, options?: any) => void;
  triggerToast: (message: string) => void;
  isDemoMode: boolean;
  currentUserEmail: string;
}

// Demo mode bypasses the Server Action/repository entirely and writes
// straight to clientDemoStore (sessionStorage) - fixing two gaps the
// repository's demo branch had: imported rows now persist past a refresh,
// and each row gets its own audit entry (the repository's isDemo branch
// built rows but never logged them, so a CSV import used to leave zero
// trace in Study Log/System Log even though it visibly populated Data
// Collection). Live mode is unaffected.
export function useFileImport({
  participants,
  currentStudyId,
  mutateMeasurementsData,
  triggerToast,
  isDemoMode,
  currentUserEmail,
}: FileImportDeps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const processImportedRows = async (rows: any[]): Promise<ImportSummary> => {
    let errorCount = 0;
    const errors: string[] = [];
    const validPayloads: any[] = [];

    const activeParticipantIds = new Set(
      participants
        .filter((p: any) => p.status.toLowerCase() === 'active')
        .map((p: any) => p.id.toLowerCase())
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const pId = (row.participant_id || row.participant || row.participantid || row.participantId || '').toString().trim();
      const goniometerRaw = row.goniometer;
      const aiModelRaw = row.ai_model || row.aiModel || row.aimodel || row.ai_ml || row.aiml;
      const notes = (row.notes || '').toString().trim();

      if (!pId) {
        errorCount++;
        errors.push(`Row ${i + 2}: Missing Participant ID`);
        continue;
      }

      if (!activeParticipantIds.has(pId.toLowerCase())) {
        errorCount++;
        errors.push(`Row ${i + 2}: Participant "${pId}" is not Active or does not exist`);
        continue;
      }

      const parsedGoniometer = parseFloat(goniometerRaw?.toString().replace('°', ''));
      const parsedAiModel = parseFloat(aiModelRaw?.toString().replace('°', ''));

      if (isNaN(parsedGoniometer) || isNaN(parsedAiModel)) {
        errorCount++;
        errors.push(`Row ${i + 2} (${pId}): Invalid numeric values (Goniometer: ${goniometerRaw}, AI Model: ${aiModelRaw})`);
        continue;
      }

      const testDateValue = (row.test_date || row.testDate || '').toString().trim();

      validPayloads.push({
        participantId: pId,
        goniometer: parsedGoniometer,
        aiModel: parsedAiModel,
        notes,
        testDate: testDateValue || new Date().toISOString().split('T')[0],
        studyId: currentStudyId,
      });
    }

    if (validPayloads.length > 0) {
      const savedBatch: any[] = isDemoMode
        ? clientDemoStore.addMeasurementsBatch(validPayloads, currentUserEmail)
        : await createMeasurementsBatchAction(validPayloads);
      const newMeasurements = mapMeasurements(savedBatch);

      mutateMeasurementsData(
        (current: any[] = []) => [...newMeasurements.reverse(), ...current],
        { revalidate: false }
      );
    }

    return { successCount: validPayloads.length, errorCount, errors };
  };

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let rows: any[] = [];
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'json') {
          const text = e.target!.result as string;
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } else if (fileExt === 'csv') {
          rows = parseCSV(e.target!.result as string);
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet);
        } else {
          throw new Error('Unsupported file format. Please upload CSV, Excel (.xlsx/.xls), or JSON.');
        }

        if (rows.length === 0) {
          throw new Error('No rows found in the file.');
        }

        const result = await processImportedRows(rows);
        setImportSummary(result);

        if (result.successCount > 0) {
          triggerToast(`Successfully imported ${result.successCount} measurements!`);
        } else {
          triggerToast('Import failed. No valid rows were saved.');
        }
      } catch (err: any) {
        console.error('File parsing error:', err);
        setImportSummary({ successCount: 0, errorCount: 1, errors: [err.message] });
        triggerToast('Failed to import file: ' + err.message);
      } finally {
        setIsImporting(false);
      }
    };

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  return {
    isImporting,
    importSummary,
    handleFileUpload,
    clearImportSummary: () => setImportSummary(null),
  };
}
