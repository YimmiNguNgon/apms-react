import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { api } from '../services/api';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import { CompanyDetailDrawer } from '../components/CompanyDetailDrawer';
import { RecentScoreCard, ScoreCardSkeleton } from '../components/RecentScoreCard';
import { ScoreDetailModal } from '../components/ScoreDetailModal';
import { riskTone, scoreTone } from '../components/scoreTone';

export interface GraphCompany {
  companyId: string;
  name: string;
  industry: string;
  createdAt?: string;
  updatedAt?: string;
  relationships?: Array<{ relationshipType: string; targetCompanyId: string }>;
}

export interface ScoreSnapshot {
  scoreSnapshotId: number;
  companyId: string;
  companyName?: string;
  targetCompanyProfileId?: string;
  projectId: string;
  candidateId: string;
  partnerFitScore?: number | null;
  competitionLevel?: number | null;
  riskLevel?: number | null;
  relationshipStrength?: number | null;
  totalScore?: number | null;
  overallScore?: number | null;
  factorsJson: string;
  ruleVersion: string;
  generatedBy: string;
  evaluatedRole?: string | null;
  createdAt: string;
}

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return i18n.t('ecosystem:table.noCompanyName');
};

type GroupTab = 'partners' | 'competitors' | 'suppliers' | 'potential-partners';

const TABS: Array<{ value: GroupTab; label: string }> = [
  { value: 'partners', label: i18n.t('ecosystem:tabs.partners') },
  { value: 'competitors', label: i18n.t('ecosystem:tabs.competitors') },
  { value: 'suppliers', label: i18n.t('ecosystem:tabs.suppliers') },
  { value: 'potential-partners', label: i18n.t('ecosystem:tabs.potentialPartners') },
];

const badgeBase: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: 1.4,
  padding: '2px 8px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

interface EcosystemOverviewProps {
  setActivePage?: (page: string) => void;
}

