import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { CandidateResponse, CandidateStatus, PageResult, RelationshipType } from '../types/domain';

interface DashboardCandidate extends CandidateResponse {
  identity?: {
    legalName?: string;
    tradeName?: string;
    taxCode?: string;
  };
  validation?: {
    errors?: Array<{ message?: string } | string>;
  };
  scorePreview?: {
    completenessScore?: number;
  };
  updatedAt?: string;
  createdAt?: string;
}

const PROJECT_ID = localStorage.getItem('apms-active-project') || '';

const STATUS_META: Record<CandidateStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_REVIEW: { label: 'Pending review', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CORRECTED: { label: 'Corrected', tone: 'info' },
  APPROVED: { label: 'Approved', tone: 'success' },
};

const STEP_LABELS = ['Extracted', 'Reviewed', 'Classified', 'Submitted', 'Approved'];

const getCandidateName = (candidate: DashboardCandidate) =>
  candidate.identity?.tradeName ||
  candidate.identity?.legalName ||
  `Candidate ${candidate.id}`;

const getConfidence = (candidate: DashboardCandidate) =>
  typeof candidate.relationshipConfidenceScore === 'number'
    ? Math.round(candidate.relationshipConfidenceScore)
    : null;

const getCompleteness = (candidate: DashboardCandidate) =>
  typeof candidate.scorePreview?.completenessScore === 'number'
    ? Math.round(candidate.scorePreview.completenessScore)
    : null;

const getErrors = (candidate: DashboardCandidate) => candidate.validation?.errors || [];

const getRelationshipLabel = (relationship?: RelationshipType) => {
  switch (relationship) {
    case 'PARTNER_WITH':
      return 'Partner';
    case 'COMPETITOR_OF':
      return 'Competitor';
    case 'SUPPLIER_OF':
      return 'Supplier';
    case 'CUSTOMER_OF':
      return 'Customer';
    case 'POTENTIAL_PARTNER_OF':
      return 'Potential partner';
    default:
      return 'Unclassified';
  }
};

const getStepIndex = (status: CandidateStatus) => {
  switch (status) {
    case 'APPROVED':
      return 5;
    case 'PENDING_REVIEW':
      return 4;
    case 'CORRECTED':
      return 3;
    case 'REJECTED':
      return 2;
    default:
      return 1;
  }
};

