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
