import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';
import { API_BASE_URL, api } from '../../services/api';
import type { FinancialReportEntry } from '../../types/domain';
import AddFinancialReportModal from './AddFinancialReportModal';
import FinancialReportCard from './FinancialReportCard';

const STEPS = ['Sources', 'AI Extraction', 'Review Metrics', 'Submit'];

export default function FinancialResearchWorkbench({
  projectId,
  taskId,
  taskTitle,
  targetCompanyName,
  documents = [],
}: any) {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Queries
  const { data: researchRes, isLoading } = useQuery({
    queryKey: ['financial-research', projectId, taskId],
    queryFn: () => financialResearchApi.getResearch(projectId, taskId),
  });

  // Extract research domain object from ApiResponse wrapper
  const research = researchRes?.data;

  // Mutations
  const addReportMutation = useMutation({
    mutationFn: (data: any) => financialResearchApi.addReport(projectId, taskId, data),
    onSuccess: (res) => {
      console.log('addReportMutation onSuccess! Backend returned:', res);
      queryClient.invalidateQueries({ queryKey: ['financial-research'] });
      setIsAddModalOpen(false);
    }
  });

  const removeReportMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.removeReport(projectId, taskId, reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research'] })
  });

  const extractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.extractReport(projectId, taskId, reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research'] })
  });

  const reExtractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.reExtractReport(projectId, taskId, reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research'] })
  });

  const submitTaskMutation = useMutation({
    mutationFn: () => fetch(`/api/v1/projects/${projectId}/tasks/${taskId}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({
        submissionType: 'FINANCIAL_RESEARCH',
        targetEntityType: 'FinancialResearch',
        targetEntityId: research?.id
      })
    }).then(res => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research'] })
  });

  if (isLoading) return <div>Loading...</div>;
  if (!research) return <div>Research not found.</div>;

  const reports = research.reports || [];
  const metrics = research.metrics || [];
  const isSubmitted = research.status === 'SUBMITTED' || research.status === 'APPROVED';

  const extractedCount = reports.filter(r => r.extractionStatus === 'EXTRACTED').length;
  const unverifiedCount = metrics.filter(m => m.verificationStatus === 'UNVERIFIED').length;
  const needsReviewCount = metrics.filter(m => m.qualityStatus === 'NEEDS_REVIEW' && m.verificationStatus === 'UNVERIFIED').length;

  const groupedReports = reports.reduce((acc, report) => {
    const year = report.reportingPeriod?.year || 'Unknown';
    const period = report.reportingPeriod?.period || report.reportingPeriod?.periodType || 'Unknown';
    const key = `${year} ${period}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {} as Record<string, FinancialReportEntry[]>);

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  // Styles
  const containerStyle: React.CSSProperties = { padding: '24px', fontFamily: 'sans-serif' };
  const stepperStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' };
  const stepStyle = (idx: number): React.CSSProperties => ({
    fontWeight: activeStep === idx ? 'bold' : 'normal',
    color: activeStep === idx ? '#2563eb' : '#6b7280'
  });
  const buttonStyle = (primary: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#e5e7eb' : primary ? '#3b82f6' : 'transparent',
    color: disabled ? '#9ca3af' : primary ? 'white' : '#374151',
    fontWeight: 'bold', textDecoration: primary ? 'none' : 'underline'
  });
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: '16px' };
  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' };
  const tdStyle: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #e5e7eb' };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0 }}>Research Financial Information - {targetCompanyName}</h2>
      
      {isSubmitted && (
        <div style={{ padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '4px', marginBottom: '24px' }}>
          This research is currently {research.status}.
        </div>
      )}

      <div style={stepperStyle}>
        {STEPS.map((label, idx) => (
          <div key={label} style={stepStyle(idx)}>
            {idx + 1}. {label}
          </div>
        ))}
      </div>

      {activeStep === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Financial Reports</h3>
            {!isSubmitted && (
              <button style={buttonStyle(true, false)} onClick={() => setIsAddModalOpen(true)}>
                + Create Financial Report
              </button>
            )}
          </div>

          {Object.keys(groupedReports).length === 0 ? (
            <div style={{ padding: '16px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px' }}>
              No reports added yet. Click 'Create Financial Report' to start.
            </div>
          ) : (
            Object.entries(groupedReports).map(([group, groupReports]) => (
              <div key={group} style={{ marginBottom: '32px' }}>
                <h4 style={{ marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>{group}</h4>
                {groupReports.map(report => (
                  <FinancialReportCard
                    key={report.id}
                    report={report}
                    metricCount={metrics.filter(m => m.source?.reportEntryId === report.id).length}
                    needsReviewCount={metrics.filter(m => m.source?.reportEntryId === report.id && m.qualityStatus === 'NEEDS_REVIEW').length}
                    onExtract={(id) => {
                       if (report.extractionStatus === 'EXTRACTED' || report.extractionStatus === 'NEEDS_REVIEW') {
                           reExtractMutation.mutate(id);
                       } else {
                           extractMutation.mutate(id);
                       }
                    }}
                    onDelete={(id) => removeReportMutation.mutate(id)}
                    onViewPdf={(docId) => window.open(`/api/v1/documents/${docId}/download`, '_blank')}
                  />
                ))}
              </div>
            ))
          )}

          <AddFinancialReportModal 
            open={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={async (data, file) => {
              // 1. Upload the file
              const formData = new FormData();
              formData.append('file', file);
              formData.append('taskId', String(taskId));
              
              const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
              
              try {
                const res = await api.post<any>(`/projects/${projectId}/documents/upload`, formData);
                
                const documentId = res.data?.rawDocumentId || res.data?.id; // In case payload structure differs
                
                if (!documentId) {
                  alert('Upload successful but document ID missing. Response: ' + JSON.stringify(res.data));
                  return;
                }
                
                // 2. Submit the report with the new documentId
                data.documentId = documentId;
                await addReportMutation.mutateAsync(data);
              } catch (err: any) {
                alert(`Error: ${err.message || err.toString()}`);
              }
            }}
          />
        </div>
      )}

      {activeStep === 1 && (
        <div>
          <h3>AI Extraction Status</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Report</th>
                <th style={thStyle}>Period</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Extracted Metrics</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td style={tdStyle}>{report.title}</td>
                  <td style={tdStyle}>{report.reportingPeriod?.period} {report.reportingPeriod?.year}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                      background: report.extractionStatus === 'EXTRACTED' ? '#dcfce7' : report.extractionStatus === 'FAILED' ? '#fee2e2' : '#f3f4f6',
                      color: report.extractionStatus === 'EXTRACTED' ? '#166534' : report.extractionStatus === 'FAILED' ? '#991b1b' : '#374151'
                    }}>
                      {report.extractionStatus}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {metrics.filter(m => m.source?.reportEntryId === report.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeStep === 2 && (
        <div>
          <h3>Review Metrics</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Period</th>
                <th style={thStyle}>Report Source</th>
                <th style={thStyle}>Quality</th>
                <th style={thStyle}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => {
                const report = reports.find(r => r.id === metric.source?.reportEntryId);
                return (
                  <tr key={metric.id}>
                    <td style={tdStyle}>{metric.label}</td>
                    <td style={tdStyle}>{metric.rawValue} {metric.rawUnit}</td>
                    <td style={tdStyle}>{metric.period?.period} {metric.period?.year}</td>
                    <td style={tdStyle}>{report?.title || 'Unknown'} (pg {metric.source?.page})</td>
                    <td style={tdStyle}>
                      {metric.qualityStatus === 'NEEDS_REVIEW' ? <AlertTriangle size={18} color="#eab308"/> : <CheckCircle size={18} color="#22c55e"/>}
                    </td>
                    <td style={tdStyle}>
                      {metric.verificationStatus === 'VERIFIED' ? <CheckCircle size={18} color="#22c55e"/> : <span style={{ fontSize: '12px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>Unverified</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeStep === 3 && (
        <div>
          <h3>Submit Research Package</h3>
          <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
             <p><strong>Reports:</strong> {reports.length}</p>
             <p><strong>Extracted Reports:</strong> {extractedCount}</p>
             <p><strong>Total Metrics:</strong> {metrics.length}</p>
             <p><strong>Unverified Metrics:</strong> {unverifiedCount}</p>
             <p><strong>Blocking Issues (Needs Review):</strong> {needsReviewCount}</p>
             
             {needsReviewCount > 0 && (
               <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginTop: '16px' }}>
                 You cannot submit because there are {needsReviewCount} metrics that need review.
               </div>
             )}
          </div>

          {!isSubmitted && (
            <button 
              style={buttonStyle(true, needsReviewCount > 0 || reports.length === 0 || submitTaskMutation.isPending)}
              disabled={needsReviewCount > 0 || reports.length === 0 || submitTaskMutation.isPending}
              onClick={() => submitTaskMutation.mutate()}
            >
              {submitTaskMutation.isPending ? 'Submitting...' : 'Submit to Manager'}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button style={buttonStyle(false, activeStep === 0)} disabled={activeStep === 0} onClick={handleBack}>
          Back
        </button>
        {activeStep < STEPS.length - 1 && (
          <button style={buttonStyle(false, false)} onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
