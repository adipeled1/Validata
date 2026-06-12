import { useState, useRef } from 'react';
import DataCollectionDisplay from './display';
import { getActiveParticipants } from './service';

// Controller component manages local state and input references
const DataCollectionControl = ({ participants, onLogMeasurement, onFileUpload }) => {
  const [participantId, setParticipantId] = useState('');
  const [goniometer, setGoniometer] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Use service to filter participants
  const activeParticipants = getActiveParticipants(participants);

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!participantId) return;

    onLogMeasurement({ participantId, goniometer, aiModel, notes });
    setParticipantId('');
    setGoniometer('');
    setAiModel('');
    setNotes('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file.name);
      onFileUpload(file);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = null; 
    }
  };

  return (
    <DataCollectionDisplay
      activeParticipants={activeParticipants}
      participantId={participantId}
      onParticipantChange={setParticipantId}
      goniometer={goniometer}
      onGoniometerChange={setGoniometer}
      aiModel={aiModel}
      onAiModelChange={setAiModel}
      notes={notes}
      onNotesChange={setNotes}
      onSubmitLog={handleLogSubmit}
      uploadedFile={uploadedFile}
      onFileChange={handleFileChange}
      fileInputRef={fileInputRef}
    />
  );
};

export default DataCollectionControl;
