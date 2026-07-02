"use client";

import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Participants from '../../components/Participants/control';

export default function ParticipantsPage() {
  const { userRole } = useSession();
  const { participants, addParticipant, dropParticipant, toggleParticipantCompleted, currentStudy, updateRecruitmentGoal } = useStudy();

  return (
    <Participants
      participants={participants}
      onAddParticipant={addParticipant}
      onDropParticipant={dropParticipant}
      onToggleParticipantCompleted={toggleParticipantCompleted}
      recruitmentGoal={currentStudy?.recruitment_goal ?? null}
      onUpdateRecruitmentGoal={updateRecruitmentGoal}
      userRole={userRole}
    />
  );
}
