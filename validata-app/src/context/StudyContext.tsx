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
import { useFileImport, type ImportSummary } from '../hooks/useFileImport';

interface StudyContextValue {
  isLoading: boolean;
  studies: any[];
  currentStudyId: string | null;
  currentStudy: any;
  switchStudy: (studyId: string) => void;
  addStudy: (name: string, goal: string | number) => Promise<void>;
  deleteStudy: (id: string) => Promise<void>;
  updateRecruitmentGoal: (newGoal: string | number) => Promise<void>;
  participants: any[];
  measurements: any[];
  addParticipant: (data: { consent: boolean; age: string; gender: string; healthStatus: string; enrollmentDate: string }) => Promise<void>;
  // ICH E6(R3) COR-01: reason is required when dropping a participant so the
  // status change is justified and traceable in the audit trail.
  dropParticipant: (id: string, reason: string) => Promise<void>;
  toggleParticipantCompleted: (id: string) => Promise<void>;
  logMeasurement: (data: { participantId: string; goniometer: string; aiModel: string; notes: string; testDate: string }) => Promise<void>;
  // ICH E6(R3) COR-01: reason is passed through to the audit trail.
  markMeasurementInvalid: (id: any, reason?: string) => Promise<void>;
  isImporting: boolean;
  importSummary: ImportSummary | null;
  onFileUpload: (file: File) => void;
  clearImportSummary: () => void;
  toastMessage: string;
  showToast: boolean;
  hideToast: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const STUDIES_KEY = 'studies';
const participantsKey = (studyId: string | null) => (studyId ? `participants:${studyId}` : null);
const measurementsKey = (studyId: string | null) => (studyId ? `measurements:${studyId}` : null);

async function fetchStudies(isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) return (mockData as any).studies;

  const res = await fetch('/api/studies');
  if (!res.ok) throw new Error('Failed to fetch studies');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function fetchParticipants(studyId: string, isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) {
    return mapParticipants((mockData as any).participants.filter((p: any) => p.study_id === studyId));
  }

  const res = await fetch(`/api/participants?study_id=${studyId}`);
  if (!res.ok) throw new Error('Failed to fetch participants');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return mapParticipants(data);
}

async function fetchMeasurements(studyId: string, isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) {
    return mapMeasurements((mockData as any).measurements.filter((m: any) => m.study_id === studyId));
  }

  const res = await fetch(`/api/measurements?study_id=${studyId}`);
  if (!res.ok) throw new Error('Failed to fetch measurements');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return mapMeasurements(data);
}

