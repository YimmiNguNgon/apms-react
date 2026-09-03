import React, { useState, useEffect } from 'react';
import type { ProfileResponse, CompanyProfileVersionResponse, CompanyProfileChangeSource } from '../../types/domain';
import { companyProfileApi } from '../../API/companyProfileApi';
import { ValueDisplay } from '../../pages/CompanyMonitoringPage';

interface ProfileVersionHistoryModalProps {
  profile: ProfileResponse;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileVersionHistoryModal: React.FC<ProfileVersionHistoryModalProps> = ({
  profile,
  isOpen,
  onClose,
}) => {
  const [versions, setVersions] = useState<CompanyProfileVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<CompanyProfileVersionResponse | null>(null);

  useEffect(() => {
    if (!isOpen || !profile) return;

    const fetchVersions = async () => {
      setLoading(true);
      setError(null);
      setSelectedVersion(null);

      const targetId = profile.id || profile.companyId;
      try {
        const res = await companyProfileApi.getCompanyProfileVersions(targetId, 0, 50);
        const list = res?.content || (Array.isArray(res) ? res : []);
        setVersions(list);
      } catch (err: any) {
        console.error('Failed to load version history:', err);
        setError(err.message || 'Failed to load version history.');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const formatSourceLabel = (source?: CompanyProfileChangeSource) => {
    switch (source) {
      case 'INITIAL_PROFILE_CREATION':
        return { text: 'Initial Profile Creation', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
      case 'MONITORING_PROPOSAL_APPROVED':
        return { text: 'Monitoring Proposal Approved', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      case 'PROJECT_PROFILE_UPDATE':
        return { text: 'Project Profile Update', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
      case 'MANAGER_MANUAL_EDIT':
        return { text: 'Manager Manual Edit', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
      default:
        return { text: source || 'Profile Update', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    }
  };

  const formatFieldPath = (path: string) => {
    return path
      .split('.')
      .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
      .join(' → ');
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalContainerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Company Profile Version History
              </h2>
              <span style={companyBadgeStyle}>
                {profile.identity?.tradeName || profile.identity?.legalName || profile.companyId}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Official immutable record of all approved changes and manual edits.
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Content Layout */}
        <div style={bodyLayout}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '0.9rem' }}>
              Loading version history...
            </div>
          ) : error ? (
            <div style={{ padding: '20px', color: '#DC2626', background: '#FEE2E2', borderRadius: '8px', margin: '20px' }}>
              ❌ {error}
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.9rem' }}>
              No version history records found for this profile.
            </div>
          ) : (
            <div style={timelineContainer}>
              {versions.map((ver, idx) => {
                const sourceBadge = formatSourceLabel(ver.changeSource);
                const isSelected = selectedVersion?.id === ver.id;
                const isInitial = ver.changeSource === 'INITIAL_PROFILE_CREATION';
                const changedPaths = ver.changedFieldPaths || [];

                return (
                  <div
                    key={ver.id || idx}
                    style={{
                      ...cardStyle,
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      background: isSelected ? '#F8FAFC' : '#FFFFFF',
                    }}
                  >
                    <div style={cardHeaderStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={versionTagStyle}>{ver.versionLabel || `v${ver.majorVersion}.${String(ver.revision).padStart(2, '0')}`}</span>
                        <span style={{
                          ...sourceBadgeBase,
                          background: sourceBadge.bg,
                          color: sourceBadge.color,
                          border: `1px solid ${sourceBadge.border}`,
                        }}>
                          {sourceBadge.text}
                        </span>
                        {idx === 0 && (
                          <span style={currentActiveTagStyle}>Current Official Version</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {formatDateTime(ver.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedVersion(isSelected ? null : ver)}
                          style={viewDetailBtnStyle}
                        >
                          {isSelected ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Summary Line */}
                    <div style={cardMetaStyle}>
                      {ver.createdByName && (
                        <span>Changed by: <strong>{ver.createdByName}</strong></span>
                      )}
                      {ver.projectName && (
                        <span>Project: <strong>{ver.projectName}</strong></span>
                      )}
                      {!isInitial && (
                        <span>Fields Changed: <strong>{changedPaths.length}</strong></span>
                      )}
                      {ver.changeNote && (
                        <div style={noteBlockStyle}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>Note:</span> {ver.changeNote}
                        </div>
                      )}
                    </div>

                    {/* Expanded Details Section */}
                    {isSelected && (
                      <div style={detailContainerStyle}>
                        {isInitial ? (
                          <div style={initialCalloutStyle}>
                            <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: '4px' }}>
                              🎉 Initial official Company Profile created.
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              This marks the baseline official profile (v1.00) established during initial registration or approval.
                            </div>
                          </div>
                        ) : changedPaths.length === 0 ? (
                          <div style={{ padding: '12px', color: '#64748B', fontSize: '0.82rem', fontStyle: 'italic' }}>
                            No individual field differences recorded for this revision.
                          </div>
                        ) : (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                              Changed Fields ({changedPaths.length})
                            </div>
                            <table style={diffTableStyle}>
                              <thead>
                                <tr style={tableHeaderRowStyle}>
                                  <th style={{ ...thStyle, width: '28%' }}>FIELD</th>
                                  <th style={{ ...thStyle, width: '36%' }}>BEFORE VALUE</th>
                                  <th style={{ ...thStyle, width: '36%' }}>AFTER VALUE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {changedPaths.map((path) => {
                                  const beforeVal = ver.beforeValues?.[path];
                                  const afterVal = ver.afterValues?.[path];

                                  return (
                                    <tr key={path} style={tableRowStyle}>
                                      <td style={tdFieldStyle}>
                                        {formatFieldPath(path)}
                                      </td>
                                      <td style={tdBeforeStyle}>
                                        <ValueDisplay value={beforeVal} />
                                      </td>
                                      <td style={tdAfterStyle}>
                                        <ValueDisplay value={afterVal} isProposed={true} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Total Revisions: <strong>{versions.length}</strong>
          </div>
          <button type="button" onClick={onClose} style={closeActionBtnStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '16px',
};

const modalContainerStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '860px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  position: 'relative',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  background: '#F8FAFC',
};

const companyBadgeStyle: React.CSSProperties = {
  background: '#F1F5F9',
  border: '1px solid #CBD5E1',
  color: '#334155',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '999px',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  color: '#64748B',
  cursor: 'pointer',
  padding: '4px',
};

const bodyLayout: React.CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  flex: 1,
};

const timelineContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const cardStyle: React.CSSProperties = {
  borderRadius: '8px',
  padding: '14px 16px',
  transition: 'all 0.15s ease',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
};

const versionTagStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#0F172A',
  fontFamily: 'monospace',
};

const sourceBadgeBase: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '999px',
};

const currentActiveTagStyle: React.CSSProperties = {
  background: '#DCFCE7',
  border: '1px solid #86EFAC',
  color: '#15803D',
  fontSize: '0.68rem',
  fontWeight: 700,
  padding: '1px 6px',
  borderRadius: '4px',
  textTransform: 'uppercase',
};

const viewDetailBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#334155',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const cardMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '8px',
  fontSize: '0.78rem',
  color: '#64748B',
};

const noteBlockStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '4px',
  background: '#F1F5F9',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '0.78rem',
  color: '#334155',
  borderLeft: '3px solid #94A3B8',
};

const detailContainerStyle: React.CSSProperties = {
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #E2E8F0',
};

const initialCalloutStyle: React.CSSProperties = {
  background: '#EFF6FF',
  border: '1px solid #BFDBFE',
  borderRadius: '6px',
  padding: '12px',
};

const diffTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
  background: '#FFFFFF',
  borderRadius: '6px',
  overflow: 'hidden',
  border: '1px solid #E2E8F0',
};

const tableHeaderRowStyle: React.CSSProperties = {
  background: '#F8FAFC',
  borderBottom: '1px solid #E2E8F0',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid #F1F5F9',
};

const tdFieldStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontWeight: 600,
  color: '#1E293B',
  verticalAlign: 'top',
  background: '#FAFAFA',
};

const tdBeforeStyle: React.CSSProperties = {
  padding: '8px 10px',
  color: '#475569',
  verticalAlign: 'top',
  background: '#FFF5F5',
};

const tdAfterStyle: React.CSSProperties = {
  padding: '8px 10px',
  color: '#0F172A',
  verticalAlign: 'top',
  background: '#F0FDF4',
};

const footerStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#F8FAFC',
};

const closeActionBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#475569',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
};
