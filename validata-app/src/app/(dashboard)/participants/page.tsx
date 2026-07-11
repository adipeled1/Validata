"use client";

import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Participants from '../../components/Participants/control';
import { createConsentRecord, fetchConsent, type CreateConsentRecordInput } from '../../components/Consent/service';

export default function ParticipantsPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();
  const { participants, addParticipant, dropParticipant, toggleParticipantCompleted, currentStudy, currentStudyId, updateRecruitmentGoal } = useStudy();

  // Same shared consent data source as the Consent Records screen, so a
  // consent logged from either place shows up in both without a schema
  // change - see Consent/service.ts.
  const swrKey = currentStudyId ? `consent:${currentStudyId}` : null;
  const { data: consentData, mutate: mutateConsent } = useSWR(
    swrKey,
    () => fetchConsent(currentStudyId!, isDemoMode)
  );
  const consentVersions = consentData?.versions ?? [];
  const consentRecords = consentData?.records ?? [];

  const handleRecordConsent = async (
    input: Omit<CreateConsentRecordInput, 'studyId' | 'isDemoMode' | 'currentUserEmail'>
  ) => {
    if (!currentStudyId) return;
    await createConsentRecord({ ...input, studyId: currentStudyId, isDemoMode, currentUserEmail });
    mutateConsent();
  };

  return (
    <Participants
      participants={participants}
      onAddParticipant={addParticipant}
      onDropParticipant={dropParticipant}
      onToggleParticipantCompleted={toggleParticipantCompleted}
      recruitmentGoal={currentStudy?.recruitment_goal ?? null}
      onUpdateRecruitmentGoal={updateRecruitmentGoal}
      userRole={userRole}
      consentVersions={consentVersions}
      consentRecords={consentRecords}
      onRecordConsent={handleRecordConsent}
    />
  );
}
