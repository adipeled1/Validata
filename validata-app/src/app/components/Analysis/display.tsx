"use client";

import { useState } from 'react';
import { Download } from 'lucide-react';
import ChartCard from './ChartCard';
import AgreementScatter from './charts/AgreementScatter';
import BlandAltmanPlot from './charts/BlandAltmanPlot';
import ErrorHistogram from './charts/ErrorHistogram';
import PerformanceTrend from './charts/PerformanceTrend';
import ThresholdDonut from './charts/ThresholdDonut';
import MeasurementProgressBar from './charts/MeasurementProgressBar';
import ParticipantStatusDonut from './charts/ParticipantStatusDonut';

const INFO_SCATTER =
  'Each dot is one measurement. Points on the dashed diagonal line mean the AI agreed perfectly with the goniometer. The further a dot is from the line, the larger the error.';

const INFO_BLAND_ALTMAN =
  'Shows the difference (AI − goniometer) for each measurement. Points between the dashed red lines = clinically acceptable agreement. A Bland-Altman plot checks how well two measurement methods agree — if dots cluster within the ±1.96 SD limits, the methods agree well. A bias far from zero means the AI consistently over- or under-estimates.';

const INFO_HISTOGRAM =
  'How often each error size occurs. A narrow, centered peak means the AI is consistently close to the goniometer. A wide or off-center histogram indicates systematic errors.';

const INFO_TREND =
  "RMSE and MAE per participant. Each point uses that participant's average AI and goniometer readings. RMSE (Root Mean Square Error) penalises large errors more heavily. MAE (Mean Absolute Error) treats all errors equally. Both are in degrees — lower is better.";

const infoDonut = (threshold: number) =>
  `Percentage of measurements where the AI error was within the acceptable clinical threshold of ±${threshold}°. Green = pass, red = fail.`;

const INFO_DESCRIPTIVE =
  "Descriptive statistics of the AI − goniometer error across participants, after averaging each participant's own measurements. Mean shows the average error (bias); SD shows how spread out errors are between participants; SE shows how precisely the mean error is estimated from this sample size.";

interface AnalysisDisplayProps {
  progressData: any[];
  statusData: any[];
  statsData: any[];
  summaryStats: { rmse: number; mae: number; meanBias: number; passRate: number };
  descriptiveStats: { n: number; mean: number; sd: number; se: number };
  charts: any;
  threshold: number;
  onThresholdChange?: (v: number) => void;
  isLoadingCharts: boolean;
  lastUpdated: Date | null;
  isAnalyzing?: boolean;
  aiResult?: string | null;
  onRunAnalysis?: () => void;
}

