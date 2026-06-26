export const formatDateForDisplay = (value) => {
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

export const sortMeasurementsDescending = (measurements) => {
  return [...measurements].sort((a, b) => {
    const parseDate = (dateStr) => {
      try {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        return new Date(year, month - 1, day, hours, minutes).getTime();
      } catch {
        return 0;
      }
    };
    const timeDiff = parseDate(b.timestamp) - parseDate(a.timestamp);
    if (timeDiff !== 0) return timeDiff;

    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idB - idA;
  });
};
