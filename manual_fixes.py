import re

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix 9-column header to 8-column
header_pattern = r"""            <div className="monitoring-management-header">
              <span>#</span>
              <span>Company</span>
              <span>Assigned Staff</span>
              <span>Status</span>
              <span>Schedule</span>
              <span>Frequency</span>
              <span>Reviewed</span>
              <span>Proposal</span>
              <span>Actions</span>
            </div>"""
new_header = """            <div className="monitoring-management-header">
              <span>#</span>
              <span>Company</span>
              <span>Assigned Staff</span>
              <span>Review Cycle</span>
              <span>Next Review</span>
              <span>Status</span>
              <span>Proposal</span>
              <span>Actions</span>
            </div>"""
content = content.replace(header_pattern, new_header)

# 2. Fix renderProposalRow
prop_row_pattern = r"""  const renderProposalRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};"""
new_prop_row = """  const renderProposalRow = ({ assignment, proposalId }: ProposalReviewRow) => {
    const bundle = proposalBundles[proposalId];
    const changes = bundle ? collectProposalChanges(bundle.proposal, bundle.profile).length : null;
    const status = bundle?.proposal.status || assignment.latestProposalStatus || 'UNKNOWN';

    return (
      <div className="monitoring-proposal-table-row" key={`${assignment.id}-${proposalId}`}>
        <button
          type="button"
          className="monitoring-company-link"
          onClick={() => setSelectedProposalId(proposalId)}
        >
          <strong>{assignment.companyName}</strong>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
            <>
              <strong>{assignment.assignedStaffName}</strong>
              <small style={{ color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</small>
            </>
          ) : (
            <span>{assignment.assignedStaffEmail}</span>
          )}
        </div>
        <span className={`workspace-badge ${proposalTone(status)}`}>{status}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{bundle ? formatDate(bundle.proposal.createdAt) : '-'}</strong>
          <small style={{ color: 'var(--text-secondary)' }}>{changes === null ? 'Loading...' : `${changes} changed fields`}</small>
        </div>
        <button
          type="button"
          className="project-activate-btn"
          onClick={() => setSelectedProposalId(proposalId)}
        >
          Review
        </button>
      </div>
    );
  };"""
content = re.sub(prop_row_pattern, new_prop_row, content, flags=re.DOTALL)

# 3. Fix renderHistoryRow
hist_row_pattern = r"""  const renderHistoryRow = \(\{ assignment, proposalId \}: ProposalReviewRow\) => \{.*?    \);\n  \};"""
new_hist_row = """  const renderHistoryRow = ({ assignment, proposalId }: ProposalReviewRow) => {
    const bundle = proposalBundles[proposalId];
    const status = bundle?.proposal.status || assignment.latestProposalStatus || 'UNKNOWN';

    return (
      <div className="monitoring-history-row" key={`${assignment.id}-${proposalId}`}>
        <div>
          <strong>{assignment.companyName}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
            <>
              <strong>{assignment.assignedStaffName}</strong>
              <small style={{ color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</small>
            </>
          ) : (
            <span>{assignment.assignedStaffEmail}</span>
          )}
        </div>
        <span className={`workspace-badge ${proposalTone(status)}`}>{status}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{formatDate(bundle?.proposal.updatedAt || assignment.updatedAt)}</strong>
        </div>
        <button
          type="button"
          className="project-detail-btn"
          onClick={() => setSelectedProposalId(proposalId)}
        >
          View
        </button>
      </div>
    );
  };"""
content = re.sub(hist_row_pattern, new_hist_row, content, flags=re.DOTALL)

