import { useState } from 'react';
import ParticipantsViewDisplay from './display';
import { getParticipantStats } from './service';

const ParticipantsViewControl = ({ participants = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter participants in controller
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.healthStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics for the original participants array
  const stats = getParticipantStats(participants);

  return (
    <ParticipantsViewDisplay
      participants={filteredParticipants}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      stats={stats}
    />
  );
};

export default ParticipantsViewControl;
