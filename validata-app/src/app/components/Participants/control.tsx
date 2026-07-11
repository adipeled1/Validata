import { useState } from 'react';
import ParticipantsDisplay from './display';
import ConfirmWithReasonModal from '../common/ConfirmWithReasonModal';
import { formatDateForDisplay, getTodayDateString, countRecruitedParticipants } from './service';
import { hasRole, EDIT_ROLES } from '../../../lib/permissions';
import type { CreateConsentRecordInput } from '../Consent/service';

interface ConsentVersionEntry { id: number; version: string; }
interface ConsentRecordEntry { id: string; participant_id: string; form_version_id: number; method: string; copy_delivered: boolean; witnessed_by: string | null; notes: string | null; created_at: string; }

interface ParticipantsControlProps {
  participants: any[];
  onAddParticipant: (data: { age: string; gender: string; healthStatus: string; enrollmentDate: string }) => Promise<string | undefined>;
  // ICH E6(R3) COR-01: reason is now required so the drop is justified and
  // captured in the audit trail.
  onDropParticipant: (id: string, reason: string) => void;
  onToggleParticipantCompleted: (id: string) => void;
  recruitmentGoal: number | null;
  onUpdateRecruitmentGoal: (goal: string) => void;
  userRole: string;
  consentVersions: ConsentVersionEntry[];
  consentRecords: ConsentRecordEntry[];
  onRecordConsent: (input: Omit<CreateConsentRecordInput, 'studyId' | 'isDemoMode' | 'currentUserEmail'>) => Promise<void>;
}

const ParticipantsControl = ({
  participants,
  onAddParticipant,
  onDropParticipant,
  onToggleParticipantCompleted,
  recruitmentGoal,
  onUpdateRecruitmentGoal,
  userRole,
  consentVersions,
  consentRecords,
  onRecordConsent,
}: ParticipantsControlProps) => {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [goalInput, setGoalInput] = useState('');

  // ICH E6(R3) COR-01: modal state — tracks which participant is pending drop
  const [pendingDropId, setPendingDropId] = useState<string | null>(null);

  const displayParticipants = participants.map((participant) => ({
    ...participant,
    enrollmentDateDisplay: formatDateForDisplay(participant.enrollmentDate || participant.enrollment_date),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Formal consent is tracked via consent_records (ICH E6(R3) CONSENT-01),
    // not on the participant row. Returning the new id lets the display
    // layer offer recording consent immediately, right after enrollment.
    const newId = await onAddParticipant({
      age,
      gender,
      healthStatus,
      enrollmentDate: getTodayDateString(),
    });
    setAge('');
    setGender('Male');
    setHealthStatus('Healthy');
    return newId;
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput) return;
    onUpdateRecruitmentGoal(goalInput);
    setGoalInput('');
  };

  // Open the reason modal instead of window.confirm (ICH E6(R3) COR-01)
  const handleDropParticipant = (id: string) => {
    setPendingDropId(id);
  };

  const handleDropConfirmed = (reason: string) => {
    if (pendingDropId) {
      onDropParticipant(pendingDropId, reason);
    }
    setPendingDropId(null);
  };

  return (
    <>
      {pendingDropId && (
        <ConfirmWithReasonModal
          title={`Drop Participant ${pendingDropId}`}
          body={`This will permanently drop participant ${pendingDropId} from the study and mark all of their measurements as invalid. This action is recorded in the audit trail.`}
          reasonLabel="Reason for dropping this participant"
          reasonRequired
          confirmLabel="Drop Participant"
          onConfirm={handleDropConfirmed}
          onCancel={() => setPendingDropId(null)}
        />
      )}

      <ParticipantsDisplay
        participants={displayParticipants}
        age={age}
        onAgeChange={setAge}
        gender={gender}
        onGenderChange={setGender}
        healthStatus={healthStatus}
        onHealthStatusChange={setHealthStatus}
        onSubmit={handleSubmit}
        onDrop={handleDropParticipant}
        onToggleCompleted={onToggleParticipantCompleted}
        recruitedCount={countRecruitedParticipants(participants)}
        recruitmentGoal={recruitmentGoal}
        isMentor={userRole === 'mentor' || userRole === 'admin'}
        goalInput={goalInput}
        onGoalInputChange={setGoalInput}
        onGoalSubmit={handleGoalSubmit}
        consentVersions={consentVersions}
        consentRecords={consentRecords}
        canRecordConsent={hasRole(userRole, EDIT_ROLES)}
        onRecordConsent={onRecordConsent}
      />
    </>
  );
};

export default ParticipantsControl;
