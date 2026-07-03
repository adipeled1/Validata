export const countActiveParticipants = (participants: any[]): number => {
  return participants.filter((p) => p.status === 'Active').length;
};

// "Recruited" = anyone still meaningfully part of the study (not dropped),
// since a Completed participant was still successfully recruited.
export const countRecruitedParticipants = (participants: any[]): number => {
  return participants.filter((p) => p.status === 'Active' || p.status === 'Completed').length;
};

export const getTodayDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateForDisplay = (value: string | null | undefined): string => {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
};
