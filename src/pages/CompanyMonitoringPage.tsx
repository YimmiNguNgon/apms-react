import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import type { CompanyMonitoringAssignmentResponse } from '../types/domain';
import { useUser, ROLES } from '../context/UserContext';
import { Bell, Search, AlertCircle, CheckCircle, PauseCircle } from 'lucide-react';

interface CompanyMonitoringPageProps {
  setActivePage?: (page: string) => void;
}

export const CompanyMonitoringPage: React.FC<CompanyMonitoringPageProps> = ({ setActivePage }) => {
  const { t } = useTranslation('company-monitoring');
  const { currentUser } = useUser();
  const [assignments, setAssignments] = useState<CompanyMonitoringAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isManager = currentUser?.role === ROLES.MANAGER || currentUser?.role === ROLES.ADMIN;

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);
        let data;
        if (isManager) {
          data = await companyMonitoringApi.getAllAssignments({ size: 100 });
        } else {
          data = await companyMonitoringApi.getMyAssignments({ size: 100 });
        }
        setAssignments(data.content || []);
      } catch (err: any) {
        setError(t('error_fetching_list', 'Failed to load monitoring assignments.'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, [isManager, t]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP_TO_DATE': return '#059669'; // var(--color-success-dark)
      case 'DUE': return '#D97706'; // var(--color-warning-dark)
      case 'OVERDUE': return '#DC2626'; // var(--color-error-dark)
      case 'PAUSED': return '#94A3B8'; // var(--color-text-muted)
      default: return '#334155'; // var(--color-text-main)
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'UP_TO_DATE': return '#ECFDF5'; // var(--color-success-light)
      case 'DUE': return '#FFFBEB'; // var(--color-warning-light)
      case 'OVERDUE': return '#FEF2F2'; // var(--color-error-light)
      case 'PAUSED': return '#F1F5F9'; // var(--color-surface-hover)
      default: return '#F1F5F9';
    }
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell color="#3B82F6" size={24} />
              {isManager ? t('all_monitoring', 'All Monitoring Assignments') : t('my_monitoring', 'My Monitoring Tasks')}
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
              {isManager 
                ? t('manager_desc', 'Overview of all companies being monitored continuously.')
                : t('staff_desc', 'Companies assigned to you for continuous monitoring.')}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              {t('loading', 'Loading assignments...')}
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <Bell size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#334155' }}>
                {t('no_assignments', 'No monitoring assignments found')}
              </h3>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>
                {isManager 
                  ? t('no_assignments_manager', 'Assign monitors from company profile pages.')
                  : t('no_assignments_staff', 'You have no companies assigned for monitoring.')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{t('company', 'Company')}</th>
                    {isManager && <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{t('assignee', 'Assignee')}</th>}
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{t('status', 'Status')}</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{t('frequency', 'Frequency')}</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{t('next_review', 'Next Review')}</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>{t('action', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 500, color: '#0F172A' }}>
                        {item.companyName || item.companyProfileId}
                      </td>
                      {isManager && (
                        <td style={{ padding: '16px', fontSize: '0.875rem', color: '#334155' }}>
                          <div>{item.assignedStaffName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.assignedStaffEmail}</div>
                        </td>
                      )}
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                          color: getStatusColor(item.displayStatus), backgroundColor: getStatusBg(item.displayStatus),
                          textTransform: 'capitalize'
                        }}>
                          {item.displayStatus === 'UP_TO_DATE' && <CheckCircle size={12} />}
                          {item.displayStatus === 'DUE' && <AlertCircle size={12} />}
                          {item.displayStatus === 'OVERDUE' && <AlertCircle size={12} />}
                          {item.displayStatus === 'PAUSED' && <PauseCircle size={12} />}
                          {item.displayStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.875rem', color: '#475569' }}>
                        {item.frequency}
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.875rem', color: '#475569' }}>
                        {new Date(item.nextReviewAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => {
                            window.location.hash = `company-detail?id=${item.companyProfileId}`;
                            if (setActivePage) setActivePage('company-detail');
                          }}
                          style={{
                            background: '#F1F5F9', color: '#3B82F6', border: 'none',
                            padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          {t('view', 'View Profile')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
