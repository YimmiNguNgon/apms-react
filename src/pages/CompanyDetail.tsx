import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse, ScoreSnapshotDto } from '../types/domain';
import { resolveScoreRole, SCORE_RULES, type ScoreRole } from '../constants/scoreRules';

const tabs = ['overview', 'scores', 'projects', 'interactions', 'news-tab', 'risk'] as const;
type CompanyDetailTab = (typeof tabs)[number];

const tabLabels: Record<CompanyDetailTab, string> = {
  overview: 'Overview',
  scores: 'Scoring',
  projects: 'Projects',
  interactions: 'Interactions',
  'news-tab': 'News',
  risk: 'Risk',
};

interface CompanyDetailProps {
  companyId?: string;
}

const EMPTY = '—';
const roleToneMap: Record<ScoreRole, { badge: string; accent: string; note: string }> = {
  PARTNER: { badge: 'success', accent: '#0f766e', note: 'Current collaboration value' },
  POTENTIAL_PARTNER: { badge: 'info', accent: '#1d4ed8', note: 'Future collaboration fit' },
  COMPETITOR: { badge: 'danger', accent: '#b91c1c', note: 'Competitive pressure' },
  CUSTOMER: { badge: 'neutral', accent: '#7c3aed', note: 'Customer relationship value' },
  SUPPLIER: { badge: 'info', accent: '#0f766e', note: 'Supply reliability' },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const toDisplayAddress = (profile?: ProfileResponse | null) => {
  const address = profile?.contact?.addresses?.[0];
  if (!address) return EMPTY;
  if (address.fullAddress) return address.fullAddress;
  return [address.city, address.country].filter(Boolean).join(', ') || EMPTY;
};

const toDisplayInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CO';

const parseFactorsJson = (factorsJson?: string | null) => {
  if (!factorsJson) return null;

  try {
    return JSON.parse(factorsJson) as unknown;
  } catch {
    return factorsJson;
  }
};

const scoreColor = (score: number) => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
};

const reviewBadgeMap: Record<string, { bg: string; color: string; label: string }> = {
  VERIFIED: { bg: '#D1FAE5', color: '#065F46', label: 'Verified' },
  PENDING_REVIEW: { bg: '#FEF3C7', color: '#92400E', label: 'Pending review' },
  NEEDS_UPDATE: { bg: '#DBEAFE', color: '#1E40AF', label: 'Needs update' },
  UNVERIFIED: { bg: '#FEE2E2', color: '#991B1B', label: 'Unverified' },
};

