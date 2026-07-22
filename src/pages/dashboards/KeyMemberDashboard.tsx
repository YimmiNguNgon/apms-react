import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { CandidateResponse, DashboardSummaryDto, PageResult } from '../../types/domain';
import { useUser } from '../../context/UserContext';

interface Props {
  setActivePage?: (page: string) => void;
}

interface DashboardCandidate extends CandidateResponse {
  identity?: {
    legalName?: string;
    tradeName?: string;
  };
  validation?: {
    errors?: Array<{ message?: string } | string>;
  };
  scorePreview?: {
    completenessScore?: number;
  };
}

const workflowStages = [
  { title: 'Extracted data', label: 'Inspect AI-extracted company details before correction.', route: 'review-extracted-data' },
  { title: 'Data correction', label: 'Fix fields that are incomplete, inconsistent, or unsupported.', route: 'review-extracted-data' },
  { title: 'Classification review', label: 'Compare AI suggestions with real business context.', route: 'ai-suggestion-review' },
  { title: 'Classification decision', label: 'Adjust partner, supplier, or competitor status when needed.', route: 'partner-classification' },
  { title: 'Candidate handoff', label: 'Prepare validated records for the candidate pipeline.', route: 'company-validation' },
  { title: 'Manager readiness', label: 'Make sure the profile is clean before final review.', route: 'company-validation' },
];

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

const getStatusMeta = (candidate: DashboardCandidate) => {
  switch (candidate.status) {
    case 'REJECTED':
      return { label: 'Needs correction', badge: 'danger', route: 'company-validation' };
    case 'CORRECTED':
      return { label: 'Ready to resubmit', badge: 'info', route: 'company-validation' };
    case 'PENDING_REVIEW':
      return { label: 'Awaiting manager review', badge: 'success', route: 'company-validation' };
    case 'APPROVED':
      return { label: 'Approved', badge: 'success', route: 'company-validation' };
    default:
      return { label: 'Ready to verify', badge: 'neutral', route: 'review-extracted-data' };
  }
};

const getModuleLabel = (candidate: DashboardCandidate) => {
  if (candidate.status === 'REJECTED' || candidate.status === 'CORRECTED') return 'Company validation';
  if (candidate.suggestedRelationshipType) return 'Classification review';
  return 'Extracted data review';
};

const getSourceLabel = (candidate: DashboardCandidate) => {
  if (candidate.importJobId) return `Import job ${candidate.importJobId}`;
  if (candidate.rawDocumentId) return `Raw document ${candidate.rawDocumentId}`;
  return `Project ${candidate.projectId}`;
};

const DEMO_SUMMARY: DashboardSummaryDto = {
  totalCompanyProfiles: 48,
  totalProjects: 6,
  totalCandidates: 24,
  approvedCandidates: 14,
  pendingReviewCandidates: 8,
  rejectedCandidates: 2,
};

const DEMO_CANDIDATES: DashboardCandidate[] = [
  {
    id: 'cand-101',
    projectId: 1,
    companyName: 'FPT Software & Cloud Solutions',
    identity: { tradeName: 'FPT Software', legalName: 'FPT Software JSC' },
    status: 'PENDING_REVIEW',
    suggestedRelationshipType: 'Strategic Tech Partner',
    relationshipConfidenceScore: 92,
    scorePreview: { completenessScore: 88 },
    rawDocumentId: 'doc-8812',
  },
  {
    id: 'cand-102',
    projectId: 1,
    companyName: 'Viettel Cyber Security',
    identity: { tradeName: 'Viettel Security', legalName: 'Viettel Security Corp' },
    status: 'REJECTED',
    suggestedRelationshipType: 'Security Vendor',
    relationshipConfidenceScore: 64,
    scorePreview: { completenessScore: 72 },
    importJobId: 'job-402',
  },
  {
    id: 'cand-103',
    projectId: 2,
    companyName: 'CMC Technology & Solutions',
    identity: { tradeName: 'CMC TS', legalName: 'CMC Technology Corp' },
    status: 'CORRECTED',
    suggestedRelationshipType: 'System Integrator',
    relationshipConfidenceScore: 85,
    scorePreview: { completenessScore: 95 },
    rawDocumentId: 'doc-9031',
  },
  {
    id: 'cand-104',
    projectId: 2,
    companyName: 'MoMo E-Wallet & Fintech',
    identity: { tradeName: 'MoMo Fintech', legalName: 'M-Service JSC' },
    status: 'PENDING_REVIEW',
    suggestedRelationshipType: 'Payment Gateway Partner',
    relationshipConfidenceScore: 78,
    scorePreview: { completenessScore: 81 },
    importJobId: 'job-512',
  },
  {
    id: 'cand-105',
    projectId: 3,
    companyName: 'VNG Cloud & Infrastructure',
    identity: { tradeName: 'VNG Cloud', legalName: 'VNG Corporation' },
    status: 'PENDING_REVIEW',
    suggestedRelationshipType: 'Cloud Infrastructure Supplier',
    relationshipConfidenceScore: 89,
    scorePreview: { completenessScore: 90 },
    rawDocumentId: 'doc-9102',
  },
];

