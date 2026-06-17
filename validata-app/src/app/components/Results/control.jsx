import ResultsDisplay from './display';
import { sortMeasurementsDescending } from './service';

const ResultsControl = ({ measurements }) => {
  const sortedMeasurements = sortMeasurementsDescending(measurements);
  return <ResultsDisplay sortedMeasurements={sortedMeasurements} />;
};

export default ResultsControl;
