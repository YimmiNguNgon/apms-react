import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, api } from '../services/api';
import type { ImportJobResponse, PageResult, ProjectResponse } from '../types/domain';

// â”€â”€â”€ Upload Documents â”€â”€â”€
interface UploadFile {
  id?: number;
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'done' | 'error' | 'extracting' | 'extracted';
  progress: number;
  importJobId?: number;
  originalFile?: File;
}

const mapImportJobToFile = (job: ImportJobResponse): UploadFile => ({
  id: job.id,
  name: job.fileName || 'Tai lieu da tai len',
  size: 'N/A',
  type: (job.fileName || '').split('.').pop()?.toUpperCase() || 'FILE',
  status: job.status === 'COMPLETED' ? 'extracted' : job.status === 'FAILED' ? 'error' : 'done',
  progress: 100,
  importJobId: job.id,
});

interface AiExtractionResultPayload {
  importJobId?: number | null;
  rawDocumentId?: string | null;
  extractedData?: Record<string, unknown> | null;
  rawAiOutput?: string | null;
}



export const UploadDocuments: React.FC<{ setActivePage?: (page: string) => void }> = ({ setActivePage }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const fetchDocumentHistory = useCallback(async (projectId: string, signal?: AbortSignal) => {
    const res = await api.get<PageResult<ImportJobResponse>>(`/projects/${projectId}/documents`, {
      params: { page: 0, size: 10 },
      signal,
    });

    if (!res?.success || !res.data?.content) return;

    const history = res.data.content.map(mapImportJobToFile);
    setFiles(prev => {
      const currentIds = new Set(prev.map(item => item.importJobId));
      const newHistory = history.filter(item => !currentIds.has(item.importJobId));
      return [...prev, ...newHistory];
    });
  }, []);

  const loadActiveProject = useCallback(async (signal?: AbortSignal) => {
    setProjectLoading(true);
    setProjectError(null);

    try {
      const res = await api.get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 100 },
        signal,
      });

      const projects = res?.data?.content ?? [];
      const stored = localStorage.getItem('apms-active-project');
      const validProject = projects.find(project => String(project.id) === stored) ?? projects[0] ?? null;

      if (!validProject) {
        setActiveProjectId(null);
        setFiles([]);
        setProjectError('Ban chua duoc gan vao du an nao de tai tai lieu.');
        return;
      }

      const nextProjectId = String(validProject.id);
      localStorage.setItem('apms-active-project', nextProjectId);
      setActiveProjectId(nextProjectId);
      await fetchDocumentHistory(nextProjectId, signal);
    } catch (err) {
      if (signal?.aborted) return;
      setActiveProjectId(null);
      setFiles([]);
      setProjectError(err instanceof Error ? err.message : 'Khong the tai du an kha dung.');
    } finally {
      if (!signal?.aborted) {
        setProjectLoading(false);
      }
    }
  }, [fetchDocumentHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadActiveProject(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadActiveProject]);

  const uploadFileToBackend = async (file: File, existingId?: number) => {
    const projectId = activeProjectId;
    if (!projectId) {
      setProjectError('Chua co du an hop le de upload tai lieu.');
      return;
    }

    const fileId = existingId || (Date.now() + Math.random());

    if (existingId) {
      setFiles(prev => prev.map(f => f.id === existingId ? { ...f, status: 'uploading', progress: 0 } : f));
    } else {
      setFiles(prev => [{
        id: fileId,
        name: file.name,
        size: file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        status: 'uploading',
        progress: 0,
        originalFile: file
      }, ...prev]);
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/projects/${projectId}/documents/upload`, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: percentComplete } : f));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const importJobId = res?.data?.id;
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', progress: 100, importJobId } : f));
        } catch (err) {
          console.error('Loi parse JSON:', err);
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', progress: 0 } : f));
        }
      } else {
        console.error('Loi server:', xhr.responseText);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', progress: 0 } : f));
      }
    };

    xhr.onerror = () => {
      console.error('Loi network upload file');
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', progress: 0 } : f));
    };

    xhr.send(formData);
  };

  const handleExtractAI = async (fileId: number, importJobId?: number) => {
    if (!importJobId) return;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'extracting', progress: 50 } : f));
    try {
      const res = await api.post<AiExtractionResultPayload>(`/import-jobs/${importJobId}/ai-extractions`);
      localStorage.setItem('apms-active-import-job', String(importJobId));

      if (res?.data) {
        localStorage.setItem(`apms-ai-data-${importJobId}`, JSON.stringify(res.data));
      }

      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'extracted', progress: 100 } : f));
      alert('Da trich xuat xong du lieu. Vui long bam "Xem ket qua" de tiep tuc.');
    } catch (error: unknown) {
      alert(`Loi trich xuat AI: ${error instanceof Error ? error.message : 'Khong ro loi'}`);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', progress: 100 } : f));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!activeProjectId || projectLoading) return;
    Array.from(e.dataTransfer.files).forEach(file => uploadFileToBackend(file));
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProjectId || projectLoading) return;
    Array.from(e.target.files || []).forEach(file => uploadFileToBackend(file));
  };

  const TYPE_COLOR: Record<string, string> = { PDF: '#EF4444', DOCX: '#2563EB', PPTX: '#F59E0B', XLSX: '#10B981' };

  return (
    <section className="enterprise-theme page active" style={{ minHeight: '100dvh', paddingBottom: '80px' }}>
      <div className="page-header">
        <h1>My Tasks</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{files.filter(f => f.status === 'done').length} tep da xu ly</span>
        </div>
      </div>

      {projectLoading && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px', color: 'var(--text-muted)' }}>
          Dang tai du an kha dung...
        </div>
      )}

      {projectError && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', color: '#991B1B' }}>
          <div style={{ marginBottom: 10 }}>{projectError}</div>
          <button className="btn btn-sm btn-outline" onClick={() => void loadActiveProject()}>
            Thu lai
          </button>
        </div>
      )}

      <div
        onClick={() => {
          if (!activeProjectId || projectLoading) return;
          inputRef.current?.click();
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
          background: dragging ? 'rgba(37,99,235,0.04)' : 'var(--surface)',
          cursor: activeProjectId && !projectLoading ? 'pointer' : 'not-allowed', transition: 'all 0.2s', marginBottom: 24,
          opacity: activeProjectId && !projectLoading ? 1 : 0.7,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>đŸ“</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
          Keo tha tep vao day
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Ho tro PDF, DOCX, PPTX, XLSX, TXT - toi da 50MB/tep
        </div>
        <button
          className="btn btn-primary"
          onClick={e => { e.stopPropagation(); if (!activeProjectId || projectLoading) return; inputRef.current?.click(); }}
          disabled={!activeProjectId || projectLoading}
        >
          Chon tep
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleSelect} accept=".pdf,.docx,.pptx,.xlsx,.txt" />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
          Tep da tai ({files.length})
        </div>
        {files.map((f, i) => (
          <div key={f.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `${TYPE_COLOR[f.type] || '#64748B'}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: TYPE_COLOR[f.type] || '#64748B',
            }}>{f.type}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{f.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 5, overflow: 'hidden', maxWidth: 200 }}>
                  <div style={{ width: `${f.progress}%`, height: '100%', borderRadius: 4, background: f.status === 'error' ? '#EF4444' : '#10B981' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.size}</span>
              </div>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: (f.status === 'done' || f.status === 'extracted') ? '#D1FAE5' : f.status === 'error' ? '#FEE2E2' : '#FEF3C7',
              color: (f.status === 'done' || f.status === 'extracted') ? '#065F46' : f.status === 'error' ? '#991B1B' : '#92400E',
            }}>
              {f.status === 'done' ? 'San sang trich xuat' : f.status === 'extracted' ? 'Da trich xuat' : f.status === 'error' ? 'Loi' : 'Dang xu ly'}
            </span>
            {f.status === 'error' && (
              <button 
                className="btn btn-sm btn-outline" 
                style={{ color: '#EF4444', borderColor: '#EF4444' }}
                onClick={() => f.originalFile && uploadFileToBackend(f.originalFile, f.id as number)}
                disabled={!f.originalFile}
              >
                Thu lai
              </button>
            )}
            {f.status === 'done' && f.importJobId && (
              <button 
                className="btn btn-sm btn-primary" 
                onClick={() => handleExtractAI(f.id as number, f.importJobId)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Trich xuat AI
              </button>
            )}
            {f.status === 'extracted' && (
              <button 
                className="btn btn-sm btn-outline" 
                style={{ padding: '6px 12px', fontSize: 12, borderColor: '#10B981', color: '#10B981' }}
                onClick={() => setActivePage?.('ai-extracted-data')}
              >
                Xem ket qua
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};// â”€â”€â”€ Partner Management (Staff) â”€â”€â”€


const TIER_CLR: Record<string, string> = { Platinum: '#8B5CF6', Gold: '#F59E0B', Silver: '#64748B' };

export const PartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const filtered = partners.filter(p => p.company.toLowerCase().includes(search.toLowerCase()) || p.contact.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    setLoading(true);
    api.get<any>('/dashboard/partners')
      .then(res => {
        if (res?.success && Array.isArray(res?.data)) {
          const mapped = res.data.map((c: any, i: number) => ({
            id: i + 1,
            company: c.tradeName || c.legalName || c.name || 'Doanh nghiá»‡p',
            contact: c.keyContact || c.contactPerson || 'ChÆ°a cáº­p nháº­t',
            phone: c.phone || 'N/A',
            email: c.email || 'N/A',
            tier: c.tier || c.partnerTier || 'Silver',
            lastContact: c.lastContactDate || new Date().toLocaleDateString('en-GB'),
          }));
          setPartners(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    const name = window.prompt("Nháº­p tĂªn cĂ´ng ty Ä‘á»‘i tĂ¡c má»›i:");
    if (!name) return;
    const contact = window.prompt("Nháº­p tĂªn ngÆ°á»i liĂªn há»‡:") || 'ChÆ°a cáº­p nháº­t';
    setPartners([{ id: Date.now(), company: name, contact, phone: 'N/A', email: 'N/A', tier: 'Silver', lastContact: new Date().toLocaleDateString('en-GB') }, ...partners]);
  };

  const summary = [
    { label: 'Tracked partners', value: partners.length, note: 'Active records in your directory' },
    { label: 'Priority tier', value: partners.filter((item) => item.tier === 'Platinum' || item.tier === 'Gold').length, note: 'Needs tighter relationship follow-up' },
    { label: 'Needs contact update', value: partners.filter((item) => item.contact === 'ChÆ°a cáº­p nháº­t').length, note: 'Missing verified owner details' },
  ];

  return (
    <section className="workspace-page" id="page-partner-management">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Company Profiles <span>/</span> Partner Directory</div>
          <div className="workspace-page-head">
            <div>
              <h1>Partner directory</h1>
              <p>Track partner contacts, relationship tier, and follow-up quality for the staff research workflow.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-primary" onClick={handleAdd}>Add contact</button>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {summary.map((item) => (
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
                className="search-input"
                placeholder="Search partner..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="workspace-filter-chips">
              <button className="workspace-chip">All tiers</button>
              <button className="workspace-chip">Strategic</button>
              <button className="workspace-chip">Needs update</button>
            </div>
          </div>

          <div className="workspace-card-grid">
            {filtered.map((partner) => (
              <article key={partner.id} className="workspace-directory-card" style={{ borderTopColor: TIER_CLR[partner.tier] || '#64748B' }}>
                <div className="workspace-directory-head">
                  <div>
                    <h3>{partner.company}</h3>
                    <p>{partner.contact}</p>
                  </div>
                  <span className="workspace-badge neutral" style={{ color: TIER_CLR[partner.tier] || '#64748B' }}>{partner.tier}</span>
                </div>
                <div className="workspace-directory-meta">
                  <div><strong>Phone</strong><span>{partner.phone}</span></div>
                  <div><strong>Email</strong><span>{partner.email}</span></div>
                  <div><strong>Last contact</strong><span>{partner.lastContact}</span></div>
                </div>
                <div className="workspace-directory-actions">
                  <button className="btn btn-outline">View profile</button>
                  <button className="btn btn-outline">Log outreach</button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="workspace-panel">
                <div className="workspace-empty">No partners matched the current search.</div>
              </div>
            )}
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Staff guidance</span>
            <ul className="workspace-bullet-list">
              <li>Keep a clear contact owner for each partner account.</li>
              <li>Update tier only after manager or reviewer confirmation.</li>
              <li>Log the latest outreach before handing off to the next step.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Follow-up queue</span>
            <div className="workspace-activity-list">
              {filtered.slice(0, 3).map((partner) => (
                <article key={`followup-${partner.id}`}>
                  <strong>{partner.company}</strong>
                  <p>Last contact: {partner.lastContact}</p>
                </article>
              ))}
              {filtered.length === 0 && <div className="workspace-empty">No follow-up items.</div>}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Status</span>
            <div className="workspace-ai-note">
              <strong>{loading ? 'Loading partner directory' : 'Directory ready'}</strong>
              <p>{loading ? 'Syncing partner records from the dashboard source.' : `${filtered.length} partner records are available for review.`}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

// â”€â”€â”€ Competitor Management (Staff) â”€â”€â”€

export const CompetitorManagement: React.FC = () => {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const TH_CLR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

  useEffect(() => {
    setLoading(true);
    api.get<any>('/dashboard/competitors')
      .then(res => {
        if (res?.success && Array.isArray(res?.data)) {
          const mapped = res.data.map((c: any, i: number) => ({
            id: i + 1,
            company: c.tradeName || c.legalName || c.name || 'Äá»‘i thá»§',
            segment: c.industry || c.segment || 'ChÆ°a phĂ¢n loáº¡i',
            threat: c.threatLevel || c.riskLevel || 'Medium',
            lastActivity: c.recentActivity || c.latestNews || 'ChÆ°a cáº­p nháº­t',
            date: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
          }));
          setCompetitors(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    const name = window.prompt("Nháº­p tĂªn Ä‘á»‘i thá»§ má»›i:");
    if (!name) return;
    const segment = window.prompt("LÄ©nh vá»±c hoáº¡t Ä‘á»™ng:") || 'ChÆ°a cáº­p nháº­t';
    setCompetitors([{ id: Date.now(), company: name, segment, threat: 'Medium', lastActivity: 'Má»›i Ä‘Æ°á»£c thĂªm vĂ o há»‡ thá»‘ng', date: new Date().toLocaleDateString('en-GB') }, ...competitors]);
  };

  return (
    <section className="enterprise-theme page active" style={{ minHeight: '100dvh', paddingBottom: '80px' }}>
      <div className="page-header">
        <h1>Competitor Management {loading && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 'normal' }}>(Äang táº£i...)</span>}</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleAdd}>+ ThĂªm Ä‘á»‘i thá»§</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {competitors.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.company}</span>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{c.segment}</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: TH_CLR[c.threat as 'High' | 'Medium' | 'Low'], background: `${TH_CLR[c.threat as 'High' | 'Medium' | 'Low']}15` }}>
                  {c.threat} Threat
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.lastActivity}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.date}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline">Chi tiáº¿t</button>
              <button className="btn btn-sm btn-outline">Ghi nháº­n</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// â”€â”€â”€ AI Extracted Data â”€â”€â”€

interface AiExtraction {
  id: string;
  companyName?: string;
  fieldName?: string;
  extractedValue?: string;
  confidenceScore?: number;
  sourceType?: string;
  extractedAt?: string;
  candidateId?: string;
  evidenceText?: string;
  pageNumber?: number;
  validationStatus?: string;
  reviewStatus?: string;
}

interface AiFieldResult {
  id?: string;
  fieldName?: string;
  value?: unknown;
  confidence?: number;
  evidenceText?: string;
  pageNumber?: number;
  validationStatus?: string;
  reviewStatus?: string;
}

const formatExtractedValue = (value: unknown): string => {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatExtractedValue).join(', ');
  return JSON.stringify(value);
};

export const AIExtractedData: React.FC = () => {
  const [extractions, setExtractions] = useState<AiExtraction[]>([]);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingToCandidate, setSubmittingToCandidate] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const IMPORT_JOB_ID = localStorage.getItem('apms-active-import-job');

  const fetchExtractions = () => {
    if (!IMPORT_JOB_ID) {
      setExtractions([]);
      setExtractionId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get<any>(`/import-jobs/${IMPORT_JOB_ID}/ai-extractions/latest`)
      .then((res) => {
        if (!res?.success || !res?.data) {
          setExtractions([]);
          setExtractionId(null);
          return;
        }

        const data = res.data;
        setExtractionId(data.id || null);

        let fields: AiExtraction[] = [];
        const createdAt = data.createdAt ? new Date(data.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const fieldResults = data.fieldResults && typeof data.fieldResults === 'object'
          ? Object.values(data.fieldResults as Record<string, AiFieldResult>)
          : [];

        if (fieldResults.length > 0) {
          fields = fieldResults.map((field, index) => ({
            id: field.id || field.fieldName || String(index),
            companyName: data.extractedData?.tradeName || data.extractedData?.legalName || 'Unassigned',
            fieldName: field.fieldName || `Field ${index + 1}`,
            extractedValue: formatExtractedValue(field.value),
            confidenceScore: typeof field.confidence === 'number' ? Math.round(field.confidence * 100) : 0,
            sourceType: 'AI',
            extractedAt: createdAt,
            evidenceText: field.evidenceText,
            pageNumber: field.pageNumber,
            validationStatus: field.validationStatus,
            reviewStatus: field.reviewStatus,
          }));
        } else if (data.extractedData) {
          const ext = data.extractedData;

          if (ext.tradeName) fields.push({ id: 'f1', companyName: ext.tradeName, fieldName: 'Trade name', extractedValue: ext.tradeName, confidenceScore: 90, sourceType: 'AI', extractedAt: createdAt });
          if (ext.businessModel) fields.push({ id: 'f2', companyName: ext.tradeName, fieldName: 'Business model', extractedValue: ext.businessModel, confidenceScore: 85, sourceType: 'AI', extractedAt: createdAt });
          if (ext.employeeTier) fields.push({ id: 'f3', companyName: ext.tradeName, fieldName: 'Scale', extractedValue: ext.employeeTier, confidenceScore: 80, sourceType: 'AI', extractedAt: createdAt });
          if (ext.website) fields.push({ id: 'f4', companyName: ext.tradeName, fieldName: 'Website', extractedValue: ext.website, confidenceScore: 95, sourceType: 'AI', extractedAt: createdAt });
          if (ext.relationshipSuggestion) fields.push({
            id: 'f5',
            companyName: ext.tradeName,
            fieldName: 'Suggested role',
            extractedValue: ext.relationshipSuggestion.suggestedType,
            confidenceScore: Math.round(ext.relationshipSuggestion.confidence * 100),
            sourceType: 'AI',
            extractedAt: createdAt,
          });
        } else {
          fields = (data.extractedFields || data.fields || []).map((f: any, idx: number) => ({
            id: String(f.id || idx),
            companyName: data.companyName || f.companyName || 'Unassigned',
            fieldName: f.fieldName || f.name || '--',
            extractedValue: f.extractedValue || f.value || '--',
            confidenceScore: f.confidenceScore ?? f.confidence ?? 0,
            sourceType: f.sourceType || data.sourceType || 'AI',
            extractedAt: f.extractedAt || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            candidateId: f.candidateId,
          }));
        }

        setExtractions(fields);
      })
      .catch((err) => {
        console.error(err);
        setExtractions([]);
        setExtractionId(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExtractions();
  }, []);

  const handleCreateCandidate = async () => {
    if (!extractionId) {
      alert('Extraction data is not ready yet.');
      return;
    }
    setSubmittingToCandidate('loading');
    try {
      await api.post(`/ai-extractions/${extractionId}/candidate`);
      setSubmittingToCandidate('done');
      alert('Candidate created successfully. Review it in Company Validation.');
    } catch (err: any) {
      console.error(err);
      setSubmittingToCandidate('error');
      alert(`Candidate creation failed: ${err.message}`);
    }
  };

  const highConfidence = extractions.filter((item) => (item.confidenceScore ?? 0) >= 80).length;
  const needReview = extractions.filter((item) => (item.confidenceScore ?? 0) < 75).length;
  const averageConfidence = extractions.length
    ? Math.round(extractions.reduce((sum, item) => sum + (item.confidenceScore ?? 0), 0) / extractions.length)
    : 0;
  const primaryCompany = extractions[0]?.companyName || 'No company selected';
  const latestSource = extractions[0]?.sourceType || 'AI';
  const latestAt = extractions[0]?.extractedAt || '--:--';

  const confidenceTone = (score: number) => (score >= 85 ? 'high' : score >= 70 ? 'mid' : 'low');

  return (
    <section className="workspace-page ai-extraction-page" id="page-ai-extracted-data" style={{ minHeight: '100dvh', paddingBottom: '80px' }}>
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Research <span>/</span> AI Extraction Queue</div>

          <div className="workspace-page-head">
            <div>
              <h1>AI Extraction Queue</h1>
              <p>Review the latest extracted fields before creating a candidate record.</p>
            </div>
            <div className="workspace-head-actions">
              <span className="workspace-inline-note" style={{ marginBottom: 0 }}>{loading ? 'Refreshing...' : `${extractions.length} fields ready`}</span>
              <button className="btn btn-outline" onClick={fetchExtractions}>Refresh</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateCandidate}
                disabled={!extractionId || submittingToCandidate === 'loading' || submittingToCandidate === 'done'}
              >
                {submittingToCandidate === 'loading' ? 'Creating...' : submittingToCandidate === 'done' ? 'Created' : 'Create candidate'}
              </button>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact ai-extraction-stats">
            <article className="workspace-stat-card">
              <span className="workspace-stat-label">Total fields</span>
              <strong>{extractions.length}</strong>
            </article>
            <article className="workspace-stat-card">
              <span className="workspace-stat-label">High confidence</span>
              <strong>{highConfidence}</strong>
            </article>
            <article className="workspace-stat-card">
              <span className="workspace-stat-label">Needs review</span>
              <strong>{needReview}</strong>
            </article>
          </div>

          <div className="workspace-panel ai-extraction-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Extraction list</h3>
                <p>{primaryCompany} - {latestSource} - {latestAt}</p>
              </div>
              <span className="workspace-badge info">{averageConfidence}% avg confidence</span>
            </div>

            {loading ? (
              <div className="workspace-empty">Loading extracted fields...</div>
            ) : extractions.length > 0 ? (
              <div className="ai-extraction-list">
                {extractions.map((item) => {
                  const score = item.confidenceScore ?? 0;
                  return (
                    <article key={item.id} className="ai-extraction-item">
                      <div className="ai-extraction-item-main">
                        <div className="ai-extraction-item-top">
                          <span className="workspace-badge neutral">{item.companyName || 'Unassigned'}</span>
                          <span className="ai-extraction-source">{item.sourceType || 'AI'} - {item.extractedAt || '--:--'}</span>
                          {item.candidateId && <span className="workspace-badge success">Candidate linked</span>}
                        </div>
                        <div className="ai-extraction-field">{item.fieldName || '--'}</div>
                        <div className="ai-extraction-value">{item.extractedValue || '--'}</div>
                        {(item.evidenceText || item.validationStatus || item.reviewStatus) && (
                          <div className="ai-extraction-evidence">
                            {item.evidenceText && <p>{item.evidenceText}</p>}
                            <small>
                              {item.pageNumber ? `Page ${item.pageNumber}` : 'Source page unavailable'}
                              {item.validationStatus ? ` · Validation: ${item.validationStatus}` : ''}
                              {item.reviewStatus ? ` · Review: ${item.reviewStatus}` : ''}
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="ai-extraction-confidence">
                        <div className={`ai-extraction-score ${confidenceTone(score)}`}>{score}%</div>
                        <div className="ai-extraction-meter" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                        </div>
                        <div className="ai-extraction-confidence-label">Confidence</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="workspace-empty ai-extraction-empty">
                No AI extraction data is available for the active import job.
              </div>
            )}
          </div>
        </div>

        <aside className="workspace-sidebar ai-extraction-sidebar">
          <div className="workspace-side-card ai-extraction-side-card">
            <span className="workspace-side-eyebrow">Queue status</span>
            <h3>Review before submission</h3>
            <p>Keep the queue clean, check low confidence values, then create the candidate record.</p>

            <div className="ai-extraction-metrics">
              <div>
                <strong>{extractions.length}</strong>
                <span>Fields</span>
              </div>
              <div>
                <strong>{averageConfidence}%</strong>
                <span>Average</span>
              </div>
              <div>
                <strong>{needReview}</strong>
                <span>Flagged</span>
              </div>
              <div>
                <strong>{loading ? 'Live' : extractionId ? 'Ready' : 'Idle'}</strong>
                <span>Status</span>
              </div>
            </div>

            <div className="workspace-detail-list">
              <div>
                <strong>Source</strong>
                <span>{latestSource}</span>
              </div>
              <div>
                <strong>Import job</strong>
                <span>{IMPORT_JOB_ID || 'Not set'}</span>
              </div>
            </div>

            <div className="workspace-head-actions ai-extraction-actions">
              <button className="btn btn-outline btn-sm" onClick={fetchExtractions}>Refresh</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCreateCandidate}
                disabled={!extractionId || submittingToCandidate === 'loading' || submittingToCandidate === 'done'}
              >
                {submittingToCandidate === 'loading' ? 'Creating...' : 'Create candidate'}
              </button>
            </div>

            <div className="workspace-ai-note">
              Fields under 75% should be verified manually before promotion.
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Processing notes</span>
            <ul className="workspace-bullet-list">
              <li>Use Refresh after the source document is reprocessed.</li>
              <li>Candidate creation sends the active extraction set forward.</li>
              <li>Keep an eye on low confidence website and model fields.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};

// --- Search Companies ---

interface CompanySearchItem {
  companyId: string;
  name: string;
  industry: string;
  city: string;
  employeeCount: string;
  reviewStatus: string;
}



const PAGE_SIZE_SEARCH = 10;

interface SearchCompaniesProps {
  setActivePage?: (page: string) => void;
}

export const SearchCompanies: React.FC<SearchCompaniesProps> = ({ setActivePage }) => {
  const [query, setQuery] = useState('');
  const [statusF, setStatusF] = useState('all');

  const [companies, setCompanies] = useState<CompanySearchItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Map backend CompanyProfile â†’ CompanySearchItem
  const mapProfile = (p: any): CompanySearchItem => ({
    companyId: p.companyId || p.id || String(Math.random()),
    name: p.identity?.tradeName || p.identity?.legalName || 'Doanh nghiá»‡p',
    industry: p.business?.industries?.join(', ') || 'ChÆ°a phĂ¢n loáº¡i',
    city: p.contact?.addresses?.[0]?.city || 'â€”',
    employeeCount: p.companySize?.employeeCount ? String(p.companySize.employeeCount) : 'â€”',
    reviewStatus: p.reviewStatus || 'UNVERIFIED',
  });

  const fetchCompanies = (page: number, search: string) => {
    setLoading(true);
    const endpoint = search.trim() ? '/profiles/search' : '/profiles';
    const params: Record<string, string | number | boolean> = { page, size: PAGE_SIZE_SEARCH };
    if (search.trim()) params.name = search.trim();

    api.get<any>(endpoint, { params })
      .then(res => {
        if (res?.success && res?.data) {
          const content: CompanySearchItem[] = (res.data.content || []).map(mapProfile);
          setCompanies(content);
          setTotalElements(res.data.totalElements || content.length);
          setTotalPages(res.data.totalPages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(0, ''); }, []);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchCompanies(0, query);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchCompanies(page, query);
  };

  const STATUS_CLR: Record<string, string> = { VERIFIED: '#10B981', PENDING: '#F59E0B', UNVERIFIED: '#64748B' };
  const STATUS_LBL: Record<string, string> = { VERIFIED: 'ÄĂ£ xĂ¡c thá»±c', PENDING: 'Chá» duyá»‡t', UNVERIFIED: 'ChÆ°a xĂ¡c thá»±c' };

  // Filter tráº¡ng thĂ¡i phĂ­a client (backend chÆ°a há»— trá»£ query param nĂ y)
  const displayList = statusF === 'all' ? companies : companies.filter(c => c.reviewStatus === statusF);

  const summary = [
    { label: 'Search results', value: totalElements, note: 'Profiles matched in the workspace' },
    { label: 'Verified', value: companies.filter((item) => item.reviewStatus === 'VERIFIED').length, note: 'Ready to reference immediately' },
    { label: 'Pending review', value: companies.filter((item) => item.reviewStatus === 'PENDING').length, note: 'Needs reviewer confirmation' },
  ];

  return (
    <section className="workspace-page" id="page-search-companies">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Company Profiles <span>/</span> Search Companies</div>
          <div className="workspace-page-head">
            <div>
              <h1>Search companies</h1>
              <p>Find existing company profiles before creating a new record or escalating research for review.</p>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {summary.map((item) => (
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
                className="search-input"
                placeholder="Company name... press Enter to search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={handleSearch}>Search</button>
              <select
                value={statusF}
                onChange={(event) => setStatusF(event.target.value)}
                className="search-input"
                style={{ minWidth: 180 }}
              >
                <option value="all">All statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending review</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Search results</h3>
                <p>{displayList.length} / {totalElements} records shown in the current filter.</p>
              </div>
            </div>

            <div className="workspace-table">
              <div className="workspace-table-row workspace-table-head">
                <span>Company</span>
                <span>Industry</span>
                <span>City</span>
                <span>Employees</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {displayList.map((company) => (
                <div key={company.companyId} className="workspace-table-row">
                  <div>
                    <strong>{company.name}</strong>
                    <small>{company.companyId}</small>
                  </div>
                  <span>{company.industry}</span>
                  <span>{company.city}</span>
                  <span>{company.employeeCount}</span>
                  <span className={`workspace-badge ${company.reviewStatus === 'VERIFIED' ? 'success' : company.reviewStatus === 'PENDING' ? 'info' : 'neutral'}`}>
                    {STATUS_LBL[company.reviewStatus] || company.reviewStatus}
                  </span>
                  <button
                    className="workspace-icon-btn"
                    onClick={() => {
                      localStorage.setItem('apms-selected-company', company.companyId);
                      setActivePage?.('company-detail');
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
              {displayList.length === 0 && !loading && (
                <div className="workspace-empty">No matching company profiles found.</div>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="workspace-pagination">
              <span>Page {currentPage + 1} / {totalPages}</span>
              <div>
                <button className="workspace-page-btn" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map((page) => (
                  <button key={page} className={`workspace-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>
                    {page + 1}
                  </button>
                ))}
                <button className="workspace-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => goToPage(currentPage + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Search guidance</span>
            <ul className="workspace-bullet-list">
              <li>Search first before creating a new company profile to avoid duplicates.</li>
              <li>Prefer verified records when preparing material for review.</li>
              <li>Open the detail page to confirm city, size, and relationship context.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Quick filters</span>
            <div className="workspace-filter-chips">
              <button className="workspace-chip">Technology</button>
              <button className="workspace-chip">Finance</button>
              <button className="workspace-chip">Manufacturing</button>
              <button className="workspace-chip">Verified only</button>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Status</span>
            <div className="workspace-ai-note">
              <strong>{loading ? 'Searching workspace' : 'Search ready'}</strong>
              <p>{loading ? 'Loading company profiles from the profile index.' : `${totalElements} records available for staff lookup.`}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

// â”€â”€â”€ AI Training Mode â”€â”€â”€

export const AITrainingMode: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/training/sessions').catch(() => null),
      api.get<any>('/training/questions').catch(() => null),
    ]).then(([sessRes, qRes]) => {
      if (sessRes?.success && Array.isArray(sessRes.data)) setSessions(sessRes.data);
      if (qRes?.success && Array.isArray(qRes.data)) setQuestions(qRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const answeredCount = Object.keys(answers).length;
  const completionRate = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const progressPercent = questions.length
    ? Math.round((((submitted ? questions.length : current + 1) / questions.length) * 100))
    : 0;
  const averageScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum: number, item: any) => sum + (item.score || 0), 0) / sessions.length)
    : null;
  const bestScore = sessions.length > 0 ? Math.max(...sessions.map((item: any) => item.score || 0)) : null;
  const latestSession = sessions[0] || null;
  const currentQuestion = questions[current];
  const currentOptions = currentQuestion?.options || [];
  const strongAreas = [
    'Source credibility checks',
    'Research contradiction handling',
    'AI-assisted validation judgement',
  ];
  const nextAction = submitted
    ? score === questions.length
      ? 'Move to a fresh assessment set or review advanced cases.'
      : 'Review incorrect answers, then rerun the assessment to close the gap.'
    : started
      ? 'Finish the current assessment before switching back to history.'
      : questions.length === 0
        ? 'Add or sync a question set so staff can start practicing.'
        : 'Start a new assessment and complete the full question set in one pass.';

  const summary = [
    { label: 'Completed sessions', value: sessions.length || 0, note: 'Training sessions finished' },
    { label: 'Average score', value: averageScore !== null ? `${averageScore}%` : '—', note: 'Current learning performance' },
    { label: 'Best result', value: bestScore !== null ? `${bestScore}%` : '—', note: 'Highest score achieved' },
    { label: 'Coverage', value: `${questions.length} prompts`, note: 'Questions in the active training set' },
  ];

  const startAssessment = () => {
    setStarted(true);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <section className="workspace-page" id="page-ai-training-mode">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Development <span>/</span> Training Mode</div>
          <div className="workspace-page-head">
            <div>
              <h1>Training mode</h1>
              <p>Calibrate research judgement, source validation, and AI-assisted review decisions through short assessment runs.</p>
            </div>
            {!loading && !started && (
              <div className="workspace-head-actions">
                <span className="workspace-inline-note training-inline-note">{questions.length} questions ready</span>
                <button className="btn btn-primary" disabled={questions.length === 0} onClick={startAssessment}>
                  {questions.length === 0 ? 'Question set unavailable' : 'Start assessment'}
                </button>
              </div>
            )}
          </div>

          <div className="workspace-panel training-hero-panel">
            <div className="training-hero">
              <div className="training-hero-copy">
                <span className={`workspace-chip ${started ? '' : 'training-chip-neutral'}`}>
                  {loading ? 'Syncing training set' : submitted ? 'Assessment submitted' : started ? 'Assessment in progress' : 'Senior research staff practice'}
                </span>
                <h2>Build repeatable review judgement before live profile decisions.</h2>
                <p>
                  {loading
                    ? 'Loading sessions and question prompts from the training workspace.'
                    : nextAction}
                </p>
              </div>
              <div className="training-hero-metrics">
                <article>
                  <strong>{loading ? '...' : sessions.length}</strong>
                  <span>Session log</span>
                </article>
                <article>
                  <strong>{loading ? '...' : averageScore !== null ? `${averageScore}%` : '—'}</strong>
                  <span>Average score</span>
                </article>
                <article>
                  <strong>{loading ? '...' : started ? `${completionRate}%` : `${questions.length}`}</strong>
                  <span>{started ? 'Current completion' : 'Questions ready'}</span>
                </article>
              </div>
            </div>
          </div>

          {loading ? (
            <>
              <div className="workspace-stats workspace-stats-compact">
                {Array.from({ length: 4 }).map((_, index) => (
                  <article key={index} className="workspace-stat-card training-skeleton-card">
                    <span className="training-skeleton training-skeleton-line short" />
                    <span className="training-skeleton training-skeleton-line large" />
                    <span className="training-skeleton training-skeleton-line medium" />
                  </article>
                ))}
              </div>

              <div className="training-loading-grid">
                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Loading history</h3>
                      <p>Fetching completed sessions and score patterns.</p>
                    </div>
                  </div>
                  <div className="training-skeleton-stack">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="training-skeleton-block" />
                    ))}
                  </div>
                </div>

                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Preparing current set</h3>
                      <p>Loading prompt readiness and assessment metadata.</p>
                    </div>
                  </div>
                  <div className="training-skeleton-stack">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="training-skeleton-block compact" />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : !started ? (
            <>
              <div className="workspace-stats workspace-stats-compact">
                {summary.map((item) => (
                  <article key={item.label} className="workspace-stat-card">
                    <span className="workspace-stat-label">{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>

              <div className="training-content-grid">
                <div className="workspace-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Training history</h3>
                      <p>Recent learning sessions completed by the current staff profile.</p>
                    </div>
                    <span className="workspace-badge neutral">{sessions.length} logged</span>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="training-empty-state">
                      <strong>No training sessions completed yet.</strong>
                      <p>Start the first assessment to create a score history for this staff profile.</p>
                    </div>
                  ) : (
                    <div className="training-history-list">
                      {sessions.map((session: any, index: number) => (
                        <article key={session.id || index} className="training-history-card">
                          <div>
                            <strong>{session.topic || session.title || `Assessment ${index + 1}`}</strong>
                            <p>{session.date || 'Date pending'} {session.time ? `at ${session.time}` : ''}</p>
                          </div>
                          <div className="training-history-meta">
                            <span className={`workspace-badge ${(session.score || 0) >= 85 ? 'success' : (session.score || 0) >= 70 ? 'info' : 'danger'}`}>
                              {session.score || 0}%
                            </span>
                            <small>{(session.score || 0) >= 85 ? 'Strong judgement' : (session.score || 0) >= 70 ? 'Stable accuracy' : 'Needs review'}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="workspace-panel training-readiness-panel">
                  <div className="workspace-section-head">
                    <div>
                      <h3>Assessment readiness</h3>
                      <p>Current training set status and recommended practice focus.</p>
                    </div>
                  </div>
                  <div className="training-readiness-grid">
                    <div className="workspace-ai-note">
                      <strong>Latest result</strong>
                      <p>
                        {latestSession
                          ? `${latestSession.topic || latestSession.title || 'Last session'} ended with ${latestSession.score || 0}% score.`
                          : 'No prior result available. The next assessment will establish a baseline.'}
                      </p>
                    </div>
                    <div className="workspace-detail-list">
                      <div><strong>Questions ready</strong><span>{questions.length}</span></div>
                      <div><strong>Current status</strong><span>{questions.length ? 'Ready to start' : 'Waiting for content'}</span></div>
                      <div><strong>Recommended rhythm</strong><span>1 focused pass</span></div>
                    </div>
                    <div className="training-pill-list">
                      {strongAreas.map((item) => (
                        <span key={item} className="training-pill">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="workspace-footer-actions training-footer-actions">
                <span>{questions.length} questions available in the current training set.</span>
                <div>
                  <button className="btn btn-primary" disabled={questions.length === 0} onClick={startAssessment}>
                    {questions.length === 0 ? 'No questions available' : 'Start new assessment'}
                  </button>
                </div>
              </div>
            </>
          ) : submitted ? (
            <div className="workspace-panel training-result-panel">
              <div className="training-score">{score}/{questions.length}</div>
              <span className={`workspace-badge ${score === questions.length ? 'success' : score >= Math.ceil(questions.length * 0.7) ? 'info' : 'danger'}`}>
                {Math.round((score / (questions.length || 1)) * 100)}% accuracy
              </span>
              <h3>{score === questions.length ? 'Excellent result' : score > 0 ? 'Good progress' : 'Needs more practice'}</h3>
              <p>{nextAction}</p>

              <div className="training-result-grid">
                <article>
                  <strong>{questions.length - score}</strong>
                  <span>Answers to review</span>
                </article>
                <article>
                  <strong>{bestScore !== null ? `${Math.max(bestScore, Math.round((score / (questions.length || 1)) * 100))}%` : `${Math.round((score / (questions.length || 1)) * 100)}%`}</strong>
                  <span>Best recorded result</span>
                </article>
                <article>
                  <strong>{sessions.length + 1}</strong>
                  <span>Total attempts including this run</span>
                </article>
              </div>

              <div className="workspace-head-actions training-result-actions">
                <button className="btn btn-outline" onClick={() => { setSubmitted(false); setCurrent(0); setAnswers({}); }}>
                  Retry same set
                </button>
                <button className="btn btn-primary" onClick={() => setStarted(false)}>
                  Back to history
                </button>
              </div>
            </div>
          ) : (
            <div className="workspace-panel training-quiz-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Assessment in progress</h3>
                  <p>Question {current + 1} of {questions.length}</p>
                </div>
                <span className="workspace-badge info">{answeredCount}/{questions.length} answered</span>
              </div>

              <div className="training-progress-header">
                <div className="workspace-progress">
                  <div className="workspace-progress-bar">
                    <div style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="workspace-progress-meta">
                    <span>{progressPercent}% through the assessment</span>
                    <span>{questions.length - answeredCount} unanswered</span>
                  </div>
                </div>
                <div className="training-progress-card">
                  <strong>{current + 1}</strong>
                  <span>Current prompt</span>
                </div>
              </div>

              <div className="training-question-card">
                <div className="training-question-meta">
                  <span className="workspace-chip training-chip-neutral">Scenario review</span>
                  <span>Choose the strongest next action based on source quality and research judgement.</span>
                </div>
                <h4>{currentQuestion?.q || currentQuestion?.question}</h4>
                <div className="training-option-list">
                  {currentOptions.map((option: string, index: number) => (
                    <button
                      key={index}
                      className={`training-option ${answers[current] === index ? 'selected' : ''}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [current]: index }))}
                    >
                      <span className="training-option-index">{String.fromCharCode(65 + index)}</span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="workspace-head-actions">
                <button className="btn btn-outline" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>
                  Previous
                </button>
                {current < questions.length - 1 ? (
                  <button className="btn btn-primary" disabled={answers[current] === undefined} onClick={() => setCurrent((value) => value + 1)}>
                    Next
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled={answers[current] === undefined} onClick={() => setSubmitted(true)}>
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">{started && !submitted ? 'Question navigator' : 'How to use'}</span>
            {started && !submitted ? (
              <div className="training-question-nav">
                {questions.map((_: any, index: number) => (
                  <button
                    key={index}
                    className={`training-question-dot ${index === current ? 'active' : ''} ${answers[index] !== undefined ? 'answered' : ''}`}
                    onClick={() => setCurrent(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : (
              <ul className="workspace-bullet-list">
                <li>Use training mode to calibrate how staff reads AI suggestions and source quality.</li>
                <li>Focus on pattern recognition before speed; correctness matters more than completion time.</li>
                <li>Re-run the assessment after reviewing mistakes or uncertain decisions.</li>
              </ul>
            )}
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Current set</span>
            <div className="workspace-detail-list">
              <div><strong>Questions</strong><span>{questions.length}</span></div>
              <div><strong>Status</strong><span>{loading ? 'Loading' : started ? 'In progress' : 'Ready'}</span></div>
              <div><strong>Sessions logged</strong><span>{sessions.length}</span></div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Focus areas</span>
            <div className="workspace-activity-list">
              <article>
                <strong>Source validation</strong>
                <p>Cross-check the origin, timeliness, and authority behind each answer choice.</p>
              </article>
              <article>
                <strong>Decision quality</strong>
                <p>Choose the option that protects downstream review quality, not the fastest shortcut.</p>
              </article>
              <article>
                <strong>AI oversight</strong>
                <p>Treat AI suggestions as drafts that still need human verification.</p>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

// â”€â”€â”€ Learning Center â”€â”€â”€
const LEVEL_CLR: Record<string, string> = { Beginner: '#10B981', Intermediate: '#F59E0B', Advanced: '#EF4444' };

export const LearningCenter: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/learning/courses')
      .then(res => {
        if (res?.success && Array.isArray(res.data)) setCourses(res.data);
        else if (res?.success && res.data?.content) setCourses(res.data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = [
    { label: 'Courses', value: courses.length, note: 'Available learning modules' },
    { label: 'Completed', value: courses.filter((course) => course.progress === 100).length, note: 'Finished by the current staff profile' },
    { label: 'In progress', value: courses.filter((course) => course.progress > 0 && course.progress < 100).length, note: 'Modules currently being studied' },
  ];

  return (
    <section className="workspace-page" id="page-learning-center">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Development <span>/</span> Learning Center</div>
          <div className="workspace-page-head">
            <div>
              <h1>Learning center</h1>
              <p>Browse internal learning modules to improve research quality, verification judgment, and AI-assisted workflow skills.</p>
            </div>
            <div className="workspace-head-actions">
              <span className="workspace-inline-note">{courses.filter((course) => course.progress === 100).length}/{courses.length} completed</span>
            </div>
          </div>

          {loading && <div className="workspace-inline-note">Loading learning modules...</div>}

          <div className="workspace-stats workspace-stats-compact">
            {summary.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          {!loading && courses.length === 0 ? (
            <div className="workspace-panel">
              <div className="workspace-empty">No learning modules are available right now.</div>
            </div>
          ) : (
            <div className="learning-card-grid">
              {courses.map((course: any) => (
                <article key={course.id} className="learning-card">
                  <div className="learning-card-head">
                    <span className="workspace-badge neutral" style={{ color: LEVEL_CLR[course.level] || '#64748B' }}>
                      {course.level}
                    </span>
                    {course.progress === 100 && <span className="workspace-badge success">Completed</span>}
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.lessons} lessons â€¢ {course.duration}</p>
                  <div className="workspace-progress">
                    <div className="workspace-progress-bar compact">
                      <div style={{ width: `${course.progress || 0}%`, background: course.progress === 100 ? '#10B981' : '#2563EB' }} />
                    </div>
                    <span>{course.progress || 0}%</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    {!course.progress ? 'Start' : course.progress === 100 ? 'Review' : 'Continue'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Learning focus</span>
            <ul className="workspace-bullet-list">
              <li>Prioritize modules that improve source validation and profile intake quality.</li>
              <li>Pair learning content with Training Mode to reinforce correct review behavior.</li>
              <li>Revisit completed modules when a new workflow or reviewer standard is introduced.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Recommended next</span>
            <div className="workspace-activity-list">
              {courses.slice(0, 3).map((course: any) => (
                <article key={`rec-${course.id}`}>
                  <strong>{course.title}</strong>
                  <p>{course.progress || 0}% progress</p>
                </article>
              ))}
              {!loading && courses.length === 0 && <div className="workspace-empty">No recommendations available.</div>}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};



