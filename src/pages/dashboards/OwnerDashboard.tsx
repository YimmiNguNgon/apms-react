/* eslint-disable @typescript-eslint/no-explicit-any */
// Owner Dashboard — Bound Strictly to Backend API DTO Models
// All business information originates from backend endpoints:
// GET /dashboard/summary, GET /dashboard/recent-scores, GET /dashboard/recommendations,
// GET /graph/partners, GET /graph/competitors, GET /external-data/*, GET /dashboard/activity

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type PageResponse } from '../../services/api';
import { OwnerCompanyProfileCard } from '../../components/OwnerCompanyProfileCard';
import type {
  DashboardSummaryDto,
  AuditLogDto,
  GraphCompanyDto,
  ScoreSnapshotDto,
} from '../../types/domain';
import type { ExternalDataItem } from '../../API/externalDataApi';
import {
  PageHeader,
  MetricCard,
  RiskBadge,
  PrimaryButton,
} from '../../components/ui';

interface DashboardRecommendationDto {
  priority?: string | null;
  title?: string | null;
  description?: string | null;
  actionRequired?: string | null;
}

// ─── Mini inline SparkLine ──────────────────────────────────────────────────
const MiniSparkLine: React.FC<{ data: number[]; color?: string }> = ({ data, color = 'var(--cds-interactive)' }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 56;
  const H = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Section header helper ──────────────────────────────────────────────────
const SectionTitle: React.FC<{ icon: string; title: string; subtitle?: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px' }}>{icon}</span>
        {title}
      </h2>
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Divider ────────────────────────────────────────────────────────────────
const Divider: React.FC = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--cds-border-subtle-00)', margin: '8px 0' }} />
);

// ─── Card wrapper ────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'var(--cds-background)',
    border: '1px solid var(--cds-border-color)',
    borderRadius: 'var(--cds-border-radius)',
    padding: '16px',
    ...style,
  }}>
    {children}
  </div>
);

// ─── Priority tag ────────────────────────────────────────────────────────────
const PriorityTag: React.FC<{ level?: string | null }> = ({ level }) => {
  const { t } = useTranslation('owner-dashboard');
  const normalized = String(level || 'MEDIUM').toUpperCase();
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    HIGH:     { bg: 'var(--cds-support-error-bg)',   color: 'var(--cds-support-error)',   label: t('priority.high') },
    CRITICAL: { bg: 'var(--cds-support-error-bg)',   color: 'var(--cds-support-error)',   label: t('priority.critical') },
    MEDIUM:   { bg: 'var(--cds-support-warning-bg)', color: '#92400e',                    label: t('priority.medium') },
    LOW:      { bg: 'var(--cds-layer-01)',           color: 'var(--cds-text-secondary)',   label: t('priority.low') },
  };
  const theme = colors[normalized] || colors.MEDIUM;
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: theme.bg, color: theme.color, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {theme.label}
    </span>
  );
};

// ─── Score Ring ─────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 32 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? 'var(--cds-support-success)' : score >= 60 ? 'var(--cds-risk-medium)' : 'var(--cds-support-error)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--cds-border-subtle-00)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round" />
    </svg>
  );
};