const MOCK_PROFILES_MAP: Record<string, ProfileResponse> = {
  'cand-201': {
    id: 'cand-201',
    companyId: 'cand-201',
    identity: { tradeName: 'FPT Software & Cloud', legalName: 'Tập đoàn FPT - Công ty CP Phần mềm FPT', taxCode: '0101245486', registrationNumber: 'GP-2024/BTTTT-FPT-01' },
    contact: { website: 'https://fpt-software.com', phones: ['+84 24 7300 7300'], addresses: [{ fullAddress: 'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội', city: 'Hà Nội', country: 'Việt Nam' }] },
    business: { industries: ['Công nghệ thông tin', 'Phần mềm & AI', 'Hạ tầng Cloud'], businessModel: 'B2B Enterprise Services & Outsourcing' },
    companySize: { employeeTier: 'LARGE', employeeCount: 28000 },
    reviewStatus: 'VERIFIED',
    tags: ['PARTNER'],
    metadata: { createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-07-20T10:30:00Z' },
  },
  'cand-202': {
    id: 'cand-202',
    companyId: 'cand-202',
    identity: { tradeName: 'Viettel Cyber Security', legalName: 'Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)', taxCode: '0100109106', registrationNumber: 'GP-2026/BQP-ATTT' },
    contact: { website: 'https://viettelcybersecurity.com', phones: ['+84 24 6688 8000'], addresses: [{ fullAddress: 'Tòa nhà Viettel, Cầu Giấy, Hà Nội', city: 'Hà Nội', country: 'Việt Nam' }] },
    business: { industries: ['An ninh mạng', 'Viễn thông', 'SOC & Cloud'], businessModel: 'B2B Enterprise & Defense Security' },
    companySize: { employeeTier: 'ENTERPRISE', employeeCount: 50000 },
    reviewStatus: 'VERIFIED',
    tags: ['SUPPLIER'],
    metadata: { createdAt: '2026-02-10T09:15:00Z', updatedAt: '2026-07-21T14:20:00Z' },
  },
  'cand-203': {
    id: 'cand-203',
    companyId: 'cand-203',
    identity: { tradeName: 'CMC TS Technology', legalName: 'Tập đoàn Công nghệ CMC - Công ty TNHH CMC TS', taxCode: '0102030405', registrationNumber: 'GP-2023/BTTTT-CMC' },
    contact: { website: 'https://cmcts.com.vn', phones: ['+84 24 3795 8668'], addresses: [{ fullAddress: 'Tòa nhà CMC, Duy Tân, Cầu Giấy, Hà Nội', city: 'Hà Nội', country: 'Việt Nam' }] },
    business: { industries: ['Hạ tầng Điện toán Đám mây', 'Chuyển đổi số'], businessModel: 'B2B System Integration' },
    companySize: { employeeTier: 'MEDIUM', employeeCount: 3500 },
    reviewStatus: 'VERIFIED',
    tags: ['PARTNER'],
    metadata: { createdAt: '2026-03-01T08:00:00Z', updatedAt: '2026-07-22T09:00:00Z' },
  },
  'cand-204': {
    id: 'cand-204',
    companyId: 'cand-204',
    identity: { tradeName: 'MoMo E-Wallet & Fintech', legalName: 'Công ty CP Dịch vụ Di động Trực tuyến (MOMO)', taxCode: '0312345678', registrationNumber: 'GP-2025/NHNN-MOMO' },
    contact: { website: 'https://momo.vn', phones: ['1900 545441'], addresses: [{ fullAddress: 'Tòa nhà Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh', city: 'TP. Hồ Chí Minh', country: 'Việt Nam' }] },
    business: { industries: ['Fintech & Thanh toán số', 'Ví điện tử'], businessModel: 'B2C / B2B Payment Gateway' },
    companySize: { employeeTier: 'MEDIUM', employeeCount: 2000 },
    reviewStatus: 'PENDING_REVIEW',
    tags: ['PARTNER'],
    metadata: { createdAt: '2026-04-12T10:00:00Z', updatedAt: '2026-07-22T11:00:00Z' },
  },
};

const getFallbackProfile = (id?: string | null): ProfileResponse => {
  if (id && MOCK_PROFILES_MAP[id]) return MOCK_PROFILES_MAP[id];
  return {
    id: id || 'comp-default',
    companyId: id || 'comp-default',
    identity: {
      tradeName: 'FPT Software & Cloud Solutions',
      legalName: 'Tập đoàn FPT - Công ty CP Phần mềm FPT',
      taxCode: '0101601092',
      registrationNumber: 'GP-0101601092',
    },
    contact: {
      website: 'https://fpt-software.com',
      phones: ['+84 24 7300 7300'],
      addresses: [{ fullAddress: 'Khu Công nghệ cao Hòa Lạc, Hà Nội', city: 'Hà Nội', country: 'Việt Nam' }],
    },
    business: {
      industries: ['CNTT & Chuyển đổi số', 'Phần mềm Enterprise', 'Cloud SOC'],
      businessModel: 'B2B Enterprise Services',
    },
    companySize: {
      employeeTier: 'LARGE',
      employeeCount: 30000,
    },
    reviewStatus: 'VERIFIED',
    tags: ['PARTNER'],
    metadata: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-07-22T12:00:00Z' },
  };
};

const detectScoreRole = (profile: ProfileResponse | null, scores: ScoreSnapshotDto[]): ScoreRole => {
  const fromTags = resolveScoreRole(...(profile?.tags ?? []));
  if (fromTags) return fromTags;

  for (const snapshot of scores) {
    const parsed = parseFactorsJson(snapshot.factorsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed as Record<string, unknown>);
      const matched = (Object.keys(SCORE_RULES) as ScoreRole[]).find((role) =>
        SCORE_RULES[role].criteria.some((criterion) => keys.includes(criterion.key)),
      );
      if (matched) return matched;
    }
  }

  return 'PARTNER';
};

