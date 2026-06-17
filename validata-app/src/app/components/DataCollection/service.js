// Service file for DataCollection component
// Contains logic to process or filter data

export const getActiveParticipants = (participants) => {
  return participants.filter((p) => p.status === 'Active');
};