// ─── Main Owner Dashboard Component ──────────────────────────────────────────
export const OwnerDashboard: React.FC = () => {
  const { t, i18n } = useTranslation('owner-dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Backend DTO State
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [recentScores, setRecentScores] = useState<ScoreSnapshotDto[]>([]);
  const [recommendations, setRecommendations] = useState<DashboardRecommendationDto[]>([]);
  const [partners, setPartners] = useState<GraphCompanyDto[]>([]);
  const [competitors, setCompetitors] = useState<GraphCompanyDto[]>([]);
  const [network, setNetwork] = useState<GraphCompanyDto[]>([]);
  const [newsData, setNewsData] = useState<ExternalDataItem[]>([]);
  const [oppData, setOppData] = useState<ExternalDataItem[]>([]);
  const [riskAlertsData, setRiskAlertsData] = useState<ExternalDataItem[]>([]);
  const [activities, setActivities] = useState<AuditLogDto[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<import('../../types/domain').ProfileResponse | null>(null);
  const [companyProfiles, setCompanyProfiles] = useState<import('../../types/domain').ProfileResponse[]>([]);
  const [ownerProfileError, setOwnerProfileError] = useState<string | null>(null);

  const [isScanRunning, setIsScanRunning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // ── Backend API Fetching ────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const fetchBackendData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, scoresRes, partnersRes, competitorsRes, networkRes, newsRes, oppsRes, risksRes, profileRes, profilesRes] =
          await Promise.allSettled([
            api.get<DashboardSummaryDto>('/dashboard/summary', { signal: controller.signal }),
            api.get<ScoreSnapshotDto[]>('/dashboard/recent-scores', { signal: controller.signal }),
            api.get<GraphCompanyDto[]>('/graph/partners', { signal: controller.signal }),
            api.get<GraphCompanyDto[]>('/graph/competitors', { signal: controller.signal }),
            api.get<GraphCompanyDto[]>('/graph/network', { signal: controller.signal }),
            api.get<PageResponse<ExternalDataItem>>('/external-data/news?page=0&size=6', { signal: controller.signal }),
            api.get<PageResponse<ExternalDataItem>>('/external-data/opportunities?page=0&size=5', { signal: controller.signal }),
            api.get<PageResponse<ExternalDataItem>>('/external-data/risks?page=0&size=5', { signal: controller.signal }),
            api.get<import('../../types/domain').ProfileResponse>('/owner/company-profile', { signal: controller.signal }),
            api.get<{ content?: import('../../types/domain').ProfileResponse[] }>('/profiles', { params: { page: 0, size: 200 }, signal: controller.signal }),
          ]);
        if (controller.signal.aborted) return;
        if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) setSummary(summaryRes.value.data);
        if (scoresRes.status === 'fulfilled' && Array.isArray(scoresRes.value?.data)) setRecentScores(scoresRes.value.data);
        if (partnersRes.status === 'fulfilled' && Array.isArray(partnersRes.value?.data)) setPartners(partnersRes.value.data);
        if (competitorsRes.status === 'fulfilled' && Array.isArray(competitorsRes.value?.data)) setCompetitors(competitorsRes.value.data);
        if (networkRes.status === 'fulfilled' && Array.isArray(networkRes.value?.data)) setNetwork(networkRes.value.data);
        if (newsRes.status === 'fulfilled' && newsRes.value?.data?.content) setNewsData(newsRes.value.data.content);
        if (oppsRes.status === 'fulfilled' && oppsRes.value?.data?.content) {
          const opportunities = oppsRes.value.data.content;
          setOppData(opportunities);
          setRecommendations(opportunities.map((item) => ({
            priority: item.opportunityLevel ?? 'MEDIUM',
            title: item.title,
            description: item.aiSummary ?? item.summary,
            actionRequired: item.relatedCompanyName ?? null,
          })));
        }
        if (risksRes.status === 'fulfilled' && risksRes.value?.data?.content) setRiskAlertsData(risksRes.value.data.content);
        if (profileRes.status === 'fulfilled') setOwnerProfile(profileRes.value.data);
        else setOwnerProfileError(profileRes.reason instanceof Error ? profileRes.reason.message : t('content.ownerProfile'));
        if (profilesRes.status === 'fulfilled') setCompanyProfiles(profilesRes.value.data?.content ?? []);

        const results = [summaryRes, scoresRes, partnersRes, competitorsRes, networkRes, newsRes, oppsRes, risksRes, profileRes, profilesRes];
        const rejectedCount = results.filter((r) => r.status === 'rejected').length;
        if (rejectedCount === results.length) {
          setError(t('fallback.dashboardUnavailable'));
        } else if (rejectedCount > 0) {
          setError(t('fallback.backendPartial', { rejected: rejectedCount, total: results.length }));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : t('fallback.backendUnavailable'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchBackendData();
    return () => controller.abort();
  }, []);

  // ── Bind Metrics directly to Backend DTO Response Fields ────────────────────
  const ecosystemScoreDisplay = recentScores.length > 0
    ? (recentScores.reduce((acc, s) => acc + (s.totalScore ?? s.partnerFitScore ?? 0), 0) / recentScores.length).toFixed(1)
    : t('notAvailable');

  const partnerCountDisplay = summary?.partnerCount !== undefined
    ? String(summary.partnerCount)
    : partners.length > 0 ? String(partners.length) : t('notAvailable');

  const competitorCountDisplay = summary?.competitorCount !== undefined
    ? String(summary.competitorCount)
    : competitors.length > 0 ? String(competitors.length) : t('notAvailable');

  const totalProjectsDisplay = summary?.totalProjects !== undefined
    ? String(summary.totalProjects)
    : t('notAvailable');

  const highRiskCountDisplay = riskAlertsData.length > 0
    ? String(riskAlertsData.length)
    : summary?.securityAlerts !== undefined ? String(summary.securityAlerts) : '0';

  const aiOppsCountDisplay = oppData.length > 0
    ? `${oppData.length} ${t('fallback.deals')}`
    : summary?.potentialPartnerCount !== undefined ? `${summary.potentialPartnerCount}` : t('notAvailable');

  const ownerRelationshipRows = (() => {
    const ownerId = ownerProfile?.companyId;
    const rows = new Map<string, GraphCompanyDto & { relationship: string }>();
    network.forEach((company) => (company.relationships || []).forEach((relationship) => {
      if (relationship.sourceCompanyId !== ownerId || !relationship.targetCompanyId) return;
      const target = network.find((node) => node.companyId === relationship.targetCompanyId);
      if (!target) return;
      rows.set(target.companyId, { ...target, relationship: relationship.relationshipType });
    }));
    if (rows.size > 0) return Array.from(rows.values());
    return companyProfiles
      .filter((profile) => profile.companyId && profile.companyId !== ownerId && profile.relationshipType)
      .map((profile) => ({
        companyId: profile.companyId,
        name: profile.identity?.tradeName || profile.identity?.legalName || profile.companyId || 'Company',
        industry: profile.business?.industries?.[0],
        relationship: profile.relationshipType || 'RELATED',
      }));
  })();

  // Trigger Market Scan
  const handleRunScan = async () => {
    if (isScanRunning) return;
    setIsScanRunning(true);
    setScanMessage(t('scan.connecting'));
    try {
      const res = await api.get<DashboardSummaryDto>('/dashboard/summary');
      if (res?.data) setSummary(res.data);
      setScanMessage(t('fallback.scanCompleted'));
    } catch {
      setError(t('fallback.syncFailed'));
      setScanMessage(t('fallback.syncFailed'));
    } finally {
      setTimeout(() => setIsScanRunning(false), 1500);
      setTimeout(() => setScanMessage(null), 4000);
    }
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="cds-page-shell" id="page-owner-dashboard">
        <PageHeader title={t('title')} description={t('loadingDescription')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '88px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', animation: 'cds-pulse 1.2s ease infinite' }} />
          ))}
        </div>
        <style>{`@keyframes cds-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  return (
    <div className="cds-page-shell" id="page-owner-dashboard">

      {/* Page Header */}
      <PageHeader
        title={t('title')}
        eyebrow={t('eyebrow')}
        description={t('description')}
        breadcrumb={[{ label: t('breadcrumb') }]}
        actions={
          <PrimaryButton size="sm" loading={isScanRunning} onClick={handleRunScan}>
            {isScanRunning ? t('scan.running') : t('scan.run')}
          </PrimaryButton>
        }
      />

      {/* Feedback banner */}
      {scanMessage && (
        <div style={{ background: 'var(--cds-support-info-bg)', border: '1px solid var(--cds-border-interactive)', color: 'var(--cds-interactive)', padding: '8px 14px', borderRadius: 'var(--cds-border-radius)', marginBottom: '12px', fontSize: '13px', fontWeight: 500 }}>
          {scanMessage}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ background: 'var(--cds-support-error-bg)', border: '1px solid var(--cds-support-error)', color: 'var(--cds-support-error)', padding: '8px 14px', borderRadius: 'var(--cds-border-radius)', marginBottom: '12px', fontSize: '13px', fontWeight: 500 }}>
          {t('content.backend')}: {error}
        </div>
      )}

      {/* 6 KPI Cards bound to Backend Response Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard
          label={t('metrics.ecosystemScore.label')}
          value={ecosystemScoreDisplay}
          icon={<MiniSparkLine data={recentScores.map((s) => s.totalScore ?? s.partnerFitScore ?? 0)} color="var(--cds-support-success)" />}
          description={t('metrics.ecosystemScore.description')}
        />
        <MetricCard
          label={t('metrics.activePartners.label')}
          value={partnerCountDisplay}
          icon={<MiniSparkLine data={[summary?.partnerCount || 0]} color="var(--cds-interactive)" />}
          description={t('metrics.activePartners.description')}
        />
        <MetricCard
          label={t('metrics.competitors.label')}
          value={competitorCountDisplay}
          icon={<MiniSparkLine data={[summary?.competitorCount || 0]} color="var(--cds-risk-high)" />}
          description={t('metrics.competitors.description')}
        />
        <MetricCard
          label={t('metrics.riskAlerts.label')}
          value={highRiskCountDisplay}
          icon={<MiniSparkLine data={[riskAlertsData.length]} color="var(--cds-support-error)" />}
          description={t('metrics.riskAlerts.description')}
          valueColor={riskAlertsData.length > 0 ? 'var(--cds-support-error)' : undefined}
        />
        <MetricCard
          label={t('metrics.activeProjects.label')}
          value={totalProjectsDisplay}
          icon={<MiniSparkLine data={[summary?.totalProjects || 0]} color="var(--cds-interactive)" />}
          description={t('metrics.activeProjects.description')}
        />
        <MetricCard
          label={t('metrics.aiOpportunities.label')}
          value={aiOppsCountDisplay}
          icon={<MiniSparkLine data={[oppData.length]} color="var(--cds-support-success)" />}
          description={t('metrics.aiOpportunities.description')}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <OwnerCompanyProfileCard profile={ownerProfile} error={ownerProfileError} />
      </div>

      {/* 2-Column Responsive Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)', gap: '12px', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Strategic Insights -> GET /dashboard/recommendations */}
          <Card>
            <SectionTitle icon="✦" title={t('sections.insights.title')} subtitle={t('sections.insights.subtitle')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div style={{ display: 'flex', gap: '10px', padding: '8px 0', alignItems: 'flex-start' }}>
                      <PriorityTag level={rec.priority} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '2px' }}>
                          {rec.title || t('content.noTitle')}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>
                          {rec.description || t('content.notUpdated')}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cds-interactive)', fontWeight: 500 }}>
                          {t('content.actionRequired')}: {rec.actionRequired || t('content.notUpdated')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('notAvailable')}
                </p>
              )}
            </div>
          </Card>

          {/* Competitor Highlights -> GET /graph/competitors */}
          <Card>
            <SectionTitle icon="⚔" title={t('sections.competitors.title')} subtitle={t('sections.competitors.subtitle')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {competitors.length > 0 ? (
                competitors.slice(0, 5).map((comp, i) => {
                  const snap = recentScores.find((s) => s.companyId === comp.companyId);
                  const score = snap?.competitionLevel ?? snap?.riskLevel ?? snap?.totalScore ?? 0;
                  return (
                    <div key={comp.companyId || i}>
                      {i > 0 && <Divider />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--cds-text-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                          {(comp.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comp.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                            {comp.industry || t('content.notUpdated')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <ScoreRing score={Number(score)} size={32} />
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{score ? `${score}` : t('notAvailable')}</div>
                            <RiskBadge level={score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('content.noCompetitors')}
                </p>
              )}
            </div>
          </Card>

          {/* Activity Logs -> GET /dashboard/activity */}
          <Card>
            <SectionTitle icon="📜" title={t('sections.activity.title')} subtitle={t('sections.activity.subtitle')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {activities.length > 0 ? (
                activities.slice(0, 4).map((act, i) => (
                  <div key={act.id || i}>
                    {i > 0 && <Divider />}
                    <div style={{ padding: '6px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{act.action}</span>
                        <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString(i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US') : t('content.notUpdated')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)' }}>
                        {act.detail || `${t('fallback.actor')}: ${act.actorEmail || t('fallback.system')}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('content.noActivity')}
                </p>
              )}
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Risk Alerts -> GET /external-data/risks */}
          <Card>
            <SectionTitle
              icon="!"
              title={t('sections.risks.title')}
              subtitle={t('sections.risks.subtitle')}
              action={
                <span style={{ fontSize: '11px', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {riskAlertsData.length} {t('fallback.items')}
                </span>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {riskAlertsData.length > 0 ? (
                riskAlertsData.map((risk, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div style={{ display: 'flex', gap: '10px', padding: '6px 0', alignItems: 'flex-start' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cds-support-error)', flexShrink: 0, marginTop: '5px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', lineHeight: '18px', marginBottom: '2px' }}>
                          {risk.title || t('content.noTitle')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                          {t('content.source')}: {risk.source || t('content.notUpdated')} {risk.publishedAt ? `· ${risk.publishedAt}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('content.noAlerts')}
                </p>
              )}
            </div>
          </Card>

          {/* Partner Directory -> GET /graph/partners */}
          <Card>
            <SectionTitle icon="🤝" title={t('sections.partners.title')} subtitle={t('sections.partners.subtitle')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {partners.length > 0 ? (
                partners.slice(0, 5).map((p, i) => {
                  const snap = recentScores.find((s) => s.companyId === p.companyId);
                  const score = snap?.partnerFitScore ?? snap?.totalScore ?? 0;
                  return (
                    <div key={p.companyId || i}>
                      {i > 0 && <Divider />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-01)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--cds-text-primary)', flexShrink: 0 }}>
                          {(p.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                            {p.industry || t('content.notUpdated')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{score ? `${score}` : t('notAvailable')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('content.noPartners')}
                </p>
              )}
            </div>
          </Card>

          {/* Relationship Network -> GET /graph/network */}
          <Card>
            <SectionTitle icon="◎" title={t('sections.network.title')} subtitle={t('sections.network.subtitle')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {ownerRelationshipRows.length > 0 ? (
                ownerRelationshipRows.slice(0, 8).map((node, i) => (
                  <div key={node.companyId || i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius-sm)', border: '1px solid var(--cds-border-subtle-00)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cds-interactive)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--cds-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.name}
                    </span>
                    <span style={{ fontSize: '10px', color: node.relationship === 'PARTNER_WITH' ? 'var(--cds-support-success)' : node.relationship === 'COMPETITOR_OF' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)', fontWeight: 700, marginLeft: 'auto' }}>
                      {node.relationship.replace(/_OF$|_WITH$/g, '').replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ gridColumn: 'span 2', fontSize: '12px', color: 'var(--cds-text-helper)', textAlign: 'center', padding: '12px 0' }}>
                  {t('content.networkEmpty')}
                </p>
              )}
            </div>
          </Card>

          {/* Market News -> GET /external-data/news */}
          <Card>
            <SectionTitle icon="N" title={t('sections.news.title')} subtitle={t('sections.news.subtitle')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {newsData.length > 0 ? (
                newsData.slice(0, 4).map((item, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div style={{ padding: '6px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', lineHeight: '18px', flex: 1 }}>
                          {item.title || t('content.noTitle')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                        {t('content.source')}: {item.source || t('content.notUpdated')} {item.publishedAt ? `· ${item.publishedAt}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                  {t('content.noNews')}
                </p>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