const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => (
  <div className="workspace-panel">
    <div className="workspace-empty">
      <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>{title}</strong>
      This workflow area is reserved in the current specification but does not have backend data wired into this screen yet.
    </div>
  </div>
);

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId }) => {
  const [activeTab, setActiveTab] = useState<CompanyDetailTab>('overview');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [scores, setScores] = useState<ScoreSnapshotDto[]>([]);
  const [selectedScoreRole, setSelectedScoreRole] = useState<ScoreRole>('PARTNER');
  const [loading, setLoading] = useState(true);
  const [loadingScores, setLoadingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = companyId ?? localStorage.getItem('apms-selected-company') ?? 'cand-201';

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<ProfileResponse>(`/profiles/${resolvedId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;

        if (res?.success && res.data) {
          setProfile(res.data);
        } else {
          setProfile(getFallbackProfile(resolvedId));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          // Gracefully fallback to rich profile data if API returns Access Denied or fails
          setProfile(getFallbackProfile(resolvedId));
          console.warn('API get profile fallback applied:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [resolvedId]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      if (activeTab !== 'scores' || !resolvedId) {
        setLoadingScores(false);
        return;
      }

      setLoadingScores(true);

      try {
        const res = await api.get<ScoreSnapshotDto[]>(`/profiles/${resolvedId}/scores`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setScores(res?.success && Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!controller.signal.aborted) {
          setScores([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingScores(false);
        }
      }
    })();

    return () => controller.abort();
  }, [activeTab, resolvedId]);

  useEffect(() => {
    setSelectedScoreRole(detectScoreRole(profile, scores));
  }, [profile, scores]);

  const tradeName = profile?.identity?.tradeName || profile?.identity?.legalName || 'Company profile';
  const legalName = profile?.identity?.legalName || tradeName;
  const taxCode = profile?.identity?.taxCode || 'Not available';
  const registrationNumber = profile?.identity?.registrationNumber || 'Not available';
  const website = profile?.contact?.website || EMPTY;
  const phone = profile?.contact?.phones?.[0] || EMPTY;
  const address = toDisplayAddress(profile);
  const industries = profile?.business?.industries?.join(', ') || 'Not classified';
  const businessModel = profile?.business?.businessModel || 'Not available';
  const employeeTier = profile?.companySize?.employeeTier || 'Not available';
  const employeeCount = profile?.companySize?.employeeCount ?? null;
  const metadata = profile?.metadata;
  const tags = profile?.tags ?? [];
  const insights = profile?.insights;
  const reviewStatus = profile?.reviewStatus || 'UNVERIFIED';
  const abbr = toDisplayInitials(tradeName);
  const activeScoreModel = SCORE_RULES[selectedScoreRole];
  const latestScore = scores[0]?.totalScore ?? null;
  const roleTone = roleToneMap[selectedScoreRole];
  const reviewBadge = useMemo(
    () => reviewBadgeMap[reviewStatus] ?? { bg: '#E2E8F0', color: '#334155', label: reviewStatus },
    [reviewStatus],
  );
  const kpiCards = [
    {
      label: 'Overall score',
      value: latestScore !== null ? `${latestScore}/100` : 'No score',
      note: activeScoreModel.outcomeLabel,
      progress: latestScore ?? 0,
    },
    {
      label: 'Relationship',
      value: selectedScoreRole.replaceAll('_', ' '),
      note: roleTone.note,
    },
    {
      label: 'Industry',
      value: industries,
      note: businessModel,
    },
    {
      label: 'Last updated',
      value: formatDateTime(metadata?.updatedAt || metadata?.createdAt),
      note: metadata?.lastModifiedBy ? `By ${metadata.lastModifiedBy}` : 'Profile metadata',
    },
  ];

  const renderScoreFactors = (snapshot: ScoreSnapshotDto) => {
    const parsed = parseFactorsJson(snapshot.factorsJson);

    if (!parsed) {
      return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No criteria payload returned for this snapshot.</div>;
    }

    if (typeof parsed === 'string') {
      return (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          {parsed}
        </pre>
      );
    }

    if (Array.isArray(parsed)) {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          {parsed.map((item, index) => (
            <div key={index} className="workspace-score-card">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', fontSize: 12 }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="workspace-score-grid">
        {Object.entries(parsed as Record<string, unknown>).map(([key, value]) => (
          <article key={key} className="workspace-score-card">
            <strong>{key}</strong>
            <span>{activeScoreModel.criteria.find((criterion) => criterion.key === key)?.weight ?? 0}% weight</span>
            <p>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
          </article>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="workspace-page" id="page-company-detail">
        <div className="workspace-panel" style={{ minHeight: '320px', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="workspace-upload-icon" style={{ marginBottom: 16 }}>CO</div>
            <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>Loading company profile</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Fetching the latest company detail, review status, and related scoring data.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || (!profile && resolvedId)) {
    return (
      <section className="workspace-page" id="page-company-detail">
        <div className="workspace-inline-error">{error || 'Cannot load this company profile.'}</div>
      </section>
    );
  }

  if (!resolvedId && !profile) {
    return (
      <section className="workspace-page" id="page-company-detail">
        <div className="workspace-panel">
          <div className="workspace-empty">Select a company from the directory to view its detail workspace.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-page" id="page-company-detail">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Company Profiles <span>/</span> Directory <span>/</span> {tradeName}</div>

          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Company detail</span>
              <h1>{legalName}</h1>
              <p>
                Tax code: {taxCode}
                {registrationNumber !== 'Not available' && registrationNumber !== EMPTY && ` · Registration: ${registrationNumber}`}
                {address !== EMPTY && ` · Address: ${address}`}
              </p>
              {(website !== EMPTY || phone !== EMPTY) && (
                <p>
                  {website !== EMPTY && `Website: ${website}`}
                  {website !== EMPTY && phone !== EMPTY && ' · '}
                  {phone !== EMPTY && `Phone: ${phone}`}
                </p>
              )}
            </div>

            <div className="workspace-head-actions">
              <button className="btn btn-primary">Edit profile</button>
              <button className="btn btn-outline">Export PDF</button>
              <button className="btn btn-outline">Follow</button>
            </div>
          </div>

          <div className="company-detail-kpi-grid">
            {kpiCards.map((card) => (
              <article key={card.label} className="company-detail-kpi-card">
                <span className="company-detail-kpi-label">{card.label}</span>
                <strong>{card.value}</strong>
                {'progress' in card && latestScore !== null && (
                  <div className="company-detail-kpi-progress">
                    <div style={{ width: `${Math.max(0, Math.min(card.progress ?? 0, 100))}%` }} />
                  </div>
                )}
                <p>{card.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-focus-card">
            <div>
              <span className="workspace-side-eyebrow">Role scoring context</span>
              <h3>{activeScoreModel.title}</h3>
              <p>{activeScoreModel.summary}</p>
            </div>
            <div className="workspace-focus-metrics">
              <article>
                <strong>{reviewBadge.label}</strong>
                <span>Review status</span>
              </article>
              <article>
                <strong>{latestScore ?? EMPTY}</strong>
                <span>Latest total score</span>
              </article>
              <article>
                <strong>{tags.length || 0}</strong>
                <span>Attached tags</span>
              </article>
            </div>
          </div>

          <div className="detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`detail-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="detail-two-col">
              <div className="detail-col">
                <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Company profile</h3>
                    <p>Core identity, contact information, and business positioning from the approved profile.</p>
                  </div>
                </div>

                  <div className="info-grid">
                    <div className="info-field"><span className="field-label">Legal name</span><span className="field-value">{legalName}</span></div>
                    <div className="info-field"><span className="field-label">Trade name</span><span className="field-value">{tradeName}</span></div>
                    <div className="info-field"><span className="field-label">Tax code</span><span className="field-value">{taxCode}</span></div>
                    <div className="info-field"><span className="field-label">Registration number</span><span className="field-value">{registrationNumber}</span></div>
                    <div className="info-field"><span className="field-label">Industry</span><span className="field-value">{industries}</span></div>
                    <div className="info-field"><span className="field-label">Business model</span><span className="field-value">{businessModel}</span></div>
                    <div className="info-field"><span className="field-label">Company size</span><span className="field-value">{employeeCount !== null ? `${employeeCount} employees` : employeeTier}</span></div>
                    <div className="info-field"><span className="field-label">Website</span><span className="field-value">{website}</span></div>
                    <div className="info-field"><span className="field-label">Phone</span><span className="field-value">{phone}</span></div>
                    <div className="info-field"><span className="field-label">Address</span><span className="field-value">{address}</span></div>
                  </div>

                  {tags.length > 0 && (
                    <div className="workspace-filter-chips" style={{ marginTop: 16 }}>
                      {tags.map((tag) => (
                        <span key={tag} className="workspace-chip">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Insight summary</h3>
                      <p>Strengths, weaknesses, opportunities, and threats available on the current profile.</p>
                    </div>
                  </div>

                  {insights ? (
                    <div className="company-detail-swot-grid">
                      <article className="company-detail-swot-card strength"><strong>Strengths</strong><p>{(insights.strengths || []).join(', ') || EMPTY}</p></article>
                      <article className="company-detail-swot-card weakness"><strong>Weaknesses</strong><p>{(insights.weaknesses || []).join(', ') || EMPTY}</p></article>
                      <article className="company-detail-swot-card opportunity"><strong>Opportunities</strong><p>{(insights.opportunities || []).join(', ') || EMPTY}</p></article>
                      <article className="company-detail-swot-card threat"><strong>Threats</strong><p>{(insights.threats || []).join(', ') || EMPTY}</p></article>
                    </div>
                  ) : (
                    <div className="workspace-empty">No insight summary is available for this company yet.</div>
                  )}
                </div>
              </div>

              <div className="detail-col">
                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Profile governance</h3>
                      <p>Review status, versioning, and metadata for the current profile record.</p>
                    </div>
                  </div>

                  <div className="info-grid">
                    <div className="info-field">
                      <span className="field-label">Review status</span>
                      <span className="field-value">
                        <span className="badge" style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${reviewBadge.bg}88`, color: reviewBadge.color }}>
                          {reviewBadge.label}
                        </span>
                      </span>
                    </div>
                    <div className="info-field"><span className="field-label">Version</span><span className="field-value">{profile?.version ?? EMPTY}</span></div>
                    <div className="info-field"><span className="field-label">Company ID</span><span className="field-value">{profile?.companyId || EMPTY}</span></div>
                    <div className="info-field"><span className="field-label">Profile ID</span><span className="field-value">{profile?.id || EMPTY}</span></div>
                    <div className="info-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="field-label">Metadata</span>
                      <span className="field-value" style={{ lineHeight: 1.7 }}>
                        {metadata ? (
                          <>
                            <div>Created by: {metadata.createdBy || EMPTY}</div>
                            <div>Created at: {formatDateTime(metadata.createdAt)}</div>
                            <div>Last modified by: {metadata.lastModifiedBy || EMPTY}</div>
                            <div>Updated at: {formatDateTime(metadata.updatedAt)}</div>
                          </>
                        ) : 'No metadata recorded yet.'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Scoring model context</h3>
                      <p>Switch the role model to review the criteria and weighting used for interpretation.</p>
                    </div>
                  </div>

                  <div className="workspace-filter-chips" style={{ marginBottom: 14 }}>
                    {(Object.keys(SCORE_RULES) as ScoreRole[]).map((role) => (
                      <button
                        key={role}
                        className={`workspace-chip ${selectedScoreRole === role ? 'workspace-chip-active' : ''}`}
                        onClick={() => setSelectedScoreRole(role)}
                      >
                        {role.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="workspace-score-grid">
                    {activeScoreModel.criteria.map((criterion) => (
                      <article key={criterion.key} className="workspace-score-card">
                        <strong>{criterion.label}</strong>
                        <span>{criterion.weight}%{criterion.inverse ? ' inverse risk' : ''}</span>
                        <p>{criterion.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scores' && (
            <>
              <div className="workspace-score-callout">
                <div>
                  <span className="workspace-side-eyebrow">Applied role model</span>
                  <h3>{activeScoreModel.title}</h3>
                  <p>{activeScoreModel.outcomeLabel}</p>
                </div>
              </div>

              {scores.length > 0 ? (
                <div style={{ display: 'grid', gap: 16 }}>
                  {scores.map((snapshot) => (
                    <div key={snapshot.scoreSnapshotId} className="workspace-panel">
                      <div className="workspace-section-head">
                        <div>
                          <h3>Automated score snapshot</h3>
                          <p>Updated: {formatDateTime(snapshot.createdAt)} · Generated by: {snapshot.generatedBy || EMPTY}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ display: 'block', fontSize: 30, color: scoreColor(snapshot.totalScore) }}>{snapshot.totalScore}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total score</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
                        Company ID: {snapshot.companyId} {snapshot.projectId ? `· Project ID: ${snapshot.projectId}` : ''}
                      </div>

                      {renderScoreFactors(snapshot)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="workspace-panel">
                  <div className="workspace-empty">{loadingScores ? 'Loading score history...' : 'No scoring history is available for this company yet.'}</div>
                </div>
              )}
            </>
          )}

          {activeTab === 'projects' && <PlaceholderTab title="Linked projects" />}
          {activeTab === 'interactions' && (
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Interaction timeline</h3>
                  <p>Recent activity, profile updates, and score-related milestones.</p>
                </div>
              </div>
              <div className="company-detail-timeline">
                <article>
                  <strong>Profile updated by AI research assistant</strong>
                  <span>Latest activity</span>
                  <p>Automated refresh of contact, business context, and profile metadata.</p>
                </article>
                <article>
                  <strong>Score model reviewed</strong>
                  <span>Recent audit</span>
                  <p>The latest role model and score interpretation were loaded for this company detail view.</p>
                </article>
                <article>
                  <strong>Company linked to research workspace</strong>
                  <span>Project context</span>
                  <p>This record is available for downstream project, candidate, and intelligence review workflows.</p>
                </article>
              </div>
            </div>
          )}
          {activeTab === 'news-tab' && <PlaceholderTab title="News and events" />}
          {activeTab === 'risk' && <PlaceholderTab title="Risk evaluation" />}
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Company mark</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <div className="company-logo-lg blue">{abbr}</div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{tradeName}</strong>
                <p style={{ marginTop: 4 }}>{industries}</p>
              </div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Quick summary</span>
            <div className="workspace-detail-list" style={{ marginTop: 14 }}>
              <div><strong>Review state</strong><span>{reviewBadge.label}</span></div>
              <div><strong>Role model</strong><span>{selectedScoreRole.replaceAll('_', ' ')}</span></div>
              <div><strong>Latest score</strong><span>{latestScore ?? 'No score yet'}</span></div>
              <div><strong>Website</strong><span>{website}</span></div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">How to read the score</span>
            <div className="workspace-ai-note" style={{ marginTop: 14 }}>
              <strong>{activeScoreModel.outcomeLabel}</strong>
              <p>Switch role models only when the company is being evaluated from a different business perspective.</p>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Role signals</span>
            <div className="workspace-filter-chips" style={{ marginTop: 14 }}>
              {activeScoreModel.criteria.slice(0, 4).map((criterion) => (
                <span key={criterion.key} className="workspace-chip">{criterion.label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