# 4. Apply Modal Redesign
modal_pattern = r"""      \{selectedProposalId && \(.*?        </div>\n      \)\}"""
new_modal = """      {selectedProposalId && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={closeReviewModal}>
          <div
            className="admin-modal monitoring-review-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ position: 'relative', padding: '32px' }}
          >
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Monitoring Proposal Review
              </h3>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                {selectedProposalAssignment?.companyName || 'Company profile update proposal'}
              </p>
              <button type="button" className="workspace-icon-btn" onClick={closeReviewModal} aria-label="Close review modal" style={{ position: 'absolute', top: '24px', right: '24px' }}>
                <XCircle size={24} color="var(--text-secondary)" />
              </button>
            </div>

            {!selectedProposalBundle ? (
              <div className="workspace-empty">Loading proposal detail...</div>
            ) : (
              <>
                {selectedProposalBundle.error && <div className="admin-form-error" style={{ marginBottom: '16px' }}>{selectedProposalBundle.error}</div>}
                {decisionError && <div className="admin-form-error" style={{ marginBottom: '16px' }}>{decisionError}</div>}

                {/* Status badge + summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span className={`workspace-badge ${proposalTone(selectedProposalBundle.proposal.status)}`}>
                    {selectedProposalBundle.proposal.status}
                  </span>
                  <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {selectedProposalBundle.proposal.changeSummary || 'Staff monitoring updates'}
                  </span>
                </div>

                {/* Meta grid */}
                <div className="monitoring-review-meta">
                  <div>
                    <span>Submitted by</span>
                    <strong>{selectedProposalAssignment?.assignedStaffName || selectedProposalBundle.proposal.submittedBy || '-'}</strong>
                  </div>
                  <div>
                    <span>Submitted</span>
                    <strong>{formatDate(selectedProposalBundle.proposal.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Review cycle</span>
                    <strong>{selectedProposalAssignment ? frequencyLabel(selectedProposalAssignment.frequency) : '-'}</strong>
                  </div>
                  <div>
                    <span>Changes</span>
                    <strong>{selectedProposalChanges.length} field{selectedProposalChanges.length !== 1 ? 's' : ''}</strong>
                  </div>
                </div>

                {!selectedProposalBundle.profile && (
                  <div className="monitoring-limit-note danger">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Official profile unavailable</strong>
                      <p>Approval is disabled because current values cannot be verified from /company-profiles.</p>
                    </div>
                  </div>
                )}

                {/* Change list */}
                <div className="monitoring-change-list">
                  {selectedProposalChanges.length ? (
                    selectedProposalChanges.map((change) => (
                      <article className="monitoring-change-card" key={change.key}>
                        <header>
                          <span>{change.source}</span>
                          <strong>{change.label}</strong>
                        </header>
                        <div className="monitoring-change-values">
                          <div className="monitoring-value-box">
                            <span>Current</span>
                            <div style={{ marginTop: '8px', color: 'var(--text-primary)', font: '400 var(--text-body)/1.5 \"Inter\", sans-serif' }}>
                              <ValueDisplay value={change.currentValue} />
                            </div>
                          </div>
                          <div className="monitoring-value-box proposed">
                            <span>Proposed</span>
                            <div style={{ marginTop: '8px', color: 'var(--text-primary)', font: '400 var(--text-body)/1.5 \"Inter\", sans-serif' }}>
                              <ValueDisplay value={change.proposedValue} />
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="workspace-empty">
                      No changed fields were detected in the loaded proposal payload.
                    </div>
                  )}
                </div>

                {/* Confirmation dialog */}
                {confirmAction && (
                  <div className={`monitoring-review-confirm ${confirmAction}`}>
                    <div>
                      {confirmAction === 'approve' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      <strong>{confirmAction === 'approve' ? 'Approve this proposal?' : 'Reject this proposal?'}</strong>
                    </div>
                    <p>
                      {confirmAction === 'approve'
                        ? 'The backend will apply proposed fields to the official company profile and update the proposal status.'
                        : 'The backend reject endpoint does not accept a reason body yet, so a rejection note cannot be saved from this screen.'}
                    </p>
                    <div>
                      <button type="button" className="btn btn-secondary" onClick={() => setConfirmAction(null)} disabled={decisionLoading}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={confirmAction === 'approve' ? 'btn btn-primary' : 'btn btn-danger'}
                        onClick={handleProposalDecision}
                        disabled={decisionLoading}
                      >
                        {decisionLoading ? 'Submitting...' : confirmAction === 'approve' ? 'Approve' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--workspace-muted-border)', paddingTop: '24px' }}>
                  {isPendingProposalStatus(selectedProposalBundle.proposal.status) ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setConfirmAction('reject')}
                        disabled={decisionLoading}
                        style={{ padding: '10px 20px', fontWeight: 600 }}
                      >
                        Reject proposal
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setConfirmAction('approve')}
                        disabled={!canReviewSelected || decisionLoading}
                        style={{ padding: '10px 20px', fontWeight: 600 }}
                      >
                        Approve proposal
                      </button>
                    </>
                  ) : (
                    <span className="workspace-badge neutral">
                      Reviewed by {selectedProposalBundle.proposal.reviewedBy || 'backend'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}"""
content = re.sub(modal_pattern, new_modal, content, flags=re.DOTALL)

# 7. Inject ValueDisplay
value_display_code = """
const ValueDisplay = ({ value, level = 0 }: { value: unknown; level?: number }) => {
  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-muted)' }}>-</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  
  if (typeof value === 'string') {
    if (value.startsWith('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.jpeg') || value.includes('.webp'))) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', wordBreak: 'break-all' }}>{value}</a>
        </div>
      );
    }
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{value}</a>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</span>;
  }
  
  if (typeof value === 'number') return <span>{value}</span>;

  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return <span>{value.join(', ')}</span>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {value.map((item, i) => (
          <div key={i} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.4)' }}>
            <ValueDisplay value={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const hiddenKeys = ['notes', 'researchedAt', 'researchedBy', 'taskId'];
    const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !hiddenKeys.includes(k));
    
    if (!entries.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <ValueDisplay value={v} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

export const CompanyMonitoringPage"""

content = content.replace('export const CompanyMonitoringPage', value_display_code)

# 8. Fix unused imports: ArrowLeft
content = content.replace('import { AlertTriangle, ArrowLeft, CheckCircle, Plus, XCircle } from \'lucide-react\';', 'import { AlertTriangle, CheckCircle, Plus, XCircle } from \'lucide-react\';')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied manual fixes")
