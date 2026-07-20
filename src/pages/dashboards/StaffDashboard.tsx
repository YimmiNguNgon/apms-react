import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';

interface Props {
  setActivePage?: (page: string) => void;
}

export const StaffDashboard: React.FC<Props> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/dashboard/summary'),
      api.get<any>('/profiles'),
    ])
      .then(([summaryRes, profilesRes]) => {
        if (summaryRes?.success && summaryRes?.data) {
          setSummary(summaryRes.data);
        }

        if (profilesRes?.success && profilesRes?.data) {
          const rows = Array.isArray(profilesRes.data) ? profilesRes.data : (profilesRes.data.content || []);
          setCompanies(rows.slice(0, 5));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Assigned', value: summary?.totalProjects ?? 0, note: '+2 from yesterday' },
    { label: 'In progress', value: summary?.pendingReviewCandidates ?? 0, note: 'Review queue' },
    { label: 'Waiting review', value: companies.length, note: 'Profiles ready' },
    { label: 'Completed', value: summary?.totalCandidates ?? 0, note: '15% improvement' },
    { label: 'Uploaded', value: summary?.totalCompanyProfiles ?? 0, note: 'Active records' },
  ];

  const priorityCompany = companies[0];
  const priorityLabel = priorityCompany?.identity?.tradeName || priorityCompany?.identity?.legalName || 'Research workspace';
  const recentItems = companies.slice(0, 4);

  return (
    <section className="workspace-page role-dashboard role-dashboard-staff" id="page-staff-dashboard">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Execution <span>/</span> Research staff workspace</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Research flow</span>
              <h1>Research staff dashboard</h1>
              <p>Track assigned work, keep profiles moving, and hand off clean records without losing evidence quality.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setActivePage?.('company-profiles')}>View profiles</button>
              <button className="btn btn-primary" onClick={() => setActivePage?.('upload-documents')}>Upload documents</button>
            </div>
          </div>

          <div className="workspace-hero role-focus-card staff">
            <div className="workspace-hero-copy">
              <span className="workspace-chip workspace-chip-inverse">Research execution flow</span>
              <h2>Good morning, {currentUser?.name}.</h2>
              <p>
                {loading
                  ? 'Preparing your assignment queue and profile activity.'
                  : `You have ${summary?.pendingReviewCandidates ?? 0} items waiting review and ${summary?.totalProjects ?? 0} active projects in motion.`}
              </p>
              <div className="workspace-hero-stats">
                <div>
                  <strong>{summary?.totalProjects ?? 0}</strong>
                  <span>Assigned</span>
                </div>
                <div>
                  <strong>{summary?.pendingReviewCandidates ?? 0}</strong>
                  <span>Reviewing</span>
                </div>
                <div>
                  <strong>{companies.length}</strong>
                  <span>Due today</span>
                </div>
              </div>
              <div className="workspace-head-actions">
                <button className="btn btn-light" onClick={() => setActivePage?.('upload-documents')}>Continue working</button>
                <button className="btn btn-ghost-light" onClick={() => setActivePage?.('company-profiles')}>View my tasks</button>
              </div>
            </div>
          </div>

          <div className="workspace-stats">
            {stats.map((stat) => (
              <article key={stat.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Today&apos;s focus</h3>
                <p>Priority research and profile review you should finish first.</p>
              </div>
              <button className="workspace-link-btn" onClick={() => setActivePage?.('company-profiles')}>View all tasks</button>
            </div>
            <div className="workspace-focus-card">
              <div className="workspace-focus-icon">Q</div>
              <div className="workspace-focus-copy">
                <div className="workspace-focus-title">
                  Research {priorityLabel}
                  <span className="workspace-badge danger">High priority</span>
                </div>
                <p>Due today. Keep the profile complete before handing it to final review.</p>
                <div className="workspace-progress">
                  <div className="workspace-progress-bar">
                    <div style={{ width: '75%' }} />
                  </div>
                  <div className="workspace-progress-meta">
                    <span>75% complete</span>
                    <span>2h 15m remaining</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setActivePage?.('company-profiles')}>Continue</button>
            </div>
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Recent company profiles</h3>
                <p>Profiles you touched most recently.</p>
              </div>
            </div>
            <div className="workspace-table">
              <div className="workspace-table-row workspace-table-head">
                <span>Company</span>
                <span>Industry</span>
                <span>Status</span>
                <span>AI confidence</span>
                <span>Action</span>
              </div>
              {recentItems.length === 0 ? (
                <div className="workspace-empty">No company profile activity yet.</div>
              ) : recentItems.map((company, index) => {
                const name = company.identity?.tradeName || company.identity?.legalName || 'Business profile';
                const industry = company.business?.industries?.[0] || 'Unclassified';
                const reviewStatus = company.reviewStatus || 'PENDING';
                const confidence = 82 + index * 4;

                return (
                  <div key={`${name}-${index}`} className="workspace-table-row">
                    <div>
                      <strong>{name}</strong>
                      <small>{company.contact?.addresses?.[0]?.city || 'Vietnam'}</small>
                    </div>
                    <span>{industry}</span>
                    <span className={`workspace-badge ${reviewStatus === 'VERIFIED' ? 'success' : 'neutral'}`}>
                      {reviewStatus}
                    </span>
                    <span className="workspace-confidence">{confidence}%</span>
                    <button className="workspace-icon-btn" onClick={() => setActivePage?.('company-profiles')}>View</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Contextual AI</span>
            <h3>Active session</h3>
            <div className="workspace-ai-note">
              <strong>AI insight</strong>
              <p>Based on your recent company research, there are related profiles that can be merged before review.</p>
              <button className="workspace-link-btn" onClick={() => setActivePage?.('ai-extracted-data')}>Review extraction</button>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Urgent tasks</span>
            <div className="workspace-alert-list">
              <article className="workspace-alert danger">
                <strong>Missing tax code</strong>
                <p>{priorityLabel} candidate profile requires regional tax ID verification.</p>
              </article>
              <article className="workspace-alert success">
                <strong>Data enrichment</strong>
                <p>One profile is missing official website validation info.</p>
              </article>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Recent activity</span>
            <div className="workspace-activity-list">
              <article>
                <strong>Edited company profile</strong>
                <p>14 minutes ago</p>
              </article>
              <article>
                <strong>Submitted for review</strong>
                <p>2 hours ago</p>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
