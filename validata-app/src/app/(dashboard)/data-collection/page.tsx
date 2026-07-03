"use client";

import { useStudy } from '../../../context/StudyContext';
import DataCollection from '../../components/DataCollection/control';

export default function DataCollectionPage() {
  const { participants, logMeasurement, onFileUpload, isImporting, importSummary, clearImportSummary } = useStudy();

  return (
    <DataCollection
      participants={participants}
      onLogMeasurement={logMeasurement}
      onFileUpload={onFileUpload}
      isImporting={isImporting}
      importSummary={importSummary}
      onClearImportSummary={clearImportSummary}
    />
  );
}