export const KeyMemberDashboard: React.FC<Props> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [candidates, setCandidates] = useState<DashboardCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeProjectId = localStorage.getItem('apms-active-project');

    const requests: Promise<unknown>[] = [
      api.get<DashboardSummaryDto>('/dashboard/summary').then((res) => {
        if (res?.success && res.data && (res.data.totalCandidates || 0) > 0) {
          setSummary(res.data);
        } else {
          setSummary(DEMO_SUMMARY);
        }
      }).catch(() => setSummary(DEMO_SUMMARY)),
    ];

    if (activeProjectId) {
      requests.push(
        api.get<PageResult<DashboardCandidate>>(`/projects/${activeProjectId}/candidates`, {
          params: { page: 0, size: 50 },
        }).then((res) => {
          const rows = res?.data?.content ?? [];
          if (rows.length > 0) {
            setCandidates(rows);
          } else {
            setCandidates(DEMO_CANDIDATES);
          }
        }).catch(() => setCandidates(DEMO_CANDIDATES)),
      );
    } else {
      setCandidates(DEMO_CANDIDATES);
    }

    Promise.all(requests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const reviewQueue = candidates
    .filter((candidate) => candidate.status !== 'APPROVED')
    .slice(0, 6);

  const decisionSupportItems = candidates
    .filter((candidate) => candidate.suggestedRelationshipType || getConfidence(candidate) !== null)
    .slice(0, 4);

  const confidenceValues = candidates
    .map(getConfidence)
    .filter((value): value is number => value !== null);

  const averageConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : null;

  const progressPercent = summary?.totalCandidates
    ? Math.round(((summary.approvedCandidates ?? 0) / summary.totalCandidates) * 100)
    : 0;

  const pendingReviews = summary?.pendingReviewCandidates ?? reviewQueue.length;
  const updatedProfiles = summary?.totalCompanyProfiles ?? 0;
  const approvedCandidates = summary?.approvedCandidates ?? 0;
  const activeProjects = summary?.totalProjects ?? 0;

  const stats = [
    { label: 'Pending reviews', value: pendingReviews, note: 'Items waiting for senior validation' },
    { label: 'Profiles updated', value: updatedProfiles, note: 'Candidate records synced from the platform' },
    { label: 'Approved handoffs', value: approvedCandidates, note: 'Profiles already passed manager review' },
    { label: 'Active projects', value: activeProjects, note: 'Research streams currently assigned' },
  ];

  const priorityCandidate = reviewQueue[0] || null;
  const lowConfidenceCandidate = [...candidates]
    .filter((candidate) => getConfidence(candidate) !== null)
    .sort((a, b) => (getConfidence(a) ?? 0) - (getConfidence(b) ?? 0))[0];

  return (
    <section className="workspace-page role-dashboard role-dashboard-keymember" id="page-keymember-dashboard">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Validation <span>/</span> Key member workspace</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Validation desk</span>
              <h1>Key member dashboard</h1>
              <p>Review extracted intelligence, resolve weak evidence, and prepare records that are ready for manager-level approval.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setActivePage?.('review-extracted-data')}>Review extracted data</button>
              <button className="btn btn-primary" onClick={() => setActivePage?.('company-validation')}>Open validation queue</button>
            </div>
          </div>

          <div className="workspace-panel keymember-hero-panel role-focus-card keymember">
            <div className="keymember-hero">
              <div className="keymember-hero-copy">
                <span className="workspace-chip">Key member validation desk</span>
                <h2>Validate fast, but only promote records that can survive manager review.</h2>
                <p>
                  {loading
                    ? 'Syncing review queue, candidate quality signals, and summary metrics.'
                    : `${reviewQueue.length} records currently need your attention in the active project, and ${decisionSupportItems.length} candidates include classification or confidence signals that require a decision.`}
                </p>
                <div className="workspace-head-actions">
                  <button className="btn btn-light" onClick={() => setActivePage?.('ai-suggestion-review')}>Review classification signals</button>
                  <button className="btn btn-ghost-light" onClick={() => setActivePage?.('relationship-updates')}>Check relationship updates</button>
                </div>
              </div>

              <div className="keymember-hero-metrics">
                <article>
                  <strong>{loading ? '...' : reviewQueue.length}</strong>
                  <span>Review queue</span>
                </article>
                <article>
                  <strong>{loading ? '...' : averageConfidence !== null ? `${averageConfidence}%` : '—'}</strong>
                  <span>Average AI confidence</span>
                </article>
                <article>
                  <strong>{loading ? '...' : activeProjects}</strong>
                  <span>Projects in motion</span>
                </article>
              </div>
            </div>
          </div>

          {loading && <div className="workspace-inline-note">Loading senior research dashboard...</div>}

          <div className="workspace-stats workspace-stats-compact">
            {stats.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Current review focus</h3>
                <p>Work aligned to the extracted-data review and candidate handoff workflow.</p>
              </div>
              <button className="workspace-link-btn" onClick={() => setActivePage?.('company-validation')}>Open queue</button>
            </div>

            <div className="workspace-focus-card">
              <div className="workspace-focus-icon">SR</div>
              <div className="workspace-focus-copy">
                <div className="workspace-focus-title">
                  {priorityCandidate ? getCandidateName(priorityCandidate) : 'Prepare extracted candidates for manager review'}
                  <span className={`workspace-badge ${reviewQueue.length > 0 ? 'danger' : 'success'}`}>
                    {reviewQueue.length > 0 ? 'Priority window' : 'Queue clear'}
                  </span>
                </div>
                <p>
                  {priorityCandidate
                    ? `Current lead item is in ${getModuleLabel(priorityCandidate).toLowerCase()} and should be checked before handoff.`
                    : 'No candidate in the active project currently requires validation or correction.'}
                </p>
                <div className="workspace-progress">
                  <div className="workspace-progress-bar">
                    <div style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="workspace-progress-meta">
                    <span>{progressPercent}% of tracked candidates already approved</span>
                    <span>{pendingReviews} items still need attention</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setActivePage?.('review-extracted-data')}>Continue</button>
            </div>
          </div>

          <div className="keymember-content-grid">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Review queue</h3>
                  <p>Priority records that need data correction, classification judgment, or validation sign-off.</p>
                </div>
                <span className="workspace-badge neutral">{reviewQueue.length} active items</span>
              </div>

              {reviewQueue.length === 0 ? (
                <div className="workspace-empty">No active candidates need review in the current project.</div>
              ) : (
                <div className="keymember-review-list">
                  {reviewQueue.map((candidate) => {
                    const statusMeta = getStatusMeta(candidate);
                    const confidence = getConfidence(candidate);

                    return (
                      <article key={candidate.id} className="keymember-review-card">
                        <div>
                          <strong>{getCandidateName(candidate)}</strong>
                          <p>{getModuleLabel(candidate)}</p>
                          <small>{getSourceLabel(candidate)}</small>
                        </div>
                        <div className="keymember-review-meta">
                          <span className={`workspace-badge ${statusMeta.badge}`}>{statusMeta.label}</span>
                          <span className="workspace-confidence">
                            {confidence !== null ? `${confidence}% confidence` : 'Confidence unavailable'}
                          </span>
                          <button className="workspace-icon-btn" onClick={() => setActivePage?.(statusMeta.route)}>Open</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Decision support</h3>
                  <p>Candidates with relationship suggestions or quality signals that require senior judgment.</p>
                </div>
              </div>

              {decisionSupportItems.length === 0 ? (
                <div className="workspace-empty">No classification or confidence signals are available for the active project.</div>
              ) : (
                <div className="keymember-suggestion-grid">
                  {decisionSupportItems.map((candidate) => (
                    <article key={`signal-${candidate.id}`} className="keymember-suggestion-card">
                      <span className="workspace-badge info">
                        {getConfidence(candidate) !== null ? `${getConfidence(candidate)}%` : 'No score'}
                      </span>
                      <h4>{candidate.suggestedRelationshipType || 'Classification signal available'}</h4>
                      <strong>{getCandidateName(candidate)}</strong>
                      <p>
                        {getCompleteness(candidate) !== null
                          ? `Profile completeness is currently ${getCompleteness(candidate)}%. Review classification evidence before finalizing the handoff.`
                          : 'Review the extracted fields and relationship suggestion before promoting this candidate.'}
                      </p>
                      <button className="workspace-link-btn" onClick={() => setActivePage?.('ai-suggestion-review')}>Review item</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Contextual AI</span>
            <h3>Current guidance</h3>
            <div className="workspace-ai-note">
              <strong>{lowConfidenceCandidate ? getCandidateName(lowConfidenceCandidate) : 'No live signal available'}</strong>
              <p>
                {lowConfidenceCandidate
                  ? `${getConfidence(lowConfidenceCandidate) ?? 'No'} confidence recorded. Cross-check extracted fields against the source context before accepting any classification change.`
                  : 'The active project does not currently expose a low-confidence candidate from the backend.'}
              </p>
              <button className="workspace-link-btn" onClick={() => setActivePage?.('ai-suggestion-review')}>Open suggestion review</button>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Workflow coverage</span>
            <div className="keymember-stage-list">
              {workflowStages.map((item) => (
                <button key={item.title} className="keymember-stage-item" onClick={() => setActivePage?.(item.route)}>
                  <strong>{item.title}</strong>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Quality checkpoints</span>
            <div className="workspace-detail-list">
              <div>
                <strong>Active project</strong>
                <span>{localStorage.getItem('apms-active-project') || 'Unavailable'}</span>
              </div>
              <div>
                <strong>Loaded candidates</strong>
                <span>{loading ? 'Loading' : candidates.length}</span>
              </div>
              <div>
                <strong>Signed in as</strong>
                <span>{currentUser?.name || 'Unknown user'}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
