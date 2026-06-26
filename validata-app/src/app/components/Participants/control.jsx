import { useState } from 'react';
import ParticipantsDisplay from './display';
import { formatDateForDisplay, getTodayDateString } from './service';

// Controller component manages local state and acts as the entry point
const ParticipantsControl = ({ participants, onAddParticipant, onDropParticipant }) => {
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [healthStatus, setHealthStatus] = useState('Healthy');

  const displayParticipants = participants.map((participant) => ({
    ...participant,
    enrollmentDateDisplay: formatDateForDisplay(participant.enrollmentDate || participant.enrollment_date),
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddParticipant({
      consent,
      age,
      gender,
      healthStatus,
      enrollmentDate: getTodayDateString(),
    });
    setConsent(false); // Reset form
    setAge('');
    setGender('Male');
    setHealthStatus('Healthy');
  };

  return (
    <ParticipantsDisplay
      participants={displayParticipants}
      consent={consent}
      onConsentChange={setConsent}
      age={age}
      onAgeChange={setAge}
      gender={gender}
      onGenderChange={setGender}
      healthStatus={healthStatus}
      onHealthStatusChange={setHealthStatus}
      onSubmit={handleSubmit}
      onDrop={onDropParticipant}
    />
  );
};

export default ParticipantsControl;
