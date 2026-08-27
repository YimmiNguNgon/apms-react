import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { projectApi } from '../API/projectApi';
import type {
  ProjectResponse,
  UpdateProjectRequest,
  ProjectType,
  ProfileResponse,
  KeyResultReferenceResponse,
  RelationshipType,
} from '../types/domain';

type EditProjectModalProps = {
  project: ProjectResponse;
  onClose: () => void;
  onSuccess: (updatedProject: ProjectResponse) => void;
};

const RELATIONSHIP_OPTIONS = [
  { value: 'PARTNER_WITH', label: 'Partner' },
  { value: 'COMPETITOR_OF', label: 'Competitor' },
  { value: 'SUPPLIER_OF', label: 'Supplier' },
  { value: 'CUSTOMER_OF', label: 'Customer' },
  { value: 'POTENTIAL_PARTNER_OF', label: 'Potential partner' },
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSuccess }) => {
  const { t } = useTranslation('projects-overview');
  
  // Deduplicate initial key results defensively
  const deduplicatedKRs = Object.values(
    (project.keyResults || []).reduce((acc, kr) => {
      acc[kr.type] = kr; // Later ones overwrite earlier ones
      return acc;
    }, {} as Record<string, { type: string; weight: number }>)
  );

  const [projectForm, setProjectForm] = useState({
    projectName: project.projectName || '',
    targetCompanyName: project.targetCompanyName || '',
    targetCompanyTaxCode: project.targetCompanyTaxCode || '',
    targetRelationshipType: project.targetRelationshipType || '',
    description: project.description || '',
    objective: project.objective || '',
    plannedEndDate: project.plannedEndDate || '',
    keyResults: deduplicatedKRs,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [krOptions, setKrOptions] = useState<KeyResultReferenceResponse[]>([]);
  const [krLoading, setKrLoading] = useState(true);

  useEffect(() => {
    projectApi.getKeyResultReference()
      .then(res => setKrOptions(res.data))
      .catch(console.error)
      .finally(() => setKrLoading(false));
  }, []);

  const totalWeight = projectForm.keyResults.reduce((sum, kr) => sum + (kr.weight || 0), 0);
  const is100 = totalWeight === 100;
  const isOver = totalWeight > 100;

  const isFormValid =
    totalWeight === 100 &&
    projectForm.keyResults.length > 0 &&
    projectForm.keyResults.every(kr => kr.weight > 0) &&
    projectForm.projectName.trim() !== '' &&
    projectForm.targetCompanyName.trim() !== '' &&
    projectForm.targetRelationshipType !== '';

  const handleSubmit = async () => {
    if (!isFormValid) return;
    try {
      setLoading(true);
      setError(null);
      
      const payload: UpdateProjectRequest = {
        projectName: projectForm.projectName,
        targetCompanyName: projectForm.targetCompanyName,
        targetCompanyTaxCode: projectForm.targetCompanyTaxCode,
        targetRelationshipType: projectForm.targetRelationshipType as any,
        description: projectForm.description,
        objective: projectForm.objective,
        plannedEndDate: projectForm.plannedEndDate,
        keyResults: projectForm.keyResults,
      };

      const updated = await projectApi.updateProject(project.id, payload);
      onSuccess(updated.data);
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay project-modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal project-create-modal" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="project-modal-head" style={{ flexShrink: 0 }}>
          <div>
            <span className="workspace-side-eyebrow">EDIT PROJECT</span>
            <h3>Update Draft Project</h3>
            <p>Update the project objective, target company, and key results.</p>
          </div>
          <button className="project-modal-close" onClick={() => !loading && onClose()}><X size={20} /></button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {error && <div className="workspace-inline-error" style={{ marginTop: '16px' }}>{error}</div>}
          
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT INFORMATION</h4>
            <div className="workspace-form-grid">
              <label>
                <span>Project Name</span>
                <input className="search-input" value={projectForm.projectName} onChange={e => setProjectForm(prev => ({ ...prev, projectName: e.target.value }))} />
              </label>
              <label>
                <span>Target Company Name</span>
                <input className="search-input" value={projectForm.targetCompanyName} onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyName: e.target.value }))} />
              </label>
              <label>
                <span>Tax Code</span>
                <input className="search-input" value={projectForm.targetCompanyTaxCode} onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyTaxCode: e.target.value.replace(/[^0-9-]/g, '') }))} />
              </label>
              <label>
                <span>Relationship</span>
                <select className="search-input" value={projectForm.targetRelationshipType} onChange={e => {
                  const newRelationship = e.target.value as RelationshipType;
                  setProjectForm(prev => {
                    const validKrs = prev.keyResults.filter(selectedKr => {
                      const krDef = krOptions.find(opt => opt.type === selectedKr.type);
                      if (!krDef) return true;
                      return krDef.supportedRelationshipTypes.length === 0 || krDef.supportedRelationshipTypes.includes(newRelationship);
                    });
                    return {
                      ...prev,
                      targetRelationshipType: newRelationship,
                      keyResults: validKrs
                    };
                  });
                }}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>
                <span>Planned End Date</span>
                <input className="search-input" type="date" value={projectForm.plannedEndDate} onChange={e => setProjectForm(prev => ({ ...prev, plannedEndDate: e.target.value }))} />
              </label>
            </div>
          </div>
          
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OBJECTIVE & NOTES</h4>
            <div className="workspace-form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Objective</span>
                <textarea className="search-input" style={{ minHeight: '80px', resize: 'vertical' }} value={projectForm.objective} onChange={e => setProjectForm(prev => ({ ...prev, objective: e.target.value }))} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Additional Notes</span>
                <textarea className="search-input" style={{ minHeight: '80px', resize: 'vertical' }} value={projectForm.description} onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))} />
              </label>
            </div>
          </div>

          <div style={{ marginTop: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KEY RESULTS</h4>
              <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                <div style={{ fontWeight: '600', color: is100 ? 'var(--success-text)' : isOver ? 'var(--danger-text)' : 'inherit' }}>
                  Total Weight {totalWeight} / 100
                </div>
                {!is100 && !isOver && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {100 - totalWeight}% remaining
                  </div>
                )}
                {isOver && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)' }}>
                    Exceeds 100%
                  </div>
                )}
              </div>
            </div>
            
            {krLoading ? (
              <div>Loading Key Results...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {krOptions.map((kr) => {
                  const isSupported = kr.supportedRelationshipTypes.length === 0 || kr.supportedRelationshipTypes.includes(projectForm.targetRelationshipType as RelationshipType);
                  const selectedKr = projectForm.keyResults.find((k) => k.type === kr.type);
                  // Ensure if it's not supported, it's not selected. But defensively we still rely on checking isSelected for render.
                  // If Relationship changes and makes it unsupported, we should unselect it.
                  // The user can't select it, but we also proactively ignore its weight in total if it's disabled. 
                  // Wait, actually `ProjectManagement` doesn't auto-unselect on relationship change immediately, it just makes it disabled.
                  // Let's mirror `ProjectManagement` logic exactly.
                  const isSelected = !!selectedKr && isSupported; 
                  
                  const supportedLabels = kr.supportedRelationshipTypes.map(rt => RELATIONSHIP_OPTIONS.find(o => o.value === rt)?.label || rt).join(', ');

                  return (
                    <div
                      key={kr.type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        borderRadius: '8px',
                        border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                        opacity: isSupported ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`kr-checkbox-${kr.type}`}
                        checked={isSelected}
                        disabled={!isSupported}
                        onChange={(e) => {
                          if (!isSupported) return;
                          const checked = e.target.checked;
                          setProjectForm((current) => {
                            const existing = current.keyResults.filter((k) => k.type !== kr.type);
                            if (checked) {
                              return { ...current, keyResults: [...existing, { type: kr.type, weight: 10 }] };
                            } else {
                              return { ...current, keyResults: existing };
                            }
                          });
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: isSupported ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          margin: 0
                        }}
                      />
                      <label htmlFor={`kr-checkbox-${kr.type}`} style={{ flex: 1, cursor: isSupported ? 'pointer' : 'not-allowed', margin: 0, display: 'block' }}>
                        <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary-dark)' : 'inherit' }}>{kr.displayName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{kr.description}</div>
                        {!isSupported && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginTop: '8px' }}>
                            Available only for {supportedLabels} projects.
                          </div>
                        )}
                      </label>
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <input
                            type="number"
                            className="search-input"
                            style={{ width: '80px', padding: '6px 10px', textAlign: 'center' }}
                            value={selectedKr?.weight || ''}
                            min={1}
                            max={100}
                            onChange={(e) => {
                              const newWeight = parseInt(e.target.value, 10) || 0;
                              setProjectForm((current) => ({
                                ...current,
                                keyResults: current.keyResults.map((k) => (k.type === kr.type ? { ...k, weight: newWeight } : k)),
                              }));
                            }}
                          />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="project-modal-foot" style={{ flexShrink: 0, padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => onClose()} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !isFormValid}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};
