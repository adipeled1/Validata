"use client";

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import useSWR, { SWRConfig } from 'swr';
import mockData from '../mockData.json';
import { mapParticipants, mapMeasurements, withEnrollmentDates } from '../lib/mappers';
import { useSession } from './SessionContext';
import { setCurrentStudyAction } from '../app/actions/session';
import { createParticipantAction, updateParticipantStatusAction } from '../app/actions/participants';
import { createMeasurementAction, updateMeasurementValidityAction } from '../app/actions/measurements';
import { createStudyAction, deleteStudyAction, updateStudyGoalAction } from '../app/actions/studies';

const StudyContext = createContext(null);

const STUDIES_KEY = 'studies';
const participantsKey = (studyId) => (studyId ? `participants:${studyId}` : null);
const measurementsKey = (studyId) => (studyId ? `measurements:${studyId}` : null);

async function fetchStudies(isDemoMode) {
  if (isDemoMode) return mockData.studies;

  const res = await fetch('/api/studies');
  if (!res.ok) throw new Error('Failed to fetch studies');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function fetchParticipants(studyId, isDemoMode) {
  if (isDemoMode) {
    return mapParticipants(mockData.participants.filter((p) => p.study_id === studyId), true);
  }

  const res = await fetch(`/api/participants?study_id=${studyId}`);
  if (!res.ok) throw new Error('Failed to fetch participants');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return mapParticipants(data, false);
}

async function fetchMeasurements(studyId, isDemoMode) {
  if (isDemoMode) {
    return mapMeasurements(mockData.measurements.filter((m) => m.study_id === studyId), true);
  }

  const res = await fetch(`/api/measurements?study_id=${studyId}`);
  if (!res.ok) throw new Error('Failed to fetch measurements');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return mapMeasurements(data, false);
}

// Studies, participants, measurements, and every CRUD handler that operates
// on them - shared across every dashboard route (moved out of the old
// single-page component so each route under (dashboard)/ can share it
// without prop drilling).
//
// Initial data comes from (dashboard)/layout.js (a Server Component) via the
// `initial*` props, seeded into SWR's cache through the `fallback` map below
// so the very first render already has data - no client-side fetch waterfall.
// Switching studies, and every mutation, works entirely through SWR's
// `mutate()` from then on; `revalidateOnFocus` (SWR's default) is what picks
// up a colleague's changes if this study was left open in a background tab.
function StudyProviderInner({ children, initialCurrentStudyId }) {
  const { isLoading: isSessionLoading, isDemoMode, userStatus } = useSession();
  const isActive = !isSessionLoading && userStatus === 'active';

  const [nextId, setNextId] = useState(1009);
  const [currentStudyId, setCurrentStudyId] = useState(initialCurrentStudyId ?? null);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const triggerToast = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const { data: studies = [], mutate: mutateStudies, isLoading: studiesLoading } = useSWR(
    isActive ? STUDIES_KEY : null,
    () => fetchStudies(isDemoMode)
  );

  const { data: participants = [], mutate: mutateParticipants, isLoading: participantsLoading } = useSWR(
    isActive ? participantsKey(currentStudyId) : null,
    () => fetchParticipants(currentStudyId, isDemoMode)
  );

  const { data: measurementsData = [], mutate: mutateMeasurementsData, isLoading: measurementsLoading } = useSWR(
    isActive ? measurementsKey(currentStudyId) : null,
    () => fetchMeasurements(currentStudyId, isDemoMode)
  );

  const measurements = useMemo(
    () => withEnrollmentDates(measurementsData, participants),
    [measurementsData, participants]
  );

  const isLoading = studiesLoading || (!!currentStudyId && (participantsLoading || measurementsLoading));
  const currentStudy = studies.find((s) => s.id === currentStudyId) || null;

  const switchStudy = (studyId) => {
    setCurrentStudyId(studyId);
    setCurrentStudyAction(studyId).catch((error) => {
      console.warn('Failed to persist study selection:', error);
    });
  };

  const addStudy = async (name, goal) => {
    const recruitmentGoal = parseInt(goal) || 50;

    if (isDemoMode) {
      const newStudy = { id: `demo-${Date.now()}`, name, recruitment_goal: recruitmentGoal };
      mutateStudies((current = []) => [...current, newStudy], { revalidate: false });
      switchStudy(newStudy.id);
      triggerToast(`Study "${name}" created. (Demo)`);
      return;
    }

    try {
      const data = await createStudyAction({ name, recruitmentGoal });

      mutateStudies((current = []) => [...current, data], { revalidate: false });
      switchStudy(data.id);
      triggerToast(`Study "${name}" created.`);
    } catch (error) {
      console.error('Error creating study:', error);
      triggerToast('Failed to create study: ' + error.message);
    }
  };

  // Deleting a study permanently deletes all of its participants and
  // measurements too - confirmation lives in StudyManagement.jsx,
  // this handler just performs the (already-confirmed) deletion.
  const deleteStudy = async (id) => {
    const study = studies.find((s) => s.id === id);
    if (!study) return;

    const remaining = studies.filter((s) => s.id !== id);
    const wasCurrent = currentStudyId === id;
    const nextStudyId = wasCurrent ? (remaining.length > 0 ? remaining[0].id : null) : currentStudyId;

    if (isDemoMode) {
      mutateStudies(remaining, { revalidate: false });
      if (wasCurrent) switchStudy(nextStudyId);
      triggerToast(`Study "${study.name}" deleted. (Demo)`);
      return;
    }

    try {
      await deleteStudyAction(id);

      mutateStudies(remaining, { revalidate: false });
      if (wasCurrent) switchStudy(nextStudyId);
      triggerToast(`Study "${study.name}" deleted.`);
    } catch (error) {
      console.error('Error deleting study:', error);
      triggerToast('Failed to delete study: ' + error.message);
    }
  };

  const updateRecruitmentGoal = async (newGoal) => {
    const goal = parseInt(newGoal);
    if (isNaN(goal) || goal < 1) {
      triggerToast('Recruitment goal must be a positive number.');
      return;
    }

    if (isDemoMode) {
      mutateStudies(
        (current = []) => current.map((s) => (s.id === currentStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated. (Demo)');
      return;
    }

    try {
      await updateStudyGoalAction({ id: currentStudyId, recruitmentGoal: goal });

      mutateStudies(
        (current = []) => current.map((s) => (s.id === currentStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated.');
    } catch (error) {
      console.error('Error updating recruitment goal:', error);
      triggerToast('Failed to update recruitment goal: ' + error.message);
    }
  };

  const addParticipant = async ({ consent, age, gender, healthStatus, enrollmentDate }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before adding participants.');
      return;
    }

    if (isDemoMode) {
      const newId = `P-${nextId}`;
      setNextId((prev) => prev + 1);

      const newParticipant = {
        id: newId,
        consent,
        status: 'Active',
        age: parseInt(age) || null,
        gender,
        healthStatus,
        study_id: currentStudyId,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
      };
      mutateParticipants((current = []) => [newParticipant, ...current], { revalidate: false });
      triggerToast(`Participant ${newId} registered successfully! (Demo)`);
    } else {
      try {
        const nextNumericId = participants.length > 0
          ? Math.max(...participants.map((p) => parseInt(p.id.split('-')[1]) || 1000)) + 1
          : 1001;
        const newId = `P-${nextNumericId}`;

        await createParticipantAction({
          id: newId,
          consent,
          age: parseInt(age) || null,
          gender,
          healthStatus,
          enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
          studyId: currentStudyId
        });

        const newParticipant = {
          id: newId,
          consent,
          status: 'Active',
          age: parseInt(age) || null,
          gender,
          healthStatus,
          study_id: currentStudyId,
          enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
        };

        mutateParticipants((current = []) => [newParticipant, ...current], { revalidate: false });
        triggerToast(`Participant ${newId} registered and saved in database!`);
      } catch (error) {
        console.error('Error adding participant:', error);
        triggerToast('Failed to save participant: ' + error.message);
      }
    }
  };

  const dropParticipant = async (id) => {
    if (window.confirm(`This will permanently drop participant ${id} from the study and mark all of their measurements as invalid. This cannot be undone. Continue?`)) {
      if (isDemoMode) {
        mutateParticipants((current = []) => current.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p)), { revalidate: false });
        mutateMeasurementsData((current = []) => current.map((m) => (m.participant === id ? { ...m, isValid: false } : m)), { revalidate: false });
        triggerToast('Participant status updated. (Demo)');
      } else {
        try {
          await updateParticipantStatusAction({ id, status: 'Dropped', studyId: currentStudyId });
          await updateMeasurementValidityAction({ participantId: id, studyId: currentStudyId, isValid: false });

          mutateParticipants((current = []) => current.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p)), { revalidate: false });
          mutateMeasurementsData((current = []) => current.map((m) => (m.participant === id ? { ...m, isValid: false } : m)), { revalidate: false });
          triggerToast(`Participant ${id} dropped successfully. Their measurements were marked invalid.`);
        } catch (error) {
          console.error('Error updating participant status:', error);
          triggerToast('Failed to update participant: ' + error.message);
        }
      }
    }
  };

  // Completed is a manual, reversible toggle (Active <-> Completed) available
  // to any active user - there's no global rule for "how many measurements
  // counts as done", so the system never guesses; a person always decides.
  const toggleParticipantCompleted = async (id) => {
    const participant = participants.find((p) => p.id === id);
    if (!participant) return;

    const nextStatus = participant.status === 'Completed' ? 'Active' : 'Completed';

    if (isDemoMode) {
      mutateParticipants((current = []) => current.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)), { revalidate: false });
      triggerToast(`Participant marked ${nextStatus.toLowerCase()}. (Demo)`);
      return;
    }

    try {
      await updateParticipantStatusAction({ id, status: nextStatus, studyId: currentStudyId });

      mutateParticipants((current = []) => current.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)), { revalidate: false });
      triggerToast(`Participant ${id} marked ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      console.error('Error updating participant status:', error);
      triggerToast('Failed to update participant: ' + error.message);
    }
  };

  const logMeasurement = async ({ participantId, goniometer, aiModel, notes, testDate }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before logging a measurement.');
      return;
    }

    const nowObj = new Date();
    const formattedTimestamp = `${nowObj.getDate().toString().padStart(2, '0')}/${(
      nowObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${nowObj.getFullYear()} ${nowObj
        .getHours()
        .toString()
        .padStart(2, '0')}:${nowObj.getMinutes().toString().padStart(2, '0')}`;

    if (isDemoMode) {
      const simulatedId = measurementsData.length > 0
        ? Math.max(...measurementsData.map((m) => parseInt(m.id) || 0)) + 1
        : 1;

      const newMeasurement = {
        id: simulatedId,
        participant: participantId,
        goniometer: goniometer.includes('°') ? goniometer : `${goniometer}°`,
        aiModel: aiModel.includes('°') ? aiModel : `${aiModel}°`,
        notes,
        timestamp: formattedTimestamp,
        testDate: testDate || new Date().toISOString().split('T')[0],
        isValid: true
      };

      mutateMeasurementsData((current = []) => [newMeasurement, ...current], { revalidate: false });
      triggerToast('Measurement logged and saved! (Demo)');
    } else {
      try {
        const savedData = await createMeasurementAction({
          participantId,
          goniometer,
          aiModel,
          notes,
          testDate: testDate || new Date().toISOString().split('T')[0],
          studyId: currentStudyId
        });

        const newMeasurement = {
          id: savedData.id,
          participant: savedData.participant_id,
          goniometer: `${parseFloat(savedData.goniometer).toFixed(1)}°`,
          aiModel: `${parseFloat(savedData.ai_model).toFixed(1)}°`,
          notes: savedData.notes,
          timestamp: formattedTimestamp,
          testDate: savedData.test_date || savedData.testDate || testDate || new Date().toISOString().split('T')[0],
          isValid: true
        };

        mutateMeasurementsData((current = []) => [newMeasurement, ...current], { revalidate: false });
        triggerToast('Measurement saved directly to the database!');
      } catch (error) {
        console.error('Error logging measurement:', error);
        triggerToast('Failed to save measurement: ' + error.message);
      }
    }
  };

  // Valid -> Invalid is one-way and irreversible (like Drop): once invalid,
  // there is no UI path back to valid, so this is only ever called with the
  // measurement going from valid to invalid.
  const markMeasurementInvalid = async (id) => {
    if (isDemoMode) {
      mutateMeasurementsData((current = []) => current.map((m) => (m.id === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast('Measurement marked invalid. (Demo)');
      return;
    }

    try {
      await updateMeasurementValidityAction({ id, isValid: false });

      mutateMeasurementsData((current = []) => current.map((m) => (m.id === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast('Measurement marked invalid.');
    } catch (error) {
      console.error('Error updating measurement validity:', error);
      triggerToast('Failed to update measurement: ' + error.message);
    }
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [''];
    lines.push(row);
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; } // Escaped quote
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') { i++; }
        row = [''];
        lines.push(row);
      } else {
        row[row.length - 1] += c;
      }
    }
    const parsed = lines.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
    if (parsed.length <= 1) return [];
    const headers = parsed[0].map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    return parsed.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ? r[idx].trim().replace(/^["']|["']$/g, '') : '';
      });
      return obj;
    });
  };

  const processImportedRows = async (rows) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const newMeasurements = [];

    const activeParticipantIds = new Set(
      participants
        .filter((p) => p.status.toLowerCase() === 'active')
        .map((p) => p.id.toLowerCase())
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

      const dateToUse = new Date();

      const formattedTimestamp = `${dateToUse.getDate().toString().padStart(2, '0')}/${(
        dateToUse.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}/${dateToUse.getFullYear()} ${dateToUse
          .getHours()
          .toString()
          .padStart(2, '0')}:${dateToUse.getMinutes().toString().padStart(2, '0')}`;

      const testDateValue = (row.test_date || row.testDate || '').toString().trim();
      const payload = {
        participantId: pId,
        goniometer: parsedGoniometer,
        aiModel: parsedAiModel,
        notes,
        testDate: testDateValue || new Date().toISOString().split('T')[0],
        studyId: currentStudyId
      };

      try {
        if (isDemoMode) {
          const simulatedId = (measurementsData.length + newMeasurements.length) > 0
            ? Math.max(...measurementsData.map((m) => parseInt(m.id) || 0)) + newMeasurements.length + 1
            : newMeasurements.length + 1;

          newMeasurements.push({
            id: simulatedId,
            participant: pId,
            goniometer: `${parsedGoniometer.toFixed(1)}°`,
            aiModel: `${parsedAiModel.toFixed(1)}°`,
            notes,
            timestamp: formattedTimestamp,
            testDate: testDateValue || new Date().toISOString().split('T')[0],
            isValid: true
          });
          successCount++;
        } else {
          const savedData = await createMeasurementAction(payload);

          newMeasurements.push({
            id: savedData.id,
            participant: savedData.participant_id,
            goniometer: `${parseFloat(savedData.goniometer).toFixed(1)}°`,
            aiModel: `${parseFloat(savedData.ai_model).toFixed(1)}°`,
            notes: savedData.notes,
            timestamp: formattedTimestamp,
            testDate: savedData.test_date || savedData.testDate || testDateValue || new Date().toISOString().split('T')[0],
            isValid: true
          });
          successCount++;
        }
      } catch (err) {
        errorCount++;
        errors.push(`Row ${i + 2} (${pId}): Failed to save - ${err.message}`);
      }
    }

    if (newMeasurements.length > 0) {
      // Reverse array to ensure newest IDs are prepended first, maintaining descending order
      mutateMeasurementsData((current = []) => [...newMeasurements.reverse(), ...current], { revalidate: false });
    }

    return { successCount, errorCount, errors };
  };

  const handleFileUpload = async (file) => {
    setIsImporting(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let rows = [];
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (fileExt === 'json') {
          const text = e.target.result;
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } else if (fileExt === 'csv') {
          const text = e.target.result;
          rows = parseCSV(text);
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target.result);
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
      } catch (err) {
        console.error('File parsing error:', err);
        setImportSummary({
          successCount: 0,
          errorCount: 1,
          errors: [err.message]
        });
        triggerToast('Failed to import file: ' + err.message);
      } finally {
        setIsImporting(false);
      }
    };

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const value = {
    isLoading,
    studies,
    currentStudyId,
    currentStudy,
    switchStudy,
    addStudy,
    deleteStudy,
    updateRecruitmentGoal,
    participants,
    measurements,
    addParticipant,
    dropParticipant,
    toggleParticipantCompleted,
    logMeasurement,
    markMeasurementInvalid,
    isImporting,
    importSummary,
    onFileUpload: handleFileUpload,
    clearImportSummary: () => setImportSummary(null),
    toastMessage,
    showToast,
    hideToast: () => setShowToast(false),
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function StudyProvider({ children, initialStudies, initialCurrentStudyId, initialParticipants, initialMeasurements }) {
  // Seeds SWR's cache by exact key, so only the key that was actually
  // resolved server-side gets fallback data - switching to a study that
  // wasn't the initial one just triggers a normal client fetch (no risk of
  // briefly showing the wrong study's data under a mismatched key).
  const fallback = {};
  if (initialStudies) fallback[STUDIES_KEY] = initialStudies;
  if (initialCurrentStudyId) {
    fallback[participantsKey(initialCurrentStudyId)] = initialParticipants ?? [];
    fallback[measurementsKey(initialCurrentStudyId)] = initialMeasurements ?? [];
  }

  return (
    <SWRConfig value={{ fallback }}>
      <StudyProviderInner initialCurrentStudyId={initialCurrentStudyId}>
        {children}
      </StudyProviderInner>
    </SWRConfig>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}
