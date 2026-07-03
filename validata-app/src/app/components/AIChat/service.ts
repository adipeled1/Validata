export const prepareDataContext = (participants: any[], measurements: any[]) => {
  return {
    participants: participants.map(p => ({
      id: p.id,
      age: p.age,
      gender: p.gender,
      status: p.status,
      healthStatus: p.healthStatus
    })),
    measurements: measurements.map(m => ({
      participantId: m.participant,
      goniometer: parseFloat(m.goniometer) || m.goniometer,
      aiModel: parseFloat(m.aiModel) || m.aiModel,
      timestamp: m.timestamp
    }))
  };
};
