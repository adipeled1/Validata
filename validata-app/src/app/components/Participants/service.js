// Service file for Participants component
// Contains business logic separated from the UI and React state

export const countActiveParticipants = (participants) => {
  return participants.filter(p => p.status === 'Active').length;
};
