import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { PageResult, ProjectResponse } from '../types/domain';

export const AddCompany: React.FC = () => {
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    website: '',
    phone: '',
    address: '',
    relation: 'Partner',
    assignee: 'Ha Duc Huy',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProject = async () => {
      setProjectLoading(true);
      setProjectError(null);

      try {
        const res = await api.get<PageResult<ProjectResponse>>('/projects', {
          params: { page: 0, size: 100 },
          signal: controller.signal,
        });

        const projects = res?.data?.content ?? [];
        const stored = localStorage.getItem('apms-active-project');
        const validProject = projects.find((project) => String(project.id) === stored) ?? projects[0] ?? null;

        if (!validProject) {
          setProjectId(null);
          setProjectError('Chua co du an hop le cho luong nhap ho so thu cong.');
          return;
        }

        const nextProjectId = String(validProject.id);
        localStorage.setItem('apms-active-project', nextProjectId);
        setProjectId(nextProjectId);
      } catch (err) {
        if (!controller.signal.aborted) {
          setProjectId(null);
          setProjectError(err instanceof Error ? err.message : 'Khong the tai du an hien tai.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setProjectLoading(false);
        }
      }
    };

    void loadProject();
    return () => controller.abort();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRelationChange = (value: string) => {
    setFormData((current) => ({ ...current, relation: value }));
  };

  const handleSubmit = async () => {
    if (!projectId) {
      setStatus('error');
      return;
    }

    if (!formData.legalName) {
      window.alert('Vui long nhap ten phap ly.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    const inputText = `
Ten phap ly: ${formData.legalName}
Ten thuong mai: ${formData.tradeName}
Website: ${formData.website}
So dien thoai: ${formData.phone}
Dia chi: ${formData.address}
Loai quan he: ${formData.relation}
Nguoi phu trach: ${formData.assignee}
Ghi chu them: ${formData.notes}
    `.trim();

    try {
      await api.post(`/projects/${projectId}/documents/manual`, {
        inputText,
        companyNameHint: formData.legalName,
      });

      setStatus('success');
      setFormData({
        legalName: '',
        tradeName: '',
        website: '',
        phone: '',
        address: '',
        relation: 'Partner',
        assignee: 'Ha Duc Huy',
        notes: '',
      });
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const relationOptions = [
    { value: 'Partner', label: 'Partner', note: 'Co kha nang hop tac chien luoc.' },
    { value: 'Competitor', label: 'Competitor', note: 'Can theo doi de tranh xung dot thi truong.' },
    { value: 'Potential', label: 'Potential', note: 'Moi trong giai doan outreach va xac minh.' },
    { value: 'Other', label: 'Other', note: 'Luu tam de bo sung danh gia sau.' },
  ];

  return (
    <section className="workspace-page" id="page-add-company">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Company Profiles <span>/</span> Manual Entry <span>/</span> New Record</div>
          <div className="workspace-page-head">
            <div>
              <h1>Create company profile</h1>
              <p>Staff manually captures a new business record before AI enrichment and review.</p>
            </div>
            <div className="workspace-head-actions">
              <span className="workspace-inline-note">Project sync: {projectLoading ? 'loading' : projectId ? `ready #${projectId}` : 'missing'}</span>
            </div>
          </div>

          {projectError && <div className="workspace-inline-error">{projectError}</div>}

          <div className="workspace-stepper">
            <div className="workspace-step active"><strong>1</strong><span>Basic info</span></div>
            <div className="workspace-step"><strong>2</strong><span>Capabilities</span></div>
            <div className="workspace-step"><strong>3</strong><span>Relationship</span></div>
            <div className="workspace-step"><strong>4</strong><span>Confirm</span></div>
          </div>

          <div className="workspace-panel workspace-form-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Automatic lookup</h3>
                <p>Use tax code or upload documents first to prefill entity data before manual entry.</p>
              </div>
            </div>

            <div className="workspace-addcompany-lookup">
              <input className="search-input" placeholder="Nhap ma so thue (MST)..." />
              <button className="btn btn-primary">Tra cuu tu dong</button>
            </div>

            <div className="workspace-addcompany-upload">
              <div className="workspace-upload-icon">+</div>
              <div>
                <strong>Upload capability documents</strong>
                <p>Drag and drop PDF, DOCX, PPT, or Excel files up to 50MB.</p>
              </div>
              <button className="btn btn-outline">Choose file</button>
            </div>
          </div>

          <div className="workspace-panel workspace-form-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Business identity</h3>
                <p>Minimum fields required for staff intake before routing to the next review stage.</p>
              </div>
            </div>

            <div className="workspace-form-grid">
              <label>
                <span>Legal name *</span>
                <input
                  type="text"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  className="search-input"
                  placeholder="Full registered entity name"
                />
              </label>
              <label>
                <span>Trade name</span>
                <input
                  type="text"
                  name="tradeName"
                  value={formData.tradeName}
                  onChange={handleChange}
                  className="search-input"
                  placeholder="Commercial brand name"
                />
              </label>
              <label>
                <span>Website</span>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="search-input"
                  placeholder="https://"
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="search-input"
                  placeholder="+84..."
                />
              </label>
              <label className="workspace-form-span">
                <span>Head office address</span>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="search-input"
                  placeholder="Registered office address"
                />
              </label>
            </div>
          </div>

          <div className="workspace-panel workspace-form-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Assignment and notes</h3>
                <p>Declare who owns the record and what context the reviewer should know.</p>
              </div>
            </div>

            <div className="workspace-form-grid">
              <label>
                <span>Assignee</span>
                <select name="assignee" value={formData.assignee} onChange={handleChange} className="search-input">
                  <option>Ha Duc Huy</option>
                  <option>Tran Minh</option>
                  <option>Nguyen An</option>
                </select>
              </label>
              <label className="workspace-form-span">
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="search-input"
                  rows={4}
                  placeholder="Add context about source, business scope, or follow-up concerns..."
                />
              </label>
            </div>
          </div>

          {status === 'success' && (
            <div className="workspace-inline-note">Company profile created successfully. The record is now ready for AI processing.</div>
          )}
          {status === 'error' && (
            <div className="workspace-inline-error">There was an error while creating the company profile.</div>
          )}

          <div className="workspace-footer-actions">
            <span>Manual intake for staff role. Reviewers will enrich and validate this record later.</span>
            <div>
              <button className="btn btn-outline">Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || projectLoading || !projectId}>
                {loading ? 'Submitting...' : 'Submit profile'}
              </button>
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Relationship type</span>
            <div className="workspace-relation-grid">
              {relationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`workspace-relation-card ${formData.relation === option.value ? 'active' : ''}`}
                  onClick={() => handleRelationChange(option.value)}
                >
                  <strong>{option.label}</strong>
                  <p>{option.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Staff checklist</span>
            <ul className="workspace-bullet-list">
              <li>Verify legal name exactly as it appears on the source document.</li>
              <li>Capture at least one website or phone touchpoint if available.</li>
              <li>Use notes to explain uncertainty before sending to review.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Next stage</span>
            <div className="workspace-ai-note">
              <strong>After submission</strong>
              <p>The manual record will be attached to the active project and handed over for AI enrichment and validation.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
