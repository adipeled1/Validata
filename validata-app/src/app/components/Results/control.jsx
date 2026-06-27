import ResultsDisplay from './display';
import { sortMeasurementsDescending } from './service';

const ResultsControl = ({ measurements, onMarkInvalid }) => {
  const sortedMeasurements = sortMeasurementsDescending(measurements);
  return <ResultsDisplay sortedMeasurements={sortedMeasurements} onMarkInvalid={onMarkInvalid} />;
};

export default ResultsControl;
