import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Building2, ExternalLink, FileText, Globe2, Mail, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import styles from './CompanyProfiles.module.css';

const tabs = ['Overview', 'Business', 'Relationship', 'Risk & Compliance', 'Sources', 'Activity'] as const;
type CompanyDetailTab = (typeof tabs)[number];

interface CompanyDetailProps {
  companyId?: string;
  setActivePage?: (page: string) => void;
}

const EMPTY = 'No data';

const profileName = (profile: ProfileResponse | null) =>
  profile?.identity?.tradeName || profile?.identity?.legalName || profile?.companyId || 'Company profile';

const legalName = (profile: ProfileResponse | null) =>
  profile?.identity?.legalName || profileName(profile);

const formatDate = (value?: string | null) => {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const displayList = (items?: Array<string | { name?: string; category?: string; description?: string }>) => {
  if (!items?.length) return [EMPTY];
  return items.map((item) => {
    if (typeof item === 'string') return item;
    return [item.name, item.category, item.description].filter(Boolean).join(' - ') || EMPTY;
  });
};

const statusTone = (status?: string) => {
  if (status === 'APPROVED' || status === 'VERIFIED') return styles.success;
  if (status === 'PENDING_REVIEW' || status === 'NEEDS_UPDATE') return styles.warning;
  if (status === 'REJECTED' || status === 'UNVERIFIED') return styles.danger;
  return styles.neutral;
};

const InfoField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className={styles.infoField}>
    <span>{label}</span>
    <strong>{value || EMPTY}</strong>
  </div>
);

