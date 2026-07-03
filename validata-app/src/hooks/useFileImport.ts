"use client";

import { useState } from 'react';
import { parseCSV } from '../lib/csvParser';
import { createMeasurementsBatchAction } from '../app/actions/measurements';

export interface ImportSummary {
  successCount: number;
  errorCount: number;
  errors: string[];
}

interface FileImportDeps {
  participants: any[];
  measurementsData: any[];
  currentStudyId: string | null;
  isDemoMode: boolean;
  mutateMeasurementsData: (updater: any, options?: any) => void;
  triggerToast: (message: string) => void;
}

export function useFileImport({
  participants,
  measurementsData,
  currentStudyId,
  isDemoMode,
  mutateMeasurementsData,
  triggerToast,
}: FileImportDeps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const processImportedRows = async (rows: any[]): Promise<ImportSummary> => {
    let errorCount = 0;
    const errors: string[] = [];
    const validPayloads: any[] = [];
    const validDemoRows: any[] = [];

    const activeParticipantIds = new Set(
      participants
        .filter((p: any) => p.status.toLowerCase() === 'active')
        .map((p: any) => p.id.toLowerCase())
    );

    const formattedTimestamp = (() => {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    })();

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

      validDemoRows.push({
        participant: pId,
        goniometer: `${parsedGoniometer.toFixed(1)}°`,
        aiModel: `${parsedAiModel.toFixed(1)}°`,
        notes,
        timestamp: formattedTimestamp,
        testDate: testDateValue || new Date().toISOString().split('T')[0],
        isValid: true,
      });
    }

    if (validPayloads.length > 0) {
      if (isDemoMode) {
        const baseId = measurementsData.length > 0
          ? Math.max(...measurementsData.map((m: any) => parseInt(m.id) || 0))
          : 0;

        const newMeasurements = validDemoRows.map((r, idx) => ({
          id: baseId + idx + 1,
          ...r,
        }));

        mutateMeasurementsData(
          (current: any[] = []) => [...newMeasurements.reverse(), ...current],
          { revalidate: false }
        );
      } else {
        const savedBatch: any[] = await createMeasurementsBatchAction(validPayloads);

        const newMeasurements = savedBatch.map((saved: any, idx: number) => ({
          id: saved.id,
          participant: saved.participant_id,
          goniometer: `${parseFloat(saved.goniometer).toFixed(1)}°`,
          aiModel: `${parseFloat(saved.ai_model).toFixed(1)}°`,
          notes: saved.notes,
          timestamp: validDemoRows[idx]?.timestamp ?? formattedTimestamp,
          testDate: saved.test_date || validPayloads[idx]?.testDate || new Date().toISOString().split('T')[0],
          isValid: true,
        }));

        mutateMeasurementsData(
          (current: any[] = []) => [...newMeasurements.reverse(), ...current],
          { revalidate: false }
        );
      }
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
