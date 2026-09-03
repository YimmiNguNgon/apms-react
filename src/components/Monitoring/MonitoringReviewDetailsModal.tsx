import React, { useMemo, useState } from 'react';
import { XCircle } from 'lucide-react';
import { EvidenceImagePreviewModal } from './EvidenceImagePreviewModal';
import type { CompanyMonitoringReviewResponse } from '../../types/domain';
import {
  formatDate,
  reviewResultTone,
  reviewResultLabel,
  proposalTone,
  proposalStatusLabel,
  collectProposalChanges,
  ValueDisplay,
  type ChangeRow,
  type ProposalBundle
} from '../../pages/CompanyMonitoringPage';

export interface MonitoringReviewDetailsModalProps {
  review: CompanyMonitoringReviewResponse;
  bundle: ProposalBundle | null;
  onClose: () => void;
  title?: string;
}

export const MonitoringReviewDetailsModal: React.FC<MonitoringReviewDetailsModalProps> = ({
  review,
  bundle,
  onClose,
  title = 'Monitoring Review'
}) => {
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);

  const historyProposalChanges = useMemo(() => {
    return bundle ? collectProposalChanges(bundle.proposal, bundle.profile) : [];
  }, [bundle]);

  const historyGroupedProposalChanges = useMemo(() => {
    const groups: Record<string, ChangeRow[]> = {};
    historyProposalChanges.forEach((change) => {
      if (!groups[change.source]) groups[change.source] = [];
      groups[change.source].push(change);
    });
    return groups;
  }, [historyProposalChanges]);

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '85vw',
          maxWidth: '1200px',
          maxHeight: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {review.companyName || review.companyProfileId}
              </span>
              <span className={`workspace-badge ${reviewResultTone(review.result)}`}>
                {reviewResultLabel(review.result)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="workspace-icon-btn"
            onClick={onClose}
            aria-label="Close review detail"
          >
            <XCircle size={24} color="var(--text-secondary)" />
          </button>
        </div>

        <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
          {/* SECTION A: REVIEW SUMMARY */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Review Summary
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px',
                background: 'var(--cds-layer-01, #f8fafc)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--workspace-muted-border, #e2e8f0)'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Reviewed by
                </div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {review.reviewedByName || review.reviewedByEmail || '-'}
                </strong>
                {review.reviewedByEmail && review.reviewedByEmail !== review.reviewedByName && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {review.reviewedByEmail}
                  </div>
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Reviewed at
                </div>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDate(review.reviewedAt)}</strong>
              </div>
            </div>
          </div>

          {/* SECTION B: REVIEW RESULT / CHANGES */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {review.result === 'NO_CHANGE' ? 'Review Result' : 'Changes'}
            </h4>

            {review.result === 'NO_CHANGE' ? (
              <div>
                <span
                  className={`workspace-badge ${reviewResultTone(review.result)}`}
                  style={{ marginBottom: '12px', display: 'inline-block' }}
                >
                  {reviewResultLabel(review.result)}
                </span>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                  No company information changes were found during this review.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <span
                    className={`workspace-badge ${reviewResultTone(review.result)}`}
                    style={{ marginRight: '12px' }}
                  >
                    {reviewResultLabel(review.result)}
                  </span>
                  <strong style={{ color: 'var(--role-accent, #2563eb)' }}>
                    {historyProposalChanges.length} field{historyProposalChanges.length !== 1 ? 's' : ''} changed
                  </strong>
                </div>

                {review.updateProposalId && !bundle ? (
                  <div
                    className="workspace-empty"
                    style={{ padding: '24px', background: 'var(--cds-layer-01, #f8fafc)', borderRadius: '8px' }}
                  >
                    Loading proposal changes...
                  </div>
                ) : historyProposalChanges.length > 0 ? (
                  Object.entries(historyGroupedProposalChanges).map(([section, changes]) => (
                    <div
                      key={section}
                      style={{
                        marginBottom: '24px',
                        background: 'var(--bg-surface, #fff)',
                        border: '1px solid var(--workspace-muted-border, #e2e8f0)',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 16px',
                          background: 'var(--cds-layer-01, #f8fafc)',
                          borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {section}
                        </h5>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            background: 'var(--cds-layer-02, #e0e0e0)',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}
                        >
                          {changes.length} change{changes.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                          <thead>
                            <tr>
                              <th
                                style={{
                                  width: '25%',
                                  padding: '12px 16px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                  borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)'
                                }}
                              >
                                Field
                              </th>
                              <th
                                style={{
                                  width: '37.5%',
                                  padding: '12px 16px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                  borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)'
                                }}
                              >
                                Current Value
                              </th>
                              <th
                                style={{
                                  width: '37.5%',
                                  padding: '12px 16px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--role-accent, #2563eb)',
                                  textTransform: 'uppercase',
                                  borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)',
                                  background: 'var(--cds-layer-selected, #eff6ff)'
                                }}
                              >
                                Proposed Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {changes.map((change, index) => (
                              <React.Fragment key={change.key}>
                                <tr
                                  style={{
                                    borderBottom: change.evidence ? 'none' : (index < changes.length - 1
                                      ? '1px solid var(--workspace-muted-border, #e2e8f0)'
                                      : 'none')
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: '16px',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)'
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                      {change.label}
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: '16px',
                                      verticalAlign: 'top',
                                      borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)'
                                    }}
                                  >
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                      <ValueDisplay value={change.currentValue} />
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: '16px',
                                      verticalAlign: 'top',
                                      background: 'var(--cds-layer-selected, #eff6ff)'
                                    }}
                                  >
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                      <ValueDisplay value={change.proposedValue} isProposed />
                                    </div>
                                  </td>
                                </tr>
                                {change.evidence && (
                                  <tr style={{ borderBottom: index < changes.length - 1 ? '1px solid var(--workspace-muted-border, #e2e8f0)' : 'none' }}>
                                    <td colSpan={3} style={{ padding: '0 16px 16px 16px', background: 'var(--cds-layer-selected, #eff6ff)' }}>
                                      <div style={{ marginTop: '12px', padding: '12px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>Supporting Evidence</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {change.evidence.evidenceSource && (
                                            <div>
                                              <strong style={{ color: '#075985' }}>Source:</strong>{' '}
                                              <a href={change.evidence.evidenceSource} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>
                                                {change.evidence.evidenceSource}
                                              </a>
                                            </div>
                                          )}
                                          {change.evidence.evidenceScript && (
                                            <div>
                                              <strong style={{ color: '#075985' }}>Explanation:</strong>{' '}
                                              <span style={{ color: '#0c4a6e' }}>{change.evidence.evidenceScript}</span>
                                            </div>
                                          )}
                                          {change.evidence.evidenceImageId && (
                                            <div>
                                              <strong style={{ color: '#075985' }}>Image Attached:</strong>{' '}
                                              <span style={{ color: '#059669' }}>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setPreviewImageId(change.evidence?.evidenceImageId || null);
                                                  }}
                                                  style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    color: '#0284c7',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                    fontSize: 'inherit',
                                                    fontFamily: 'inherit'
                                                  }}
                                                >
                                                  [ View Image ]
                                                </button>
                                              </span>
                                            </div>
                                          )}
                                          {!change.evidence?.evidenceSource && !change.evidence?.evidenceScript && !change.evidence?.evidenceImageId && (
                                            <div style={{ color: '#0c4a6e' }}>No supporting evidence provided.</div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="workspace-empty"
                    style={{ padding: '24px', background: 'var(--cds-layer-01, #f8fafc)', borderRadius: '8px' }}
                  >
                    No changed fields were found.
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECTION C: MANAGER DECISION */}
          {review.result === 'UPDATE_PROPOSED' && review.proposalStatus && (
            <div>
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Manager Decision
              </h4>
              <div
                style={{
                  background: 'var(--cds-layer-01, #f8fafc)',
                  border: '1px solid var(--workspace-muted-border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <span className={`workspace-badge ${proposalTone(review.proposalStatus)}`}>
                  {proposalStatusLabel(review.proposalStatus)}
                </span>

                {bundle && bundle.proposal.status !== 'PENDING' && (
                  <>
                    <div style={{ display: 'flex', gap: '48px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase'
                          }}
                        >
                          Reviewed by
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {bundle.proposal.reviewedByName || 'Manager'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase'
                          }}
                        >
                          Reviewed at
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {formatDate(bundle.proposal.updatedAt)}
                        </strong>
                      </div>
                    </div>

                    {bundle.proposal.status !== 'PENDING' && (
                      <div style={{ marginTop: '16px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '4px'
                          }}
                        >
                          Decision Note
                        </span>
                        <p style={{ margin: '0', color: bundle.proposal.reviewComment ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {bundle.proposal.reviewComment || '—'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION D: SCHEDULE */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Schedule
            </h4>
            <div
              style={{
                display: 'flex',
                gap: '48px',
                background: 'var(--cds-layer-01, #f8fafc)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--workspace-muted-border, #e2e8f0)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase'
                  }}
                >
                  Completed
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDate(review.reviewedAt)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '18px 32px',
            borderTop: '1px solid var(--workspace-muted-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <EvidenceImagePreviewModal
        imageId={previewImageId}
        onClose={() => setPreviewImageId(null)}
      />
    </div>
  );
};
