"use client";

import { useStudy } from '../../../context/StudyContext';
import Results from '../../components/Results/control';

export default function ResultsPage() {
  const { participants, measurements, markMeasurementInvalid } = useStudy();
  return <Results participants={participants} measurements={measurements} onMarkInvalid={markMeasurementInvalid} />;
}
