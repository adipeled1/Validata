"use client";

import { useStudy } from '../../../context/StudyContext';
import ParticipantsView from '../../components/ParticipantsView/ParticipantsView';

export default function ParticipantsViewPage() {
  const { participants } = useStudy();
  return <ParticipantsView participants={participants} />;
}
