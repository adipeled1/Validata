import { useState } from 'react';
import ParticipantsDisplay from './display';
import ConfirmWithReasonModal from '../common/ConfirmWithReasonModal';
import { formatDateForDisplay, getTodayDateString, countRecruitedParticipants } from './service';

interface ParticipantsControlProps {
  participants: any[];
  onAddParticipant: (data: { consent: boolean; age: string; gender: string; healthStatus: string; enrollmentDate: string }) => void;
  // ICH E6(R3) COR-01: reason is now required so the drop is justified and
  // captured in the audit trail.
  onDropParticipant: (id: string, reason: string) => void;
  onToggleParticipantCompleted: (id: string) => void;
  recruitmentGoal: number | null;
  onUpdateRecruitmentGoal: (goal: string) => void;
  userRole: string;
}

const ParticipantsControl = ({
  participants,
  onAddParticipant,
  onDropParticipant,
  onToggleParticipantCompleted,
  recruitmentGoal,
  onUpdateRecruitmentGoal,
  userRole
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddParticipant({
      consent: true, // formal consent is tracked via consent_records (ICH E6(R3) CONSENT-01)
      age,
      gender,
      healthStatus,
      enrollmentDate: getTodayDateString(),
    });
    setAge('');
    setGender('Male');
    setHealthStatus('Healthy');
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
        isMentor={userRole === 'mentor' || userRole === 'sponsor_admin'}
        goalInput={goalInput}
        onGoalInputChange={setGoalInput}
        onGoalSubmit={handleGoalSubmit}
      />
    </>
  );
};

export default ParticipantsControl;
