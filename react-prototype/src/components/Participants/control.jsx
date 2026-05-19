import React, { useState } from 'react';
import ParticipantsDisplay from './display';

// Controller component manages local state and acts as the entry point
const ParticipantsControl = ({ participants, onAddParticipant, onSuspendParticipant }) => {
  const [consent, setConsent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddParticipant(consent);
    setConsent(false); // Reset form
  };

  return (
    <ParticipantsDisplay
      participants={participants}
      consent={consent}
      onConsentChange={setConsent}
      onSubmit={handleSubmit}
      onSuspend={onSuspendParticipant}
    />
  );
};

export default ParticipantsControl;
