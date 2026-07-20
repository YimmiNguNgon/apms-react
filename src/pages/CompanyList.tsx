import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { resolveScoreRole, SCORE_RULES, type ScoreRole } from '../constants/scoreRules';

interface CompanyListProps {
  setActivePage: (page: string) => void;
}

export const CompanyList: React.FC<CompanyListProps> = ({ setActivePage }) => {
  const [profileList, setProfileList] = useState<any[]>([]);
  const [totalElements, setTotalElements] = useState(47);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  const fetchProfiles = (query = '', page = 0) => {
    setLoading(true);
    const endpoint = query ? '/profiles/search' : '/profiles';
    const params: Record<string, string | number> = { page, size: pageSize };
    if (query) {
      params.name = query;
    }

    api.get<any>(endpoint, { params })
      .then((res) => {
        if (res?.success && res?.data) {
          const content = res.data.content || [];
          setProfileList(content);
          setTotalElements(res.data.totalElements || content.length);
          setCurrentPage(page);
        }
      })
      .catch((err) => {
        console.warn('Could not load company profiles from API:', err);
        setProfileList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const mappedProfiles = profileList.map((profile, index) => {
    const name = profile.identity?.tradeName || profile.identity?.legalName || 'New company';
    const industry = profile.business?.industries?.[0] || 'Unclassified';
    const country = profile.contact?.addresses?.[0]?.country || profile.contact?.addresses?.[0]?.city || 'Vietnam';
    const relationship = resolveScoreRole(profile.relationshipType, profile.reviewStatus, index % 3 === 0 ? 'PARTNER' : index % 3 === 1 ? 'SUPPLIER' : 'CUSTOMER') ?? 'PARTNER';
    const score = 62 + ((name.length + index * 7) % 32);

    return {
      companyId: profile.companyId || profile.id,
      name,
      website: profile.contact?.website || profile.identity?.website || 'apms.local',
      industry,
      country,
      relationship,
      score,
      reviewStatus: profile.reviewStatus || 'UNVERIFIED',
      updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('vi-VN') : '12/07/2026',
    };
  });

  const [activeRoleModel, setActiveRoleModel] = useState<ScoreRole>('PARTNER');
  const activeScoreModel = SCORE_RULES[activeRoleModel];

  const kpis = [
    { label: 'Total companies', value: totalElements || mappedProfiles.length, note: 'Profiles stored in the workspace' },
    { label: 'Active partners', value: mappedProfiles.filter((item) => item.relationship === 'PARTNER').length, note: 'Confirmed active relations' },
    { label: 'Potential partners', value: mappedProfiles.filter((item) => item.reviewStatus !== 'VERIFIED' || item.relationship === 'POTENTIAL_PARTNER').length, note: 'Waiting verification or outreach' },
    { label: 'Suppliers', value: mappedProfiles.filter((item) => item.relationship === 'SUPPLIER').length, note: 'Verified supply-side organizations' },
    { label: 'Customers', value: mappedProfiles.filter((item) => item.relationship === 'CUSTOMER').length, note: 'Tracked end users and clients' },
  ];

  const handleSelectCompany = (companyId?: string) => {
    if (companyId) {
      localStorage.setItem('apms-selected-company', companyId);
    }
    setActivePage('company-detail');
  };

  return (
    <section className="workspace-page" id="page-company-profiles">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Projects <span>/</span> AI Strategy Research <span>/</span> Company Profiles</div>
          <div className="workspace-page-head">
            <div>
              <h1>Company profile management</h1>
              <p>Manage approved company profiles and partnership information across the workspace.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => fetchProfiles(searchQuery, currentPage)} disabled={loading}>Refresh</button>
              <button className="btn btn-primary" onClick={() => setActivePage('add-company')}>New profile</button>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {kpis.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-filter-row">
            <div className="workspace-search">
              <input
                type="text"
                placeholder="Search company..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    fetchProfiles(searchQuery, 0);
                  }
                }}
              />
            </div>
            <div className="workspace-filter-chips">
              <button className="workspace-chip">Status: all</button>
              <button className="workspace-chip">Industry: technology</button>
              <button className="workspace-chip">Country</button>
              <button className="workspace-chip">Relationship</button>
            </div>
          </div>

          <div className="workspace-score-callout">
            <div>
              <span className="workspace-side-eyebrow">Score rule reference</span>
              <h3>{activeScoreModel.title}</h3>
              <p>{activeScoreModel.summary}</p>
            </div>
            <div className="workspace-filter-chips">
              {(['PARTNER', 'POTENTIAL_PARTNER', 'COMPETITOR', 'CUSTOMER', 'SUPPLIER'] as ScoreRole[]).map((role) => (
                <button
                  key={role}
                  className={`workspace-chip ${activeRoleModel === role ? 'workspace-chip-active' : ''}`}
                  onClick={() => setActiveRoleModel(role)}
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

          <div className="workspace-panel">
            <div className="workspace-table">
              <div className="workspace-table-row workspace-table-head">
                <span>Company</span>
                <span>Industry</span>
                <span>Country</span>
                <span>Relationship</span>
                <span>Score</span>
                <span>Last updated</span>
                <span>Action</span>
              </div>
              {mappedProfiles.length === 0 && !loading ? (
                <div className="workspace-empty">No company profiles found.</div>
              ) : mappedProfiles.map((profile) => (
                <div key={profile.companyId} className="workspace-table-row">
                  <div>
                    <strong>{profile.name}</strong>
                    <small>{profile.website}</small>
                  </div>
                  <span>{profile.industry}</span>
                  <span>{profile.country}</span>
                  <span className={`workspace-badge ${profile.relationship === 'PARTNER' ? 'success' : profile.relationship === 'SUPPLIER' ? 'info' : profile.relationship === 'COMPETITOR' ? 'danger' : 'neutral'}`}>
                    {profile.relationship.replaceAll('_', ' ')}
                  </span>
                  <span className="workspace-confidence">{profile.score}</span>
                  <span>{profile.updatedAt}</span>
                  <button className="workspace-icon-btn" onClick={() => handleSelectCompany(profile.companyId)}>View</button>
                </div>
              ))}
            </div>

            <div className="workspace-pagination">
              <span>Showing {mappedProfiles.length} of {totalElements} companies</span>
              <div>
                <button className="workspace-page-btn" disabled={currentPage === 0} onClick={() => fetchProfiles(searchQuery, currentPage - 1)}>Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => (
                  <button
                    key={index}
                    className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                    onClick={() => fetchProfiles(searchQuery, index)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button className="workspace-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => fetchProfiles(searchQuery, currentPage + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Current model</span>
            <div className="workspace-ai-note">
              <strong>{activeScoreModel.outcomeLabel}</strong>
              <p>Use the role model that matches the company context before interpreting a profile score.</p>
            </div>
          </div>

          <div className="workspace-side-card">
            <div className="workspace-side-header">
              <span className="workspace-side-eyebrow">Filters</span>
            </div>
            <div className="workspace-checklist">
              <div>
                <strong>Industry</strong>
                <label><input type="checkbox" defaultChecked /> Technology</label>
                <label><input type="checkbox" /> Finance</label>
                <label><input type="checkbox" /> Healthcare</label>
              </div>
              <div>
                <strong>Relationship</strong>
                <label><input type="checkbox" /> Partner</label>
                <label><input type="checkbox" /> Vendor</label>
                <label><input type="checkbox" /> Customer</label>
              </div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">AI research assistant</span>
            <div className="workspace-ai-thread">
              <div className="workspace-ai-bubble user">How is Samsung positioned right now?</div>
              <div className="workspace-ai-bubble assistant">
                Samsung remains strong in premium devices and continues to diversify manufacturing footprints across Asia.
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setActivePage('personal-ai-agent')}>Open AI assistant</button>
          </div>
        </aside>
      </div>
    </section>
  );
};
