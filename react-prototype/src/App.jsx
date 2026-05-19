import { useState } from 'react';
import Sidebar from './components/Sidebar/control';
import Participants from './components/Participants/control';
import ParticipantsView from './components/ParticipantsView/control';
import DataCollection from './components/DataCollection/control';
import Analysis from './components/Analysis/control';
import Toast from './components/Toast/control';
import mockData from './mockData.json';

function App() {
  const [currentView, setCurrentView] = useState('participants');
  const [participants, setParticipants] = useState(mockData.participants);
  const [measurements, setMeasurements] = useState(mockData.measurements);
  const [nextId, setNextId] = useState(1009); // Mock next ID

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Participant Handlers
  const handleAddParticipant = (consent) => {
    const newId = `P-${nextId}`;
    setNextId((prev) => prev + 1);

    // Generate random demographics for the prototype
    const randomAge = Math.floor(Math.random() * 50) + 18; // Age between 18 and 67
    const randomGender = Math.random() > 0.5 ? 'Male' : 'Female';
    const randomHealth = Math.random() > 0.7 ? 'Sick' : 'Healthy';

    const newParticipant = { 
      id: newId, 
      consent, 
      status: 'Active',
      age: randomAge,
      gender: randomGender,
      healthStatus: randomHealth
    };
    setParticipants([...participants, newParticipant]);
    triggerToast(`Participant ${newId} registered successfully!`);
  };

  const handleSuspendParticipant = (id) => {
    if (window.confirm(`Are you sure you want to suspend participant ${id}?`)) {
      setParticipants(
        participants.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p))
      );
      triggerToast('Participant status updated.');
    }
  };

  // Measurement Handlers
  const handleLogMeasurement = ({ participantId, goniometer, aiModel, notes }) => {
    const nowObj = new Date();
    const timestamp = `${nowObj.getDate().toString().padStart(2, '0')}/${(
      nowObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${nowObj.getFullYear()} ${nowObj
      .getHours()
      .toString()
      .padStart(2, '0')}:${nowObj.getMinutes().toString().padStart(2, '0')}`;

    const newMeasurement = {
      participant: participantId,
      goniometer,
      aiModel,
      notes,
      timestamp,
    };

    setMeasurements([newMeasurement, ...measurements]);
    triggerToast('Measurement logged and saved!');
  };

  const handleFileUpload = () => {
    triggerToast('Raw file uploaded successfully.');
  };

  // Analysis Handlers
  const handleGenerateReport = () => {
    triggerToast('Preparing PDF report... Download will begin shortly.');
  };

  return (
    <div className="bg-slate-50 flex h-screen overflow-hidden text-slate-800">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <Toast
          message={toastMessage}
          show={showToast}
          onHide={() => setShowToast(false)}
        />

        <div className="p-8 max-w-6xl mx-auto">
          {currentView === 'participants' && (
            <Participants
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onSuspendParticipant={handleSuspendParticipant}
            />
          )}

          {currentView === 'participantsView' && (
            <ParticipantsView
              participants={participants}
            />
          )}

          {currentView === 'data' && (
            <DataCollection
              participants={participants}
              onLogMeasurement={handleLogMeasurement}
              onFileUpload={handleFileUpload}
            />
          )}

          {currentView === 'analysis' && (
            <Analysis
              participants={participants}
              measurements={measurements}
              onGenerateReport={handleGenerateReport}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
