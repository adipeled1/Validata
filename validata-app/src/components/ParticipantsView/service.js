// Service file for ParticipantsView component
// Handles calculations and formatting for participant data

/**
 * Calculates statistics for the participants list.
 * @param {Array} participants 
 * @returns {Object} stats containing average age, healthy count, sick count, etc.
 */
export const getParticipantStats = (participants) => {
  if (!participants || participants.length === 0) {
    return { avgAge: 0, healthyCount: 0, sickCount: 0, totalCount: 0 };
  }

  const validAges = participants
    .map(p => Number(p.age))
    .filter(age => !isNaN(age) && age > 0);
  
  const avgAge = validAges.length > 0
    ? (validAges.reduce((sum, age) => sum + age, 0) / validAges.length).toFixed(1)
    : 0;

  const healthyCount = participants.filter(p => p.healthStatus === 'Healthy').length;
  const sickCount = participants.filter(p => p.healthStatus === 'Sick').length;

  return {
    avgAge,
    healthyCount,
    sickCount,
    totalCount: participants.length
  };
};
