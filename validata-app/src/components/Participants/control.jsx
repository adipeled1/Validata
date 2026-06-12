import { useState } from 'react';
import ParticipantsDisplay from './display';

// Controller component manages local state and acts as the entry point
const ParticipantsControl = ({ participants, onAddParticipant, onSuspendParticipant }) => {
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [healthStatus, setHealthStatus] = useState('Healthy');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddParticipant({ consent, age, gender, healthStatus });
    setConsent(false); // Reset form
    setAge('');
    setGender('Male');
    setHealthStatus('Healthy');
  };

  return (
    <ParticipantsDisplay
      participants={participants}
      consent={consent}
      onConsentChange={setConsent}
      age={age}
      onAgeChange={setAge}
      gender={gender}
      onGenderChange={setGender}
      healthStatus={healthStatus}
      onHealthStatusChange={setHealthStatus}
      onSubmit={handleSubmit}
      onSuspend={onSuspendParticipant}
    />
  );
};

export default ParticipantsControl;
