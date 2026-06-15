import ResultsDisplay from './display';
import { sortMeasurementsDescending } from '../Analysis/service';

const ResultsControl = ({ measurements }) => {
  const sortedMeasurements = sortMeasurementsDescending(measurements);
  return <ResultsDisplay sortedMeasurements={sortedMeasurements} />;
};

export default ResultsControl;
