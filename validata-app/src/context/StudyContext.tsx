"use client";

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import useSWR, { SWRConfig } from 'swr';
import { mapParticipants, mapMeasurements, withEnrollmentDates } from '../lib/mappers';
import { useSession } from './SessionContext';
import { setCurrentStudyAction } from '../app/actions/session';
import { createParticipantAction, updateParticipantStatusAction } from '../app/actions/participants';
import { createMeasurementAction, updateMeasurementValidityAction } from '../app/actions/measurements';
import { createStudyAction, deleteStudyAction, updateStudyGoalAction } from '../app/actions/studies';
import { useFileImport, type ImportSummary } from '../hooks/useFileImport';
import * as clientDemoStore from '../lib/clientDemoStore';

interface StudyContextValue {
  isLoading: boolean;
  studies: any[];
  currentStudyId: string | null;
  currentStudy: any;
  switchStudy: (studyId: string) => void;
  addStudy: (name: string, goal: string | number) => Promise<void>;
  deleteStudy: (id: string) => Promise<void>;
  // studyId defaults to currentStudyId (the active workspace) - pass it
  // explicitly to update a different study (e.g. Study Management's own
  // per-study goal editor, which lets you edit any study in the list, not
  // just the active one).
  updateRecruitmentGoal: (newGoal: string | number, studyId?: string) => Promise<void>;
  participants: any[];
  measurements: any[];
  // Returns the newly created participant's id (or undefined if the create
  // failed / was skipped) so the caller can immediately offer recording
  // consent for them.
  addParticipant: (data: { age: string; gender: string; healthStatus: string; enrollmentDate: string }) => Promise<string | undefined>;
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

// Demo mode reads from clientDemoStore (sessionStorage, this browser tab
// only) - seeded once from mockData.json but from then on the sole source of
// truth for demo-mode studies/participants/measurements, so anything added
// or changed actually persists for the tab's lifetime instead of being
// silently reverted to the static seed data on the next refresh or SWR
// revalidation (e.g. the tab regaining focus). No network round trip either
// way, and no reliance on a server-side store that wouldn't survive a Vercel
// serverless invocation boundary anyway. Live mode is unaffected and still
// goes through the API/Supabase.
async function fetchStudies(isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) {
    return clientDemoStore.getStudies();
  }

  const res = await fetch('/api/studies');
  if (!res.ok) throw new Error('Failed to fetch studies');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function fetchParticipants(studyId: string, isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) {
    return mapParticipants(clientDemoStore.getParticipants(studyId));
  }

  const res = await fetch(`/api/participants?study_id=${studyId}`);
  if (!res.ok) throw new Error('Failed to fetch participants');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return mapParticipants(data);
}