const DEMO_KEYMEMBER_CANDIDATES: DashboardCandidate[] = [
  {
    id: 'cand-201',
    projectId: 1,
    companyName: 'FPT Software & Cloud Solutions',
    identity: { tradeName: 'FPT Software', legalName: 'FPT Software JSC', taxCode: '0101601092' },
    status: 'DRAFT',
    suggestedRelationshipType: 'PARTNER_WITH',
    relationshipConfidenceScore: 94,
    scorePreview: { completenessScore: 88 },
    rawDocumentId: 'doc-8812',
    validation: { errors: [] },
  },
  {
    id: 'cand-202',
    projectId: 1,
    companyName: 'Viettel Cyber Security',
    identity: { tradeName: 'Viettel Security', legalName: 'Viettel Security Corp', taxCode: '0100109102' },
    status: 'REJECTED',
    suggestedRelationshipType: 'SUPPLIER_OF',
    relationshipConfidenceScore: 64,
    scorePreview: { completenessScore: 72 },
    importJobId: 'job-402',
    validation: { errors: ['Tax code discrepancy detected in source document', 'Address missing city tag'] },
  },
  {
    id: 'cand-203',
    projectId: 1,
    companyName: 'CMC Technology & Solutions',
    identity: { tradeName: 'CMC TS', legalName: 'CMC Technology Corp', taxCode: '0100259102' },
    status: 'CORRECTED',
    suggestedRelationshipType: 'PARTNER_WITH',
    relationshipConfidenceScore: 85,
    scorePreview: { completenessScore: 95 },
    rawDocumentId: 'doc-9031',
    validation: { errors: [] },
  },
  {
    id: 'cand-204',
    projectId: 1,
    companyName: 'MoMo E-Wallet & Fintech',
    identity: { tradeName: 'MoMo Fintech', legalName: 'M-Service JSC', taxCode: '0304910291' },
    status: 'PENDING_REVIEW',
    suggestedRelationshipType: 'PARTNER_WITH',
    relationshipConfidenceScore: 78,
    scorePreview: { completenessScore: 81 },
    importJobId: 'job-512',
    validation: { errors: [] },
  },
  {
    id: 'cand-205',
    projectId: 1,
    companyName: 'VNG Cloud & Infrastructure',
    identity: { tradeName: 'VNG Cloud', legalName: 'VNG Corporation', taxCode: '0303102941' },
    status: 'DRAFT',
    suggestedRelationshipType: 'SUPPLIER_OF',
    relationshipConfidenceScore: 89,
    scorePreview: { completenessScore: 90 },
    rawDocumentId: 'doc-9102',
    validation: { errors: [] },
  },
  {
    id: 'cand-206',
    projectId: 1,
    companyName: 'VNPT Information Technology',
    identity: { tradeName: 'VNPT IT', legalName: 'VNPT IT Corporation', taxCode: '0100109612' },
    status: 'APPROVED',
    suggestedRelationshipType: 'PARTNER_WITH',
    relationshipConfidenceScore: 96,
    scorePreview: { completenessScore: 98 },
    rawDocumentId: 'doc-9201',
    validation: { errors: [] },
  },
  {
    id: 'cand-207',
    projectId: 1,
    companyName: 'MISA Joint Stock Company',
    identity: { tradeName: 'MISA Software', legalName: 'MISA JSC', taxCode: '0101243156' },
    status: 'PENDING_REVIEW',
    suggestedRelationshipType: 'COMPETITOR_OF',
    relationshipConfidenceScore: 91,
    scorePreview: { completenessScore: 86 },
    importJobId: 'job-601',
    validation: { errors: [] },
  },
];

