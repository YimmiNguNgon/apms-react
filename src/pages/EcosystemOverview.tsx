import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import { CompanyDetailDrawer } from '../components/CompanyDetailDrawer';

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
  projectId: string;
  candidateId: string;
  partnerFitScore: number;
  competitionLevel: number;
  riskLevel: number;
  relationshipStrength: number;
  totalScore: number;
  factorsJson: string;
  ruleVersion: string;
  generatedBy: string;
  createdAt: string;
}

const formatCompanyName = (name?: string | null, rawId?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  if (rawId && rawId.trim()) {
    if (/^[0-9a-fA-F]{24}$/.test(rawId.trim())) {
      return `Công ty (ID: ${rawId.trim().substring(0, 8)}...)`;
    }
    return rawId.trim();
  }
  return 'Chưa có tên công ty';
};

type GroupTab = 'partners' | 'competitors' | 'suppliers' | 'potential-partners';

interface EcosystemOverviewProps {
  setActivePage?: (page: string) => void;
}

export const EcosystemOverview: React.FC<EcosystemOverviewProps> = ({ setActivePage }) => {
  const [activeTab, setActiveTab] = useState<GroupTab>('partners');
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<GraphCompany[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Drawer Fallback State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyProfile, setCompanyProfile] = useState<ProfileResponse | null>(null);
  const [companySources, setCompanySources] = useState<ProfileSourcesResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load Recent Scores
  useEffect(() => {
    api.get<ScoreSnapshot[]>('/dashboard/recent-scores')
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setRecentScores(res.data);
        }
      })
      .catch(() => setRecentScores([]));
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

  return (
    <section className="workspace-page" id="page-ecosystem-overview">
      <div className="workspace-shell">
        <div className="workspace-main-full">
          <div className="workspace-breadcrumbs">Enterprise Ecosystem <span>/</span> Strategic Overview</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Executive Intelligence</span>
              <h1>Enterprise Ecosystem Overview</h1>
              <p>Comprehensive market posture across partners, competitors, suppliers, and potential targets.</p>
            </div>
          </div>

          {/* Recent Scores Mini Widget */}
          <div className="workspace-panel" style={{ marginBottom: '24px' }}>
            <div className="workspace-section-head">
              <div>
                <h3>Recent AI Evaluation Scores</h3>
                <p>Latest partner fit and risk assessments system-wide.</p>
              </div>
            </div>
            {recentScores.length === 0 ? (
              <div className="workspace-empty" style={{ padding: '16px' }}>No recent score snapshots recorded.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {recentScores.slice(0, 4).map((score) => (
                  <article key={score.scoreSnapshotId} className="workspace-stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                    <span className="workspace-stat-label">Target: {formatCompanyName(score.companyName, score.companyId)}</span>
                    <strong className="workspace-stat-value" style={{ color: score.totalScore >= 70 ? '#22C55E' : '#F59E0B' }}>
                      {score.totalScore} / 100
                    </strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>Fit Score: <strong>{score.partnerFitScore}</strong> | Risk Level: <strong>{score.riskLevel}</strong></span>
                      <span>Evaluated By: {score.generatedBy || 'AI Engine'}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Tabs & Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
            <div className="tab-group" style={{ display: 'flex', gap: '8px' }}>
              {(['partners', 'competitors', 'suppliers', 'potential-partners'] as GroupTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab(tab)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, maxWidth: '320px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by company name, ID, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>

          {/* Companies Table */}
          <div className="workspace-panel">
            {loading ? (
              <div className="workspace-empty">Loading ecosystem companies...</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="workspace-empty">No companies found in category "{activeTab.replace('-', ' ')}".</div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Company ID</th>
                      <th style={{ padding: '12px' }}>Name</th>
                      <th style={{ padding: '12px' }}>Industry</th>
                      <th style={{ padding: '12px' }}>Relationships</th>
                      <th style={{ padding: '12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((comp) => (
                      <tr key={comp.companyId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{comp.companyId}</td>
                        <td style={{ padding: '12px' }}>{formatCompanyName(comp.name, comp.companyId)}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-blue">{comp.industry || 'General Industry'}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{comp.relationships?.length || 0} linkages</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleSelectCompany(comp.companyId)}
                          >
                            View Profile
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
    </section>
  );
};
