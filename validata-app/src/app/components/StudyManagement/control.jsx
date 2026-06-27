import { useState } from 'react';
import StudyManagementDisplay from './display';

const StudyManagementControl = ({ studies, currentStudyId, onAddStudy, onDeleteStudy }) => {
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyGoal, setNewStudyGoal] = useState('');

  const handleCreateStudy = (e) => {
    e.preventDefault();
    if (!newStudyName.trim()) return;
    onAddStudy(newStudyName.trim(), newStudyGoal);
    setNewStudyName('');
    setNewStudyGoal('');
  };

  const handleDeleteStudy = (id) => {
    const study = studies.find((s) => s.id === id);
    if (!study) return;

    // The delete button is disabled in the UI when this is the only study,
    // but guard here too in case it's ever triggered another way.
    if (studies.length <= 1) {
      window.alert('Cannot delete the only study. Create another study first, then delete this one.');
      return;
    }

    if (window.confirm(`Delete study "${study.name}"? This permanently deletes all of its participants and measurements. This cannot be undone.`)) {
      onDeleteStudy(id);
    }
  };

  return (
    <StudyManagementDisplay
      studies={studies}
      currentStudyId={currentStudyId}
      newStudyName={newStudyName}
      onNewStudyNameChange={setNewStudyName}
      newStudyGoal={newStudyGoal}
      onNewStudyGoalChange={setNewStudyGoal}
      onCreateStudy={handleCreateStudy}
      onDeleteStudy={handleDeleteStudy}
    />
  );
};

export default StudyManagementControl;
