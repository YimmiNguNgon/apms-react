import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';

interface KeyMetricsTabProps {
  companyProfileId: string;
}

export default function KeyMetricsTab({ companyProfileId }: KeyMetricsTabProps) {
  const [selectedPeriodStr, setSelectedPeriodStr] = useState<string>('');

  const { data: approvedResearchList, isLoading } = useQuery({
    queryKey: ['financial-research-approved', companyProfileId],
    queryFn: () => financialResearchApi.getApprovedFinancials(companyProfileId).then(res => res.data),
  });

  const availablePeriods = React.useMemo(() => {
    if (!approvedResearchList) return [];
    
    const periods = new Set<string>();
    approvedResearchList.forEach(research => {
      const p = research.targetResearchPeriod;
      if (p) {
        periods.add(`${p.year}-${p.periodType}`);
      }
    });
    
    const sorted = Array.from(periods).sort().reverse();
    if (sorted.length > 0 && !selectedPeriodStr) {
      setSelectedPeriodStr(sorted[0]);
    }
    return sorted;
  }, [approvedResearchList, selectedPeriodStr]);

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading metrics...</div>;
  }

  if (!approvedResearchList || approvedResearchList.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 0.5rem', color: '#334155' }}>No Financial Data</h3>
        <p style={{ margin: 0 }}>No approved financial research has been published for this company yet.</p>
      </div>
    );
  }

  // Find the research for the selected period
  const displayResearch = approvedResearchList.find(r => {
    const p = r.targetResearchPeriod;
    return p && `${p.year}-${p.periodType}` === selectedPeriodStr;
  }) || approvedResearchList[0];

  const metrics = displayResearch?.metrics || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.125rem' }}>Financial Metrics</h3>
        
        {availablePeriods.length > 0 && (
          <select 
            value={selectedPeriodStr}
            onChange={(e) => setSelectedPeriodStr(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
          >
            {availablePeriods.map(p => {
              const [year, type] = p.split('-');
              return <option key={p} value={p}>{type} {year}</option>;
            })}
          </select>
        )}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {metrics.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No metrics available for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Metric</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Value</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Quality</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr key={metric.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>{metric.label}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {metric.normalizedValue || metric.rawValue} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{metric.normalizedUnit || metric.rawUnit}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {metric.source?.documentName || 'Unknown source'}
                      {metric.source?.page && ` (p. ${metric.source.page})`}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {metric.qualityStatus === 'VALID' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <ShieldCheck size={12} /> Valid
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {displayResearch?.updatedAt && (
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
          Last updated: {new Date(displayResearch.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
