interface ParticipantStats {
  avgAge: number | string;
  healthyCount: number;
  ankleInjuredCount: number;
  totalCount: number;
}

// Calculates average age, healthy count, and ankle-injured count for a list of participants.
export const getParticipantStats = (participants: any[]): ParticipantStats => {
  if (!participants || participants.length === 0) {
    return { avgAge: 0, healthyCount: 0, ankleInjuredCount: 0, totalCount: 0 };
  }

  const validAges = participants
    .map(p => Number(p.age))
    .filter(age => !isNaN(age) && age > 0);

  const avgAge = validAges.length > 0
    ? (validAges.reduce((sum, age) => sum + age, 0) / validAges.length).toFixed(1)
    : 0;

  const healthyCount = participants.filter(p => p.healthStatus === 'Healthy').length;
  const ankleInjuredCount = participants.filter(p => p.healthStatus === 'Ankle Injured').length;

  return {
    avgAge,
    healthyCount,
    ankleInjuredCount,
    totalCount: participants.length
  };
};
