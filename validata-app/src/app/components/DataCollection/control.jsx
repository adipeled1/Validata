import { useState, useRef } from 'react';
import DataCollectionDisplay from './display';
import { getActiveParticipants, getTodayDateString } from './service';

// Controller component manages local state and input references
const DataCollectionControl = ({ 
  participants, 
  onLogMeasurement, 
  onFileUpload,
  isImporting,
  importSummary,
  onClearImportSummary
}) => {
  const [participantId, setParticipantId] = useState('');
  const [goniometer, setGoniometer] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [notes, setNotes] = useState('');
  const [testDate, setTestDate] = useState(getTodayDateString());
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Use service to filter participants
  const activeParticipants = getActiveParticipants(participants);

  const handleFile = (file) => {
    setUploadedFile(file.name);
    onFileUpload(file);
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!participantId) return;

    onLogMeasurement({ participantId, goniometer, aiModel, notes, testDate });
    setParticipantId('');
    setGoniometer('');
    setAiModel('');
    setNotes('');
    setTestDate(getTodayDateString());
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = null;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSummary = () => {
    setUploadedFile(null);
    onClearImportSummary();
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
      testDate={testDate}
      onTestDateChange={setTestDate}
      onSubmitLog={handleLogSubmit}
      uploadedFile={uploadedFile}
      onFileChange={handleFileChange}
      fileInputRef={fileInputRef}
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      isImporting={isImporting}
      importSummary={importSummary}
      onClearImportSummary={handleClearSummary}
    />
  );
};

export default DataCollectionControl;