const ListPanel: React.FC<{ title: string; items?: string[]; tone?: string }> = ({ title, items, tone }) => (
  <article className={`${styles.listPanel} ${tone || ''}`}>
    <h3>{title}</h3>
    {!items?.length ? (
      <p>{EMPTY}</p>
    ) : (
      <ul>
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    )}
  </article>
);

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId, setActivePage }) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyDetailTab>('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = companyId ?? localStorage.getItem('apms-selected-company');

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      setError('No company profile selected.');
      return;
    }

    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, sourcesRes] = await Promise.all([
          api.get<ProfileResponse>(`/profiles/${resolvedId}`, { signal: controller.signal }),
          api.get<ProfileSourcesResponse>(`/profiles/${resolvedId}/sources`, { signal: controller.signal }).catch(() => null),
        ]);

        if (controller.signal.aborted) return;
        setProfile(profileRes.data);
        setSources(sourcesRes?.data ?? null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setSources(null);
          setError(err instanceof Error ? err.message : 'Cannot load company profile.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [resolvedId]);

  const metrics = useMemo(() => {
    const completenessItems = [
      Boolean(profile?.identity?.legalName || profile?.identity?.tradeName),
      Boolean(profile?.business?.industries?.length),
      Boolean(profile?.contact?.website),
      Boolean(profile?.insights),
      Boolean(profile?.metadata?.updatedAt),
    ];
    const completeness = Math.round((completenessItems.filter(Boolean).length / completenessItems.length) * 100);

    return [
      { label: 'Completeness', value: `${completeness}%`, note: 'Core profile data coverage' },
      { label: 'Review status', value: profile?.reviewStatus || 'UNVERIFIED', note: 'Governance state' },
      { label: 'Documents', value: sources?.rawDocumentIds?.length ?? 0, note: 'Linked raw sources' },
      { label: 'Projects', value: sources?.projectIds?.length ?? 0, note: 'Related research work' },
    ];
  }, [profile, sources]);

  const address = profile?.contact?.addresses?.[0];
  const addressText = address?.fullAddress || [address?.city, address?.country].filter(Boolean).join(', ');
  const initials = profileName(profile).slice(0, 2).toUpperCase();

  if (loading) {
    return <section className={styles.page}><div className={styles.loading}>Loading company profile...</div></section>;
  }

  if (error || !profile) {
    return (
      <section className={styles.page}>
        <div className={styles.error}>{error || 'Cannot load company profile.'}</div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.backRow}>
        <button className={styles.backButton} type="button" onClick={() => setActivePage ? setActivePage('companies') : history.back()}>
          <ArrowLeft size={16} /> Back to company list
        </button>
      </div>
      <div className={styles.detailHeader}>
        <div className={styles.profileMark}>{initials}</div>
        <div>
          <span className={styles.eyebrow}>Official company profile</span>
          <h1>{profileName(profile)}</h1>
          <p>{legalName(profile)}</p>
          <div className={styles.headerMeta}>
            <span className={`${styles.badge} ${statusTone(profile.reviewStatus)}`}>{profile.reviewStatus || 'UNVERIFIED'}</span>
          </div>
        </div>
        <div className={styles.actions}>
        </div>
      </div>

      <div className={styles.metricGrid}>
        {metrics.map((item) => (
          <article className={styles.metricCard} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </div>

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <button key={tab} className={activeTab === tab ? styles.activeTab : ''} type="button" onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      <div className={styles.detailLayout}>
        <main className={styles.detailMain}>
          {activeTab === 'Overview' && (
            <>
              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <h2>Company Snapshot</h2>
                    <p>Core identity and searchable company facts created after candidate approval.</p>
                  </div>
                </div>
                <div className={styles.infoGrid}>
                  <InfoField label="Legal name" value={profile.identity?.legalName} />
                  <InfoField label="Trade name" value={profile.identity?.tradeName} />
                  <InfoField label="Tax code" value={profile.identity?.taxCode} />
                  <InfoField label="Registration" value={profile.identity?.registrationNumber} />
                  <InfoField label="Industry" value={profile.business?.industries?.join(', ')} />
                  <InfoField label="Business model" value={profile.business?.businessModel} />
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <h2>Strategic Highlights</h2>
                    <p>Approved SWOT signals available on this company profile.</p>
                  </div>
                </div>
                <div className={styles.swotGrid}>
                  <ListPanel title="Strengths" items={profile.insights?.strengths} tone={styles.successPanel} />
                  <ListPanel title="Weaknesses" items={profile.insights?.weaknesses} tone={styles.warningPanel} />
                  <ListPanel title="Opportunities" items={profile.insights?.opportunities} tone={styles.infoPanel} />
                  <ListPanel title="Threats" items={profile.insights?.threats} tone={styles.dangerPanel} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'Business' && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}><div><h2>Business Information</h2><p>Operating model, markets, products, and size.</p></div></div>
              <div className={styles.infoGrid}>
                <InfoField label="Employee tier" value={profile.companySize?.employeeTier} />
                <InfoField label="Employee count" value={profile.companySize?.employeeCount?.toLocaleString()} />
                <InfoField label="Revenue tier" value={profile.companySize?.revenueTier} />
                <InfoField label="Markets" value={profile.business?.markets?.join(', ')} />
                <InfoField label="Target customers" value={profile.business?.targetCustomers?.join(', ')} />
              </div>
              <div className={styles.listGrid}>
                <ListPanel title="Products" items={displayList(profile.business?.products)} />
                <ListPanel title="Industries" items={displayList(profile.business?.industries)} />
              </div>
            </section>
          )}

          {activeTab === 'Relationship' && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}><div><h2>Relationship Context</h2><p>How this company is used across project and scoring workflows.</p></div></div>
              <div className={styles.infoGrid}>
                <InfoField label="Relationship tags" value={(profile.tags ?? []).join(', ') || EMPTY} />
                <InfoField label="Related projects" value={sources?.projectIds?.length ?? 0} />
                <InfoField label="Candidate sources" value={sources?.candidateIds?.length ?? 0} />
                <InfoField label="Import jobs" value={sources?.importJobIds?.length ?? 0} />
              </div>
            </section>
          )}

          {activeTab === 'Risk & Compliance' && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}><div><h2>Risk & Compliance</h2><p>Threats and validation signals for downstream decisions.</p></div></div>
              <div className={styles.swotGrid}>
                <ListPanel title="Threats" items={profile.insights?.threats} tone={styles.dangerPanel} />
                <ListPanel title="Weaknesses" items={profile.insights?.weaknesses} tone={styles.warningPanel} />
              </div>
            </section>
          )}

          {activeTab === 'Sources' && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}><div><h2>Source Traceability</h2><p>Evidence that created or updated this official profile.</p></div></div>
              <div className={styles.sourceGrid}>
                <ListPanel title="Projects" items={sources?.projectIds} />
                <ListPanel title="Import jobs" items={sources?.importJobIds} />
                <ListPanel title="Raw documents" items={sources?.rawDocumentIds} />
                <ListPanel title="Candidates" items={sources?.candidateIds} />
              </div>
            </section>
          )}

          {activeTab === 'Activity' && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}><div><h2>Activity History</h2><p>Latest visible lifecycle events for this profile.</p></div></div>
              <div className={styles.timeline}>
                <article><strong>Profile updated</strong><span>{formatDate(profile.metadata?.updatedAt)}</span><p>Company profile data was updated in the official profile index.</p></article>
                <article><strong>Profile created</strong><span>{formatDate(profile.metadata?.createdAt)}</span><p>Company profile was created from approved candidate or manual workflow.</p></article>
                <article><strong>Sources linked</strong><span>{sources ? `${sources.candidateIds.length} candidate references` : EMPTY}</span><p>Source references are available for traceability.</p></article>
              </div>
            </section>
          )}
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard}>
            <h3>Quick Contact</h3>
            <div className={styles.contactList}>
              <span><Globe2 size={16} />{profile.contact?.website || EMPTY}</span>
              <span><Mail size={16} />{profile.contact?.emails?.[0] || EMPTY}</span>
              <span><Phone size={16} />{profile.contact?.phones?.[0] || EMPTY}</span>
              <span><MapPin size={16} />{addressText || EMPTY}</span>
            </div>
          </section>

          <section className={styles.sideCard}>
            <h3>Profile Health</h3>
            <div className={styles.healthList}>
              <span><ShieldAlert size={16} /> Status: <strong>{profile.reviewStatus || 'UNVERIFIED'}</strong></span>
              <span><Activity size={16} /> Version: <strong>{profile.version ?? 1}</strong></span>
              <span><ExternalLink size={16} /> Sources: <strong>{sources?.rawDocumentIds?.length ?? 0}</strong></span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};