const StatCard = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) => (
  <div
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      padding: '12px 16px',
      flex: 1,
      minWidth: '120px',
    }}
  >
    <div
      style={{
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        marginBottom: '4px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '24px',
        fontWeight: 700,
        color: color ?? 'var(--text-primary)',
        fontFamily: 'var(--font-data)',
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
  </div>
);

// Pure presentational component
const AnalysisDisplay = ({
  progressData,
  statusData,
  statsData,
  summaryStats,
  descriptiveStats,
  charts,
  threshold,
  onThresholdChange,
  isLoadingCharts,
  lastUpdated,
  isAnalyzing: _isAnalyzing,
  aiResult: _aiResult,
  onRunAnalysis: _onRunAnalysis,
}: AnalysisDisplayProps) => {
  const { rmse, mae, meanBias } = summaryStats;
  const { n: descN, mean: descMean, sd: descSd, se: descSe } = descriptiveStats || {
    n: 0,
    mean: 0,
    sd: 0,
    se: 0,
  };
  const isEmpty = !isLoadingCharts && statsData.length === 0;

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(String(threshold));

  const [prevThreshold, setPrevThreshold] = useState(threshold);
  if (threshold !== prevThreshold) {
    setPrevThreshold(threshold);
    setThresholdInput(String(threshold));
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const chartEls = document.querySelectorAll('.pdf-chart');
      if (!chartEls.length) return;

      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'landscape' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < chartEls.length; i++) {
        const canvas = await html2canvas(chartEls[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const margin = 0.5;
        const maxPdfWidth = pdfWidth - margin * 2;
        const maxPdfHeight = pageHeight - margin * 2;
        const imgRatio = canvas.width / canvas.height;
        const pdfRatio = maxPdfWidth / maxPdfHeight;
        let renderWidth, renderHeight;
        if (imgRatio > pdfRatio) {
          renderWidth = maxPdfWidth;
          renderHeight = maxPdfWidth / imgRatio;
        } else {
          renderHeight = maxPdfHeight;
          renderWidth = maxPdfHeight * imgRatio;
        }
        if (i > 0) pdf.addPage();
        const xOffset = (pdfWidth - renderWidth) / 2;
        const yOffset = (pageHeight - renderHeight) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
      }
      pdf.save('validata-analysis.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            ANALYSIS / Results View &amp; Analysis
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Results View &amp; Analysis
          </h1>
          {formattedTime && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Last updated: {formattedTime}
            </div>
          )}
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          style={{
            padding: '6px 14px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isGenerating ? 0.7 : 1,
          }}
        >
          <Download size={14} />
          Generate PDF Report
        </button>
      </div>

      <div id="analysis-pdf-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Progress & Status charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            className="pdf-chart"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '14px' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Measurement Progress
            </div>
            <div style={{ height: '200px' }}>
              <MeasurementProgressBar data={progressData} />
            </div>
          </div>
          <div
            className="pdf-chart"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '14px' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Participant Status Distribution
            </div>
            <div style={{ height: '200px' }}>
              <ParticipantStatusDonut data={statusData} />
            </div>
          </div>
        </div>

        {/* Clinical Accuracy header */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Clinical Accuracy Analysis
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isLoadingCharts
              ? 'Loading data from database…'
              : isEmpty
              ? 'No measurements available yet.'
              : `AI vs. goniometer agreement across ${statsData.length} measurements.`}
          </div>
        </div>

        {isLoadingCharts && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: 'var(--text-muted)', gap: '10px', fontSize: '12px' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Fetching measurements…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '12px' }}>
            No measurements found in the database yet.
          </div>
        )}

        {!isLoadingCharts && statsData.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <StatCard label="RMSE" value={`${rmse.toFixed(2)}°`} sub="Root Mean Square Error" color="var(--accent-soft)" />
              <StatCard label="MAE" value={`${mae.toFixed(2)}°`} sub="Mean Absolute Error" color="var(--status-active)" />
              <StatCard
                label="Mean Bias"
                value={`${meanBias >= 0 ? '+' : ''}${meanBias.toFixed(2)}°`}
                sub="Systematic AI offset"
                color={meanBias >= 0 ? 'var(--status-pending)' : 'var(--status-dropped)'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <ChartCard title="Agreement Scatter" info={INFO_SCATTER} isEmpty={!statsData.length}>
                <AgreementScatter data={statsData} />
              </ChartCard>
              <ChartCard title="Bland-Altman Plot" info={INFO_BLAND_ALTMAN} isEmpty={!statsData.length}>
                <BlandAltmanPlot data={charts?.blandAltman} />
              </ChartCard>
              <ChartCard title="Error Distribution" info={INFO_HISTOGRAM} isEmpty={!statsData.length}>
                <ErrorHistogram data={charts?.errorHistogram} />
              </ChartCard>
              <ChartCard title="Performance Trend per Session" info={INFO_TREND} isEmpty={!statsData.length}>
                <PerformanceTrend data={charts?.performanceTrend} />
              </ChartCard>
            </div>

            <ChartCard
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <span>Pass / Fail Rate (±</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={thresholdInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setThresholdInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const num = parseFloat(thresholdInput);
                        if (!isNaN(num) && num >= 0) onThresholdChange?.(num);
                      }
                    }}
                    onBlur={() => {
                      const num = parseFloat(thresholdInput);
                      if (!isNaN(num) && num >= 0) onThresholdChange?.(num);
                    }}
                    style={{
                      width: '64px',
                      padding: '2px 6px',
                      fontSize: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                      fontFamily: 'var(--font-ui)',
                      outline: 'none',
                    }}
                  />
                  <span>° threshold)</span>
                </div>
              }
              info={infoDonut(threshold)}
              isEmpty={!statsData.length}
              center
            >
              <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                <ThresholdDonut data={charts?.thresholdDonut} threshold={threshold} />
              </div>
            </ChartCard>

            <ChartCard title="Descriptive Statistics" info={INFO_DESCRIPTIVE} isEmpty={descN === 0}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'N', value: String(descN), sub: 'Participants', color: undefined },
                  { label: 'Mean Error', value: `${descMean >= 0 ? '+' : ''}${descMean.toFixed(2)}°`, sub: 'Average bias', color: descMean >= 0 ? 'var(--status-pending)' : 'var(--status-dropped)' },
                  { label: 'SD', value: `${descSd.toFixed(2)}°`, sub: 'Standard Deviation', color: 'var(--accent-soft)' },
                  { label: 'SE', value: `${descSe.toFixed(2)}°`, sub: 'Standard Error', color: 'var(--status-active)' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: s.color ?? 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </>
        )}
      </div>
    </section>
  );
};

export default AnalysisDisplay;