async function fetchMeasurements(studyId: string, isDemoMode: boolean): Promise<any[]> {
  if (isDemoMode) {
    return mapMeasurements(clientDemoStore.getMeasurements(studyId));
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
  const { isLoading: isSessionLoading, isDemoMode, userStatus, currentUserEmail } = useSession();
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
    isDemoMode,
    currentUserEmail,
  });

  const isLoading = studiesLoading || (!!currentStudyId && (participantsLoading || measurementsLoading));
  const currentStudy = studies.find((s: any) => s.id === currentStudyId) || null;

  const switchStudy = (studyId: string) => {
    setCurrentStudyId(studyId);
    setCurrentStudyAction(studyId).catch((error) => {
      console.warn('Failed to persist study selection:', error);
    });
  };

  // Demo mode bypasses the Server Action entirely and writes straight to
  // clientDemoStore (sessionStorage) - the same pattern every other demo
  // entity in this file already follows (signatures, queries, delegations,
  // lock state, user overrides), so a created study survives a refresh
  // instead of only living in this render's SWR cache.
  const addStudy = async (name: string, goal: string | number) => {
    const recruitmentGoal = parseInt(String(goal)) || 50;

    try {
      const data = isDemoMode
        ? clientDemoStore.addStudy({ name, recruitmentGoal, actorEmail: currentUserEmail })
        : await createStudyAction({ name, recruitmentGoal });

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
      clientDemoStore.deleteStudy({ studyId: id, studyName: study.name, actorEmail: currentUserEmail });
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

  const updateRecruitmentGoal = async (newGoal: string | number, studyId?: string) => {
    const targetStudyId = studyId ?? currentStudyId;
    const goal = parseInt(String(newGoal));
    if (isNaN(goal) || goal < 1) {
      triggerToast('Recruitment goal must be a positive number.');
      return;
    }
    if (!targetStudyId) return;

    if (isDemoMode) {
      clientDemoStore.updateStudyGoal({ studyId: targetStudyId, recruitmentGoal: goal, actorEmail: currentUserEmail });
      mutateStudies(
        (current: any[] = []) => current.map((s) => (s.id === targetStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated. (Demo)');
      return;
    }

    try {
      await updateStudyGoalAction({ id: targetStudyId, recruitmentGoal: goal });

      mutateStudies(
        (current: any[] = []) => current.map((s) => (s.id === targetStudyId ? { ...s, recruitment_goal: goal } : s)),
        { revalidate: false }
      );
      triggerToast('Recruitment goal updated.');
    } catch (error: any) {
      console.error('Error updating recruitment goal:', error);
      triggerToast('Failed to update recruitment goal: ' + error.message);
    }
  };

  // Demo mode bypasses the Server Action/repository entirely and writes
  // straight to clientDemoStore (sessionStorage) - the same pattern every
  // other demo entity in this file already follows, so an added participant
  // survives a refresh instead of only living in this render's SWR cache.
  const addParticipant = async ({ age, gender, healthStatus, enrollmentDate }: { age: string; gender: string; healthStatus: string; enrollmentDate: string }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before adding participants.');
      return;
    }

    try {
      const savedData = isDemoMode
        ? clientDemoStore.addParticipant({
          studyId: currentStudyId,
          age: parseInt(age) || null,
          gender,
          healthStatus,
          enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
          actorEmail: currentUserEmail,
        })
        : await createParticipantAction({
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
      return newParticipant.id;
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
    if (!currentStudyId) {
      triggerToast('No active study selected.');
      return;
    }

    try {
      if (isDemoMode) {
        clientDemoStore.updateParticipantStatus({ id, studyId: currentStudyId, status: 'Dropped', reason, actorEmail: currentUserEmail });
        clientDemoStore.invalidateMeasurementsForParticipant({ participantId: id, studyId: currentStudyId, reason, actorEmail: currentUserEmail });
      } else {
        await updateParticipantStatusAction({ id, status: 'Dropped', studyId: currentStudyId, reason });
        await updateMeasurementValidityAction({
          participantId: id,
          studyId: currentStudyId,
          reason: `Participant dropped: ${reason}`,
        });
      }

      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p)), { revalidate: false });
      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.participant === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast(isDemoMode
        ? `Participant ${id} dropped. Reason recorded in audit trail. (Demo)`
        : `Participant ${id} dropped. Reason recorded in audit trail.`);
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

    try {
      if (isDemoMode) {
        clientDemoStore.updateParticipantStatus({ id, studyId: currentStudyId!, status: nextStatus, actorEmail: currentUserEmail });
      } else {
        await updateParticipantStatusAction({ id, status: nextStatus, studyId: currentStudyId });
      }

      mutateParticipants((current: any[] = []) => current.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)), { revalidate: false });
      triggerToast(isDemoMode
        ? `Participant ${id} marked ${nextStatus.toLowerCase()}. (Demo)`
        : `Participant ${id} marked ${nextStatus.toLowerCase()}.`);
    } catch (error: any) {
      console.error('Error updating participant status:', error);
      triggerToast('Failed to update participant: ' + error.message);
    }
  };

  // Both demo and live go through the createMeasurementAction/clientDemoStore
  // path then mapMeasurements, so there is exactly one place that shapes a
  // measurement for display either way. In particular, timestamps always go
  // through mapMeasurements' UTC formatting, so an optimistic row and the
  // same row after SWR revalidates never show a different time due to
  // local-timezone formatting.
  const logMeasurement = async ({ participantId, goniometer, aiModel, notes, testDate }: { participantId: string; goniometer: string; aiModel: string; notes: string; testDate: string }) => {
    if (!currentStudyId) {
      triggerToast('Select or create a study before logging a measurement.');
      return;
    }

    try {
      const savedData = isDemoMode
        ? clientDemoStore.addMeasurement({
          studyId: currentStudyId,
          participantId,
          goniometer: parseFloat(goniometer.replace('°', '')) || 0.0,
          aiModel: parseFloat(aiModel.replace('°', '')) || 0.0,
          notes,
          testDate: testDate || new Date().toISOString().split('T')[0],
          actorEmail: currentUserEmail,
        })
        : await createMeasurementAction({
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

    try {
      if (isDemoMode) {
        clientDemoStore.markMeasurementInvalid({ id, studyId: currentStudyId, reason, actorEmail: currentUserEmail });
      } else {
        await updateMeasurementValidityAction({ id, studyId: currentStudyId, reason });
      }

      mutateMeasurementsData((current: any[] = []) => current.map((m) => (m.id === id ? { ...m, isValid: false } : m)), { revalidate: false });
      triggerToast(isDemoMode
        ? 'Measurement marked invalid. Reason recorded in audit trail. (Demo)'
        : 'Measurement marked invalid. Reason recorded in audit trail.');
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