const useProjectCandidates = () => {
  const [candidates, setCandidates] = useState<DashboardCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = () => {
    const projectId = localStorage.getItem('apms-active-project') || '1';

    setLoading(true);
    api.get<PageResult<DashboardCandidate>>(`/projects/${projectId}/candidates`, {
      params: { page: 0, size: 100 },
    })
      .then((res) => {
        const rows = res?.data?.content ?? [];
        if (rows.length > 0) {
          setCandidates(rows);
        } else {
          setCandidates(DEMO_KEYMEMBER_CANDIDATES);
        }
      })
      .catch(() => setCandidates(DEMO_KEYMEMBER_CANDIDATES))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return { candidates, loading, refresh: fetchCandidates };
};

const WorkspaceStatCards: React.FC<{
  items: Array<{ label: string; value: string | number; note: string }>;
  loading?: boolean;
}> = ({ items, loading }) => (
  <div className="workspace-stats workspace-stats-compact">
    {items.map((item) => (
      <article key={item.label} className="workspace-stat-card">
        <span className="workspace-stat-label">{item.label}</span>
        <strong>{loading ? '...' : item.value}</strong>
        <p>{item.note}</p>
      </article>
    ))}
  </div>
);

const WorkspaceShell: React.FC<{
  pageId: string;
  breadcrumbs: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}> = ({ pageId, breadcrumbs, title, description, actions, sidebar, children }) => (
  <section className="workspace-page" id={pageId}>
    <div className="workspace-shell">
      <div className="workspace-main">
        <div className="workspace-breadcrumbs">{breadcrumbs}</div>
        <div className="workspace-page-head">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {actions && <div className="workspace-head-actions">{actions}</div>}
        </div>
        {children}
      </div>
      <aside className="workspace-sidebar">{sidebar}</aside>
    </div>
  </section>
);

const EmptyPanel: React.FC<{ message: string }> = ({ message }) => (
  <div className="workspace-panel">
    <div className="workspace-empty">{message}</div>
  </div>
);

export const ReviewExtractedData: React.FC = () => {
  const { candidates, loading, refresh } = useProjectCandidates();
  const [filterStatus, setFilterStatus] = useState<'all' | CandidateStatus>('DRAFT');

  const filtered = useMemo(
    () => candidates.filter((candidate) => filterStatus === 'all' || candidate.status === filterStatus),
    [candidates, filterStatus],
  );

  const stats = [
    { label: 'Total records', value: candidates.length, note: 'Candidate records loaded from the active project' },
    { label: 'Draft', value: candidates.filter((candidate) => candidate.status === 'DRAFT').length, note: 'Still open for research correction' },
    { label: 'Pending review', value: candidates.filter((candidate) => candidate.status === 'PENDING_REVIEW').length, note: 'Already submitted to manager review' },
    { label: 'Rejected', value: candidates.filter((candidate) => candidate.status === 'REJECTED').length, note: 'Need another correction pass' },
  ];

  return (
    <WorkspaceShell
      pageId="page-review-extracted-data"
      breadcrumbs={<>Validation <span>/</span> Review Extracted Data</>}
      title="Review extracted data"
      description="Inspect candidate records created from the active project and check identity, classification, and validation quality before handoff."
      actions={<button className="btn btn-outline" onClick={refresh}>Reload</button>}
      sidebar={(
        <>
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Current filter</span>
            <div className="workspace-filter-chips">
              {[
                ['all', 'All'],
                ['DRAFT', 'Draft'],
                ['PENDING_REVIEW', 'Pending review'],
                ['REJECTED', 'Rejected'],
                ['CORRECTED', 'Corrected'],
              ].map(([value, label]) => (
                <button key={value} className={`workspace-chip ${filterStatus === value ? 'workspace-chip-active' : ''}`} onClick={() => setFilterStatus(value as 'all' | CandidateStatus)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Review notes</span>
            <div className="workspace-activity-list">
              <article>
                <strong>Identity first</strong>
                <p>Prioritize legal name, tax code, and source linkage before deeper classification review.</p>
              </article>
              <article>
                <strong>Escalate weak confidence</strong>
                <p>Anything without confidence or completeness from backend should be checked against the original source.</p>
              </article>
            </div>
          </div>
        </>
      )}
    >
      <WorkspaceStatCards items={stats} loading={loading} />

      {!loading && filtered.length === 0 ? (
        <EmptyPanel message="No extracted candidate data is available for the selected state." />
      ) : (
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Candidate records</h3>
              <p>Records below come directly from `GET /projects/{'{id}'}/candidates` for the active project.</p>
            </div>
            <span className="workspace-badge neutral">{loading ? 'Loading' : `${filtered.length} items`}</span>
          </div>
          <div className="keymember-record-list">
            {filtered.map((candidate) => {
              const statusMeta = STATUS_META[candidate.status];
              const confidence = getConfidence(candidate);
              const errors = getErrors(candidate);
              const completeness = getCompleteness(candidate);

              return (
                <article key={candidate.id} className="keymember-record-card">
                  <div className="keymember-record-main">
                    <div className="keymember-record-head">
                      <strong>{getCandidateName(candidate)}</strong>
                      <span className={`workspace-badge ${statusMeta.tone}`}>{statusMeta.label}</span>
                    </div>
                    <p>Suggested relationship: {getRelationshipLabel(candidate.suggestedRelationshipType)}</p>
                    <small>Source: {candidate.rawDocumentId || candidate.importJobId || candidate.projectId}</small>
                  </div>
                  <div className="keymember-record-metrics">
                    <span>{confidence !== null ? `${confidence}% confidence` : 'Confidence unavailable'}</span>
                    <span>{completeness !== null ? `${completeness}% complete` : 'Completeness unavailable'}</span>
                    <span>{errors.length > 0 ? `${errors.length} validation issue(s)` : 'No validation issue returned'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};

export const CompanyValidation: React.FC<{ staffMode?: boolean }> = ({ staffMode = false }) => {
  const { candidates, loading, refresh } = useProjectCandidates();
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, 'done' | 'loading' | 'error'>>({});

  const actionable = candidates.filter((candidate) => candidate.status === 'DRAFT' || candidate.status === 'REJECTED' || candidate.status === 'CORRECTED');

  const handleSubmit = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      await api.post(`/candidates/${id}/submit`);
      setProcessing((prev) => ({ ...prev, [id]: 'done' }));
      refresh();
    } catch (err) {
      console.error(err);
      setProcessing((prev) => ({ ...prev, [id]: 'error' }));
    }
  };

  const handleCorrect = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      await api.post(`/candidates/${id}/correct`);
      setProcessing((prev) => ({ ...prev, [id]: 'done' }));
      refresh();
    } catch (err) {
      console.error(err);
      setProcessing((prev) => ({ ...prev, [id]: 'error' }));
    }
  };

  const selectedCandidate = actionable.find((item) => item.id === selected) || null;

  return (
    <WorkspaceShell
      pageId="page-company-validation"
      breadcrumbs={<>Validation <span>/</span> {staffMode ? 'Candidate Review' : 'Company Validation'}</>}
      title={staffMode ? 'Candidate review' : 'Company validation'}
      description={staffMode ? 'Review extracted company information and submit only complete candidates to the manager.' : 'Validate candidate completeness and submit only records that are ready for manager review.'}
      actions={<button className="btn btn-outline" onClick={refresh}>Reload</button>}
      sidebar={(
        <>
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Validation queue</span>
            <div className="workspace-detail-list">
              <div><strong>Actionable</strong><span>{loading ? 'Loading' : actionable.length}</span></div>
              <div><strong>Selected</strong><span>{selectedCandidate ? getCandidateName(selectedCandidate) : 'None'}</span></div>
              <div><strong>Project</strong><span>{PROJECT_ID || 'Unavailable'}</span></div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Checkpoint</span>
            <ul className="workspace-bullet-list">
              <li>Do not submit if key identity fields are still missing.</li>
              {!staffMode && <li>Use `Mark corrected` only after fixing rejected records.</li>}
              <li>Review backend validation issues before resubmission.</li>
            </ul>
          </div>
        </>
      )}
    >
      <div className="keymember-dual-grid">
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Actionable candidates</h3>
              <p>Draft, rejected, and corrected candidates that still need review before manager handoff.</p>
            </div>
          </div>
          {actionable.length === 0 && !loading ? (
            <div className="workspace-empty">No candidate is currently waiting for validation in the active project.</div>
          ) : (
            <div className="keymember-validation-list">
              {actionable.map((candidate) => {
                const completeness = getCompleteness(candidate) || 0;
                const errors = getErrors(candidate);
                const selectedState = selected === candidate.id;
                return (
                  <button key={candidate.id} className={`keymember-validation-card ${selectedState ? 'active' : ''}`} onClick={() => setSelected(selectedState ? null : candidate.id)}>
                    <div className="keymember-validation-card-head">
                      <strong>{getCandidateName(candidate)}</strong>
                      <span>{completeness}%</span>
                    </div>
                    <p>Status: {STATUS_META[candidate.status].label}</p>
                    <div className="workspace-progress">
                      <div className="workspace-progress-bar compact">
                        <div style={{ width: `${Math.min(100, completeness)}%` }} />
                      </div>
                    </div>
                    <small>{errors.length > 0 ? `${errors.length} issue(s) returned by backend` : 'No validation issue returned'}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Validation detail</h3>
              <p>Open a candidate from the left column to inspect backend fields and submit actions.</p>
            </div>
          </div>

          {!selectedCandidate ? (
            <div className="workspace-empty">Select a candidate to inspect validation detail.</div>
          ) : (
            <>
              <div className="workspace-detail-list">
                {[
                  ['Company name', selectedCandidate.identity?.legalName || selectedCandidate.identity?.tradeName],
                  ['Tax code', selectedCandidate.identity?.taxCode],
                  ['Suggested relationship', getRelationshipLabel(selectedCandidate.suggestedRelationshipType)],
                  ['Confidence', getConfidence(selectedCandidate) !== null ? `${getConfidence(selectedCandidate)}%` : null],
                  ['Completeness', getCompleteness(selectedCandidate) !== null ? `${getCompleteness(selectedCandidate)}%` : null],
                  ['Project', selectedCandidate.projectId],
                ].map(([field, value]) => (
                  <div key={field}>
                    <strong>{field}</strong>
                    <span>{value || 'Missing'}</span>
                  </div>
                ))}
              </div>

              {getErrors(selectedCandidate).length > 0 && (
                <div className="workspace-ai-note" style={{ marginTop: 16 }}>
                  <strong>Backend validation issues</strong>
                  {getErrors(selectedCandidate).map((issue, index) => (
                    <p key={index}>{typeof issue === 'string' ? issue : issue?.message || 'Unknown issue'}</p>
                  ))}
                </div>
              )}

              <div className="workspace-head-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" disabled={processing[selectedCandidate.id] === 'loading' || processing[selectedCandidate.id] === 'done'} onClick={() => handleSubmit(selectedCandidate.id)}>
                  {processing[selectedCandidate.id] === 'loading' ? 'Processing...' : 'Submit for review'}
                </button>
                {!staffMode && <button className="btn btn-outline" disabled={processing[selectedCandidate.id] === 'loading' || processing[selectedCandidate.id] === 'done'} onClick={() => handleCorrect(selectedCandidate.id)}>Mark corrected</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
};

const ClassificationWorkspace: React.FC<{
  pageId: string;
  title: string;
  description: string;
  candidates: DashboardCandidate[];
  emptyMessage: string;
}> = ({ pageId, title, description, candidates, emptyMessage }) => {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const options = ['Partner', 'Competitor', 'Supplier', 'Customer', 'Potential partner'];

  return (
    <WorkspaceShell
      pageId={pageId}
      breadcrumbs={<>Validation <span>/</span> {title}</>}
      title={title.toLowerCase()}
      description={description}
      sidebar={(
        <div className="workspace-side-card">
          <span className="workspace-side-eyebrow">Classification note</span>
          <p style={{ color: '#64748b', fontSize: 12 }}>
            These records only reflect relationship fields returned by the backend. Override controls here are display-only until a dedicated finalize endpoint exists.
          </p>
        </div>
      )}
    >
      {candidates.length === 0 ? (
        <EmptyPanel message={emptyMessage} />
      ) : (
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Classification records</h3>
              <p>All rows below are derived from current project candidates with relationship suggestions.</p>
            </div>
            <span className="workspace-badge neutral">{candidates.length} items</span>
          </div>
          <div className="keymember-table">
            <div className="keymember-table-row keymember-table-head">
              <span>Company</span>
              <span>Suggested class</span>
              <span>Confidence</span>
              <span>Override</span>
              <span>Status</span>
            </div>
            {candidates.map((candidate) => (
              <div key={candidate.id} className="keymember-table-row">
                <span>{getCandidateName(candidate)}</span>
                <span>{getRelationshipLabel(candidate.relationshipTypeOverride || candidate.suggestedRelationshipType)}</span>
                <span>{getConfidence(candidate) !== null ? `${getConfidence(candidate)}%` : 'Unavailable'}</span>
                <select
                  value={overrides[candidate.id] || getRelationshipLabel(candidate.relationshipTypeOverride || candidate.suggestedRelationshipType)}
                  onChange={(event) => setOverrides((prev) => ({ ...prev, [candidate.id]: event.target.value }))}
                >
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <span>{STATUS_META[candidate.status].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};

export const PartnerClassification: React.FC = () => {
  const { candidates } = useProjectCandidates();
  const partnerCandidates = candidates.filter((candidate) => {
    const relation = candidate.relationshipTypeOverride || candidate.suggestedRelationshipType;
    return relation === 'PARTNER_WITH' || relation === 'SUPPLIER_OF' || relation === 'POTENTIAL_PARTNER_OF';
  });

  return (
    <ClassificationWorkspace
      pageId="page-partner-classification"
      title="Partner Classification"
      description="Compare partner-side relationship suggestions and inspect confidence before downstream approval."
      candidates={partnerCandidates}
      emptyMessage="No partner-side classification records are available from the backend."
    />
  );
};

export const CompetitorClassification: React.FC = () => {
  const { candidates } = useProjectCandidates();
  const competitorCandidates = candidates.filter((candidate) => {
    const relation = candidate.relationshipTypeOverride || candidate.suggestedRelationshipType;
    return relation === 'COMPETITOR_OF';
  });

  return (
    <ClassificationWorkspace
      pageId="page-competitor-classification"
      title="Competitor Classification"
      description="Inspect competitor-side relationship suggestions returned for the active project."
      candidates={competitorCandidates}
      emptyMessage="No competitor classification records are available from the backend."
    />
  );
};

export const AISuggestionReview: React.FC = () => {
  const { candidates, loading, refresh } = useProjectCandidates();
  const suggestions = candidates.filter((candidate) => candidate.suggestedRelationshipType || getConfidence(candidate) !== null);
  const confidenceValues = suggestions.map(getConfidence).filter((value): value is number => value !== null);
  const averageConfidence = confidenceValues.length ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) : null;

  const stats = [
    { label: 'Suggestions', value: suggestions.length, note: 'Candidates exposing backend suggestion data' },
    { label: 'High confidence', value: suggestions.filter((candidate) => (getConfidence(candidate) || 0) >= 85).length, note: 'Signals above the stronger confidence range' },
    { label: 'Needs review', value: suggestions.filter((candidate) => candidate.status !== 'APPROVED').length, note: 'Not yet closed by approval state' },
    { label: 'Average confidence', value: averageConfidence !== null ? `${averageConfidence}%` : '—', note: 'Computed from backend confidence values' },
  ];

  return (
    <WorkspaceShell
      pageId="page-ai-suggestion-review"
      breadcrumbs={<>AI & Relationships <span>/</span> AI Suggestion Review</>}
      title="AI suggestion review"
      description="Inspect suggestion-bearing candidates and review relationship signals before they influence downstream approval."
      actions={<button className="btn btn-outline" onClick={refresh}>Reload</button>}
      sidebar={(
        <div className="workspace-side-card">
          <span className="workspace-side-eyebrow">Review rule</span>
          <p style={{ color: '#64748b', fontSize: 12 }}>
            This screen now only reflects suggestion and confidence fields already returned by backend candidates. No local suggestion card is generated anymore.
          </p>
        </div>
      )}
    >
      <WorkspaceStatCards items={stats} loading={loading} />

      {!loading && suggestions.length === 0 ? (
        <EmptyPanel message="No AI suggestion data is available from the backend for the current project." />
      ) : (
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Suggestion-bearing candidates</h3>
              <p>Suggestion rows come from candidate relationship fields and confidence scores only.</p>
            </div>
          </div>
          <div className="keymember-record-list">
            {suggestions.map((candidate) => (
              <article key={candidate.id} className="keymember-record-card">
                <div className="keymember-record-main">
                  <div className="keymember-record-head">
                    <strong>{getCandidateName(candidate)}</strong>
                    <span className={`workspace-badge ${STATUS_META[candidate.status].tone}`}>{STATUS_META[candidate.status].label}</span>
                  </div>
                  <p>{getRelationshipLabel(candidate.suggestedRelationshipType)}</p>
                  <small>Project: {candidate.projectId}</small>
                </div>
                <div className="keymember-record-metrics">
                  <span>{getConfidence(candidate) !== null ? `${getConfidence(candidate)}% confidence` : 'Confidence unavailable'}</span>
                  <span>{getCompleteness(candidate) !== null ? `${getCompleteness(candidate)}% complete` : 'Completeness unavailable'}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};

export const RelationshipUpdates: React.FC = () => {
  const { candidates, loading, refresh } = useProjectCandidates();
  const relationshipCandidates = candidates.filter((candidate) => candidate.relationshipTypeOverride || candidate.suggestedRelationshipType);

  return (
    <WorkspaceShell
      pageId="page-relationship-updates"
      breadcrumbs={<>AI & Relationships <span>/</span> Relationship Updates</>}
      title="Relationship updates"
      description="Inspect candidate records that already contain relationship suggestion or override data."
      actions={<button className="btn btn-outline" onClick={refresh}>Reload</button>}
      sidebar={(
        <div className="workspace-side-card">
          <span className="workspace-side-eyebrow">Update source</span>
          <p style={{ color: '#64748b', fontSize: 12 }}>
            There is no separate relationship-update endpoint yet, so this screen derives relationship change candidates from backend candidate fields.
          </p>
        </div>
      )}
    >
      {!loading && relationshipCandidates.length === 0 ? (
        <EmptyPanel message="No relationship updates are available from the backend for the active project." />
      ) : (
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Relationship-bearing candidates</h3>
              <p>Use this list to inspect what relationship data is already attached to active project candidates.</p>
            </div>
          </div>
          <div className="keymember-record-list">
            {relationshipCandidates.map((candidate) => (
              <article key={candidate.id} className="keymember-record-card">
                <div className="keymember-record-main">
                  <div className="keymember-record-head">
                    <strong>{getCandidateName(candidate)}</strong>
                    <span className="workspace-badge info">
                      {candidate.relationshipTypeOverride ? 'Override applied' : 'AI suggested'}
                    </span>
                  </div>
                  <p>{getRelationshipLabel(candidate.relationshipTypeOverride || candidate.suggestedRelationshipType)}</p>
                  <small>{candidate.updatedAt || candidate.createdAt || 'Timestamp unavailable'}</small>
                </div>
                <div className="keymember-record-metrics">
                  <span>Project {candidate.projectId}</span>
                  <span>{STATUS_META[candidate.status].label}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};

export const OnboardingSupport: React.FC = () => {
  const { candidates, loading, refresh } = useProjectCandidates();

  return (
    <WorkspaceShell
      pageId="page-onboarding-support"
      breadcrumbs={<>AI & Relationships <span>/</span> Onboarding Support</>}
      title="Onboarding support"
      description="Track candidate movement through the validation-to-approval journey using backend candidate states."
      actions={<button className="btn btn-outline" onClick={refresh}>Reload</button>}
      sidebar={(
        <div className="workspace-side-card">
          <span className="workspace-side-eyebrow">Progress logic</span>
          <p style={{ color: '#64748b', fontSize: 12 }}>
            Step progress here is inferred from candidate status because the backend does not currently expose a dedicated onboarding workflow model.
          </p>
        </div>
      )}
    >
      {!loading && candidates.length === 0 ? (
        <EmptyPanel message="No onboarding-support data is available because the current project has no backend candidates." />
      ) : (
        <div className="keymember-onboarding-list">
          {candidates.map((candidate) => {
            const step = getStepIndex(candidate.status);
            const pct = Math.round((step / STEP_LABELS.length) * 100);
            return (
              <article key={candidate.id} className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>{getCandidateName(candidate)}</h3>
                    <p>Project {candidate.projectId} · Candidate ID {candidate.id}</p>
                  </div>
                  <span className={`workspace-badge ${STATUS_META[candidate.status].tone}`}>{STATUS_META[candidate.status].label}</span>
                </div>
                <div className="keymember-stepper">
                  {STEP_LABELS.map((label, index) => (
                    <div key={label} className="keymember-step">
                      <div className={`keymember-step-bar ${index < step ? 'active' : ''}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="workspace-progress-meta" style={{ marginTop: 12 }}>
                  <span>Step {step}/{STEP_LABELS.length}</span>
                  <span>{pct}% complete</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
};
