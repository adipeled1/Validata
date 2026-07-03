import { useState } from 'react';
import ResultsDisplay from './display';
import ConfirmWithReasonModal from '../common/ConfirmWithReasonModal';
import { sortMeasurementsDescending } from './service';

interface ResultsControlProps {
  participants: any[];
  measurements: any[];
  // ICH E6(R3) COR-01: reason is now required for every validity change.
  onMarkInvalid: (id: any, reason: string) => void;
}

const ResultsControl = ({ participants, measurements, onMarkInvalid }: ResultsControlProps) => {
  const sortedMeasurements = sortMeasurementsDescending(measurements);

  const [pendingInvalidId, setPendingInvalidId] = useState<any>(null);

  const handleMarkInvalid = (id: any) => {
    setPendingInvalidId(id);
  };

  const handleInvalidConfirmed = (reason: string) => {
    if (pendingInvalidId !== null) {
      onMarkInvalid(pendingInvalidId, reason);
    }
    setPendingInvalidId(null);
  };

  return (
    <>
      {pendingInvalidId !== null && (
        <ConfirmWithReasonModal
          title="Mark Measurement Invalid"
          body={`Measurement #${pendingInvalidId} will be excluded from all statistics. This is recorded in the audit trail.`}
          reasonLabel="Reason for marking this measurement invalid"
          reasonRequired
          confirmLabel="Mark Invalid"
          onConfirm={handleInvalidConfirmed}
          onCancel={() => setPendingInvalidId(null)}
        />
      )}

      <ResultsDisplay
        sortedMeasurements={sortedMeasurements}
        participants={participants}
        onMarkInvalid={handleMarkInvalid}
      />
    </>
  );
};

export default ResultsControl;
