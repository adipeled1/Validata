// Service file for DataCollection component
// Contains logic to process or filter data

export const getActiveParticipants = (participants) => {
  return participants.filter((p) => p.status === 'Active');
};

export const getTodayDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