export const EcosystemOverview: React.FC<EcosystemOverviewProps> = ({ setActivePage }) => {
  const { t } = useTranslation('ecosystem');
  const [activeTab, setActiveTab] = useState<GroupTab>('partners');
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<GraphCompany[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [showAllScores, setShowAllScores] = useState(false);
  const [selectedScore, setSelectedScore] = useState<ScoreSnapshot | null>(null);

  // Detail Drawer Fallback State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyProfile, setCompanyProfile] = useState<ProfileResponse | null>(null);
  const [companySources, setCompanySources] = useState<ProfileSourcesResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load Recent Scores
  useEffect(() => {
    setScoresLoading(true);
    api.get<ScoreSnapshot[]>('/dashboard/recent-scores')
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setRecentScores(res.data);
        } else {
          setRecentScores([]);
        }
      })
      .catch(() => setRecentScores([]))
      .finally(() => setScoresLoading(false));
  }, []);

  // Load Group Data by Tab
  useEffect(() => {
    setLoading(true);
    let endpoint = '/dashboard/partners';
    if (activeTab === 'competitors') endpoint = '/dashboard/competitors';
    if (activeTab === 'suppliers') endpoint = '/dashboard/suppliers';
    if (activeTab === 'potential-partners') endpoint = '/dashboard/potential-partners';

    api.get<GraphCompany[]>(endpoint)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setCompanies(res.data);
        } else {
          setCompanies([]);
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Search filter
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.companyId?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  // Latest score snapshot per company for quick table badges
  const scoreByCompany = useMemo(() => {
    const map = new Map<string, ScoreSnapshot>();
    recentScores.forEach((s) => {
      if (!map.has(s.companyId)) map.set(s.companyId, s);
    });
    return map;
  }, [recentScores]);

  // Handle View Profile Click
  const handleSelectCompany = (id: string) => {
    localStorage.setItem('apms-selected-company', id);
    if (setActivePage) {
      setActivePage('company-detail');
      return;
    }

    setSelectedCompanyId(id);
    setProfileLoading(true);
    Promise.allSettled([
      api.get<ProfileResponse>(`/company-profiles/${id}`),
      api.get<ProfileSourcesResponse>(`/company-profiles/${id}/sources`),
    ])
      .then(([profRes, srcRes]) => {
        if (profRes.status === 'fulfilled' && profRes.value?.data) {
          setCompanyProfile(profRes.value.data);
        } else {
          setCompanyProfile(null);
        }
        if (srcRes.status === 'fulfilled' && srcRes.value?.data) {
          setCompanySources(srcRes.value.data);
        } else {
          setCompanySources(null);
        }
      })
      .finally(() => setProfileLoading(false));
  };

  const closeModal = () => {
    setSelectedCompanyId(null);
    setCompanyProfile(null);
    setCompanySources(null);
  };

  const visibleScores = showAllScores ? recentScores : recentScores.slice(0, 4);

  return (
    <section className="workspace-page" id="page-ecosystem-overview">
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', color: '#64748B', fontSize: 'var(--text-caption)', fontWeight: 500 }}>
          <span>{t('breadcrumb.intelligence')}</span>
          <span>/</span>
          <span>{t('breadcrumb.title')}</span>
        </div>

        {/* Banner */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-label)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563EB', display: 'block' }}>
              {t('banner.kicker')}
            </span>
            <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {t('banner.title')}
            </h1>
          </div>
        </div>

        {/* Recent AI Evaluation Scores */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 600, color: '#0F172A' }}>{t('scores.title')}</h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-caption)', color: '#94A3B8' }}>
                {t('scores.subtitle')}
              </p>
            </div>
            {recentScores.length > 4 && (
              <button
                onClick={() => setShowAllScores((v) => !v)}
                style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: '#1D4ED8', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 0' }}
              >
                {showAllScores ? t('scores.collapse') : t('scores.viewAll', { count: recentScores.length })}
              </button>
            )}
          </div>

          {scoresLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <ScoreCardSkeleton key={i} />
              ))}
            </div>
          ) : recentScores.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '10px' }}>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>{t('scores.emptyTitle')}</div>
              <div style={{ fontSize: 'var(--text-caption)', color: '#94A3B8' }}>{t('scores.emptyBody')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {visibleScores.map((score) => (
                <RecentScoreCard key={score.scoreSnapshotId} score={score} onClick={setSelectedScore} />
              ))}
            </div>
          )}
        </div>

        {/* Toolbar: tabs + search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '4px', flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.value ? '#FFFFFF' : 'transparent',
                  color: activeTab === tab.value ? '#1D4ED8' : '#64748B',
                  boxShadow: activeTab === tab.value ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: 'var(--text-body)', color: '#0F172A', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Companies Table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '8px 16px 16px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 0.8fr 0.9fr 0.7fr 1fr', gap: '12px', alignItems: 'center', padding: '14px 4px', borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none' }}>
                  <div className="eco-skeleton" style={{ height: '14px', width: '70%' }} />
                  <div className="eco-skeleton" style={{ height: '20px', width: '60%' }} />
                  <div className="eco-skeleton" style={{ height: '12px', width: '40%' }} />
                  <div className="eco-skeleton" style={{ height: '20px', width: '60%' }} />
                  <div className="eco-skeleton" style={{ height: '20px', width: '50%' }} />
                  <div className="eco-skeleton" style={{ height: '26px', width: '80%' }} />
                </div>
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                {t('table.emptyGroup', { group: TABS.find((tab) => tab.value === activeTab)?.label })}
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: '#94A3B8' }}>{t('table.emptyHint')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.company')}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.industry')}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.relationship')}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.fitScore')}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.risk')}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((comp) => {
                    const snap = scoreByCompany.get(comp.companyId);
                    const fit = snap?.partnerFitScore;
                    const risk = snap?.riskLevel;
                    const fitTone = scoreTone(fit);
                    const riskToneValue = riskTone(risk);
                    return (
                      <tr key={comp.companyId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <span style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-caption)', flexShrink: 0 }}>
                              {formatCompanyName(comp.name).charAt(0).toUpperCase()}
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>{formatCompanyName(comp.name)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ ...badgeBase, background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}>
                            {comp.industry || t('table.generalIndustry')}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 'var(--text-caption)', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {t('table.relationshipsCount', { count: comp.relationships?.length || 0 })}
                        </td>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          {fit != null ? (
                            <span style={{ ...badgeBase, background: fitTone.bg, color: fitTone.color }}>{fit}</span>
                          ) : (
                            <span style={{ fontSize: 'var(--text-caption)', color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          {risk != null ? (
                            <span style={{ ...badgeBase, background: riskToneValue.bg, color: riskToneValue.color }}>{risk}</span>
                          ) : (
                            <span style={{ fontSize: 'var(--text-caption)', color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '11px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleSelectCompany(comp.companyId)}
                            style={{ fontSize: '13px', fontWeight: 600, color: '#1D4ED8', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 10px', height: '28px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
                          >
                            {t('table.viewProfile')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Profile Detail Side Drawer */}
      <CompanyDetailDrawer
        companyId={selectedCompanyId}
        relationshipType={activeTab}
        profile={companyProfile}
        sources={companySources}
        recentScore={recentScores.find((s) => s.companyId === selectedCompanyId) || null}
        loading={profileLoading}
        onClose={closeModal}
      />

      {/* Score Detail Modal */}
      <ScoreDetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />
    </section>
  );
};
