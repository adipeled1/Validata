import ResultsDisplay from './display';
import { sortMeasurementsDescending } from './service';

const ResultsControl = ({ participants, measurements, onMarkInvalid }) => {
  const sortedMeasurements = sortMeasurementsDescending(measurements);
  return (
    <ResultsDisplay
      sortedMeasurements={sortedMeasurements}
      participants={participants}
      onMarkInvalid={onMarkInvalid}
    />
  );
};

export default ResultsControl;