// Studies, participants, measurements, and every CRUD handler that operates
// on them — shared across every dashboard route via context.
//
// Initial data comes from (dashboard)/layout.tsx (a Server Component) via the
// `initial*` props, seeded into SWR's cache through the `fallback` map below
// so the very first render already has data — no client-side fetch waterfall.
function StudyProviderInner({ children, initialCurrentStudyId }: { children: React.ReactNode; initialCurrentStudyId: string | null }) {
  const { isLoading: isSessionLoading, isDemoMode, userStatus } = useSession();
  const isActive = !isSessionLoading && userStatus === 'active';

  const [currentStudyId, setCurrentStudyId] = useState<string | null>(initialCurrentStudyId ?? null);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const { data: studies = [], mutate: mutateStudies, isLoading: studiesLoading } = useSWR(
    isActive ? STUDIES_KEY : null,
    () => fetchStudies(isDemoMode)
  );

  const { data: participants = [], mutate: mutateParticipants, isLoading: participantsLoading } = useSWR(
    isActive ? participantsKey(currentStudyId) : null,
    () => fetchParticipants(currentStudyId!, isDemoMode)
  );

  const { data: measurementsData = [], mutate: mutateMeasurementsData, isLoading: measurementsLoading } = useSWR(
    isActive ? measurementsKey(currentStudyId) : null,
    () => fetchMeasurements(currentStudyId!, isDemoMode)
  );

  const measurements = useMemo(
    () => withEnrollmentDates(measurementsData, participants),
    [measurementsData, participants]
  );

  const { isImporting, importSummary, handleFileUpload, clearImportSummary } = useFileImport({
    participants,
    currentStudyId,
    mutateMeasurementsData,
    triggerToast,
  });

  const isLoading = studiesLoading || (!!currentStudyId && (participantsLoading || measurementsLoading));
  const currentStudy = studies.find((s: any) => s.id === currentStudyId) || null;

  const switchStudy = (studyId: string) => {
    setCurrentStudyId(studyId);
    setCurrentStudyAction(studyId).catch((error) => {
      console.warn('Failed to persist study selection:', error);
    });
  };

  // fable_system_review §4.2: the demo branch used to build its own study
  // object inline, duplicating (and risking drifting from) the shape
  // createStudy's own isDemo branch already returns. Studies aren't run
  // through a mapper (they're used in raw DB shape directly), so this
  // wasn't a shape-mismatch bug like participants/measurements, but it was
  // still the same "same decision made twice" duplication - now both modes
  // just use whatever createStudyAction returns.
  const addStudy = async (name: string, goal: string | number) => {
    const recruitmentGoal = parseInt(String(goal)) || 50;

    try {
      const data = await createStudyAction({ name, recruitmentGoal });

      mutateStudies((current: any[] = []) => [...current, data], { revalidate: false });
      switchStudy(data.id);
      triggerToast(isDemoMode ? `Study "${name}" created. (Demo)` : `Study "${name}" created.`);
    } catch (error: any) {
      console.error('Error creating study:', error);
      triggerToast('Failed to create study: ' + error.message);
    }
  };

  // Deleting a study permanently deletes all of its participants and
  // measurements too — confirmation lives in StudyManagement.jsx,
  // this handler just performs the (already-confirmed) deletion.
  const deleteStudy = async (id: string) => {
    const study = studies.find((s: any) => s.id === id);
    if (!study) return;

    const remaining = studies.filter((s: any) => s.id !== id);
    const wasCurrent = currentStudyId === id;
    const nextStudyId = wasCurrent ? (remaining.length > 0 ? remaining[0].id : null) : currentStudyId;

    if (isDemoMode) {
      mutateStudies(remaining, { revalidate: false });
      if (wasCurrent && nextStudyId) switchStudy(nextStudyId);
      triggerToast(`Study "${study.name}" deleted. (Demo)`);
      return;
    }

    try {
      await deleteStudyAction(id);

      mutateStudies(remaining, { revalidate: false });
      if (wasCurrent && nextStudyId) switchStudy(nextStudyId);
      triggerToast(`Study "${study.name}" deleted.`);
    } catch (error: any) {
      console.error('Error deleting study:', error);
      triggerToast('Failed to delete study: ' + error.message);
    }
  };

  const updateRecruitmentGoal = async (newGoal: string | number) => {
    const goal = parseInt(String(newGoal));
    if (isNaN(goal) || goal < 1) {
      triggerToast('Recruitment goal must be a positive number.');
      return;
    }

    if (isDemoMode) {
      mutateStudies(
        (current: any[] = []) => current.map((s) => (s.id === currentStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated. (Demo)');
      return;
    }

    try {
      await updateStudyGoalAction({ id: currentStudyId, recruitmentGoal: goal });

      mutateStudies(
        (current: any[] = []) => current.map((s) => (s.id === currentStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated.');
    } catch (error: any) {
      console.error('Error updating recruitment goal:', error);
      triggerToast('Failed to update recruitment goal: ' + error.message);
    }
  };

  // fable_system_review §4.2: this used to hand-build a participant object
  // locally for demo mode (a shape independent of, and prone to drifting
  // from, what mapParticipants/the live branch produce) instead of going
  // through the repository at all. Now both demo and live go through the
  // same createParticipantAction -> repository -> mapParticipants path -
  // the repository's own isDemo branch (in participants.ts) is the only
  // place demo/live diverge, and it returns the same raw-DB-shaped object
  // either way, so there is exactly one mapping step for both.
  const addParticipant = async ({ consent, age, gender, healthStatus, enrollmentDate }: { consent: boolean; age: string; gender: string; healthStatus: string; enrollmentDate: string }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before adding participants.');
      return;
    }

    try {
      const savedData = await createParticipantAction({
        consent,
        age: parseInt(age) || null,
        gender,
        healthStatus,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
        studyId: currentStudyId
      });

      const [newParticipant] = mapParticipants([savedData]);

      mutateParticipants((current: any[] = []) => [newParticipant, ...current], { revalidate: false });
      triggerToast(isDemoMode
        ? `Participant ${savedData.id} registered successfully! (Demo)`
        : `Participant ${savedData.id} registered and saved in database!`);
    } catch (error: any) {
      console.error('Error adding participant:', error);
      triggerToast('Failed to save participant: ' + error.message);
    }
  };

  // Confirmation lives in the calling component (Participants/control.tsx),
  // not here — the data layer should not own UI dialogs.
  // ICH E6(R3) COR-01: confirmation and reason capture happen in the UI
  // (ConfirmWithReasonModal) before this is called — reason is then passed
  // through to the repository and audit trigger.
  const dropParticipant = async (id: string, reason: string) => {
    if (isDemoMode) {
      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p)), { revalidate: false });
      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.participant === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast('Participant status updated. (Demo)');
      return;
    }

    if (!currentStudyId) {
      triggerToast('No active study selected.');
      return;
    }

    try {
      await updateParticipantStatusAction({ id, status: 'Dropped', studyId: currentStudyId, reason });
      await updateMeasurementValidityAction({
        participantId: id,
        studyId: currentStudyId,
        isValid: false,
        reason: `Participant dropped: ${reason}`,
      });

      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p)), { revalidate: false });
      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.participant === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast(`Participant ${id} dropped. Reason recorded in audit trail.`);
    } catch (error: any) {
      console.error('Error updating participant status:', error);
      triggerToast('Failed to update participant: ' + error.message);
    }
  };

  // Completed is a manual, reversible toggle (Active <-> Completed) available
  // to any active user — there's no global rule for "how many measurements
  // counts as done", so the system never guesses; a person always decides.
  const toggleParticipantCompleted = async (id: string) => {
    const participant = participants.find((p: any) => p.id === id);
    if (!participant) return;

    const nextStatus = participant.status === 'Completed' ? 'Active' : 'Completed';

    if (isDemoMode) {
      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)), { revalidate: false });
      triggerToast(`Participant marked ${nextStatus.toLowerCase()}. (Demo)`);
      return;
    }

    try {
      await updateParticipantStatusAction({ id, status: nextStatus, studyId: currentStudyId });

      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)), { revalidate: false });
      triggerToast(`Participant ${id} marked ${nextStatus.toLowerCase()}.`);
    } catch (error: any) {
      console.error('Error updating participant status:', error);
      triggerToast('Failed to update participant: ' + error.message);
    }
  };

  // fable_system_review §4.2: this used to hand-build a measurement object
  // locally for demo mode (a THIRD independent shape, alongside the one
  // mapMeasurements produced for lists and the one this same function
  // hand-built for the live-mode optimistic update) - the exact
  // "StudyContext.logMeasurement builds yet another shape" the review flagged.
  // It also formatted the optimistic timestamp in the client's local
  // timezone via a bespoke formatTimestamp() helper, while every other
  // rendering of a timestamp goes through mapMeasurements' UTC formatting -
  // a second, subtler drift (the optimistic row would show a different time
  // than the same row after SWR revalidates). Both demo and live now go
  // through the same createMeasurementAction -> repository -> mapMeasurements
  // path, so there is exactly one place that shapes a measurement for display.
  const logMeasurement = async ({ participantId, goniometer, aiModel, notes, testDate }: { participantId: string; goniometer: string; aiModel: string; notes: string; testDate: string }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before logging a measurement.');
      return;
    }

    try {
      const savedData = await createMeasurementAction({
        participantId,
        goniometer,
        aiModel,
        notes,
        testDate: testDate || new Date().toISOString().split('T')[0],
        studyId: currentStudyId
      });

      const [newMeasurement] = mapMeasurements([savedData]);

      mutateMeasurementsData((current: any[] = []) => [newMeasurement, ...current], { revalidate: false });
      triggerToast(isDemoMode ? 'Measurement logged and saved! (Demo)' : 'Measurement saved directly to the database!');
    } catch (error: any) {
      console.error('Error logging measurement:', error);
      triggerToast('Failed to save measurement: ' + error.message);
    }
  };

  // Valid -> Invalid is one-way and irreversible (like Drop): once invalid,
  // there is no UI path back to valid, so this is only ever called with the
  // measurement going from valid to invalid.
  // ICH E6(R3) COR-01: reason flows to the audit trigger via validity_reason column.
  const markMeasurementInvalid = async (id: any, reason?: string) => {
    if (!currentStudyId) {
      triggerToast('No active study selected.');
      return;
    }

    if (isDemoMode) {
      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.id === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast('Measurement marked invalid. (Demo)');
      return;
    }

    try {
      await updateMeasurementValidityAction({ id, isValid: false, studyId: currentStudyId, reason });

      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.id === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast('Measurement marked invalid. Reason recorded in audit trail.');
    } catch (error: any) {
      console.error('Error updating measurement validity:', error);
      triggerToast('Failed to update measurement: ' + error.message);
    }
  };

  const value: StudyContextValue = {
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
    clearImportSummary,
    toastMessage,
    showToast,
    hideToast: () => setShowToast(false),
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

interface StudyProviderProps {
  children: React.ReactNode;
  initialStudies?: any[];
  initialCurrentStudyId?: string | null;
  initialParticipants?: any[];
  initialMeasurements?: any[];
}

export function StudyProvider({ children, initialStudies, initialCurrentStudyId, initialParticipants, initialMeasurements }: StudyProviderProps) {
  // Seeds SWR's cache by exact key, so only the key that was actually
  // resolved server-side gets fallback data — switching to a study that
  // wasn't the initial one just triggers a normal client fetch (no risk of
  // briefly showing the wrong study's data under a mismatched key).
  const fallback: Record<string, any> = {};
  if (initialStudies) fallback[STUDIES_KEY] = initialStudies;
  if (initialCurrentStudyId) {
    fallback[participantsKey(initialCurrentStudyId)!] = initialParticipants ?? [];
    fallback[measurementsKey(initialCurrentStudyId)!] = initialMeasurements ?? [];
  }

  return (
    <SWRConfig value={{ fallback }}>
      <StudyProviderInner initialCurrentStudyId={initialCurrentStudyId ?? null}>
        {children}
      </StudyProviderInner>
    </SWRConfig>
  );
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}
