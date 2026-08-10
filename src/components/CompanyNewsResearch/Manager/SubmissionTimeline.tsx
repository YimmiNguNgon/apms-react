import React from 'react';
import type { CompanyNewsResearchDraft } from '../../../types/domain';
import { FileText, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface SubmissionTimelineProps {
  draft: CompanyNewsResearchDraft;
}

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  } catch (e) {
    return '';
  }
};

export const SubmissionTimeline: React.FC<SubmissionTimelineProps> = ({ draft }) => {
  // Derive simple timeline from current status and timestamps.
  // This avoids faking complex histories that don't exist in the API response.
  
  const events = [];

  // Always show created/updated
  events.push({
    title: 'Draft created/updated',
    time: draft.updatedAt || draft.createdAt,
    icon: <FileText size={16} />,
    color: '#94a3b8',
    bgColor: '#f1f5f9'
  });

  if (draft.reviewStatus === 'SUBMITTED' || draft.reviewStatus === 'APPROVED') {
    events.push({
      title: 'Submitted for review',
      time: draft.updatedAt, // We might not have exact submit time, fallback to updated
      icon: <Send size={16} />,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    });
  }

  if (draft.reviewStatus === 'APPROVED') {
    events.push({
      title: 'Manager Approved',
      time: null, // Ideally reviewedAt if available in full submission DTO, but Draft DTO might not have it
      icon: <CheckCircle2 size={16} />,
      color: '#10b981',
      bgColor: '#ecfdf5'
    });
  } else if (draft.reviewStatus === 'SUBMITTED') {
    events.push({
      title: 'Pending review',
      time: null,
      icon: <Clock size={16} />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      isPending: true
    });
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', marginBottom: '16px' }}>Submission History</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {events.map((event, index) => (
          <div key={index} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {/* Timeline Line */}
            {index < events.length - 1 && (
              <div style={{ position: 'absolute', top: '24px', left: '15px', width: '2px', height: 'calc(100% - 16px)', backgroundColor: '#e2e8f0' }} />
            )}
            
            {/* Icon */}
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              backgroundColor: event.bgColor, color: event.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, zIndex: 2
            }}>
              {event.icon}
            </div>
            
            {/* Content */}
            <div style={{ paddingBottom: '24px', paddingTop: '6px' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: event.isPending ? '#64748b' : '#0f172a' }}>
                {event.title}
              </div>
              {event.time && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  {formatDateTime(event.time)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
