import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { projectApi } from '../API/projectApi';
import { balanceDeliverableWeights } from '../utils/deliverableUtils';
import type {
  ProjectResponse,
  UpdateProjectRequest,
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
      acc[kr.type] = { type: kr.type, weight: kr.weight };
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

  const handleBalanceEqually = () => {
    setProjectForm(prev => ({
      ...prev,
      keyResults: balanceDeliverableWeights(prev.keyResults),
    }));
  };

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
            <p>Update the project goal, target company, and deliverables.</p>
          </div>
          <button className="project-modal-close" onClick={() => !loading && onClose()}><X size={20} /></button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {error && <div className="workspace-inline-error" style={{ marginTop: '16px' }}>{error}</div>}
          
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT INFORMATION</h4>
            <div className="workspace-form-grid" style={{ marginBottom: 0 }}>
              <label>
                <span>Project Name</span>
                <input className="search-input" value={projectForm.projectName} onChange={e => setProjectForm(prev => ({ ...prev, projectName: e.target.value }))} />
              </label>
              <label>
                <span>Project Type</span>
                <input
                  className="search-input"
                  value={project.projectType === 'RESEARCH_NEW_COMPANY' ? 'New company research' : 'Existing company update'}
                  readOnly
                  style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' }}
                />
              </label>
              <label>
                <span>Target Company</span>
                <input className="search-input" value={projectForm.targetCompanyName} onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyName: e.target.value }))} />
              </label>
              <label>
                <span>Target Relationship</span>
                <select className="search-input" value={projectForm.targetRelationshipType} onChange={e => {
                  const newRelationship = e.target.value as RelationshipType;
                  setProjectForm(prev => {
                    const validKrs = prev.keyResults.filter(selectedKr => {
                      const krDef = krOptions.find(opt => opt.type === selectedKr.type);
                      if (!krDef) return true;
                      return krDef.supportedRelationshipTypes.length === 0 || krDef.supportedRelationshipTypes.includes(newRelationship);
                    });
                    const rebalancedKrs = validKrs.length !== prev.keyResults.length ? balanceDeliverableWeights(validKrs) : validKrs;
                    return {
                      ...prev,
                      targetRelationshipType: newRelationship,
                      keyResults: rebalancedKrs,
                    };
                  });
                }}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>
                <span>Tax Code</span>
                <input className="search-input" value={projectForm.targetCompanyTaxCode} onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyTaxCode: e.target.value.replace(/[^0-9-]/g, '') }))} />
              </label>
              <label>
                <span>Due Date</span>
                <input className="search-input" type="date" value={projectForm.plannedEndDate} onChange={e => setProjectForm(prev => ({ ...prev, plannedEndDate: e.target.value }))} />
              </label>
            </div>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT GOAL & NOTES</h4>
            <div className="workspace-form-grid" style={{ marginBottom: 0 }}>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Project Goal</span>
                <textarea className="search-input" style={{ minHeight: '60px', padding: '10px 12px', resize: 'vertical' }} value={projectForm.objective} onChange={e => setProjectForm(prev => ({ ...prev, objective: e.target.value }))} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Additional Notes (Optional)</span>
                <textarea className="search-input" style={{ minHeight: '50px', padding: '10px 12px', resize: 'vertical' }} value={projectForm.description} onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))} />
              </label>
            </div>
          </div>

          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT DELIVERABLES</h4>
              </div>
              <div style={{ fontSize: '0.88rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <div style={{ fontWeight: '700', color: is100 ? 'var(--success-text)' : isOver ? 'var(--danger-text)' : '#b45309' }}>
                    Total Progress Weight: {totalWeight} / 100
                  </div>
                  {projectForm.keyResults.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBalanceEqually}
                      style={{
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 7px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        cursor: 'pointer',
                        lineHeight: 1.2
                      }}
                      title="Distribute 100% weight equally across selected deliverables"
                    >
                      Balance equally
                    </button>
                  )}
                </div>
                {!is100 && !isOver && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {100 - totalWeight}% remaining
                  </div>
                )}
                {isOver && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginTop: '2px' }}>
                    Exceeds 100%
                  </div>
                )}
              </div>
            </div>
            
            {krLoading ? (
              <div>Loading Project Deliverables...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {krOptions.map((kr) => {
                  const isSupported = kr.supportedRelationshipTypes.length === 0 || kr.supportedRelationshipTypes.includes(projectForm.targetRelationshipType as RelationshipType);
                  const selectedKr = projectForm.keyResults.find((k) => k.type === kr.type);
                  const isSelected = !!selectedKr && isSupported; 
                  const supportedLabels = kr.supportedRelationshipTypes.map(rt => RELATIONSHIP_OPTIONS.find(o => o.value === rt)?.label || rt).join(', ');

                  return (
                    <div
                      key={kr.type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                        opacity: isSupported ? 1 : 0.6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`edit-kr-checkbox-${kr.type}`}
                        checked={isSelected}
                        disabled={!isSupported}
                        onChange={(e) => {
                          if (!isSupported) return;
                          const checked = e.target.checked;
                          setProjectForm((current) => {
                            const withoutCurrent = current.keyResults.filter((k) => k.type !== kr.type);
                            const updatedList = checked ? [...withoutCurrent, { type: kr.type, weight: 0 }] : withoutCurrent;
                            const rebalanced = balanceDeliverableWeights(updatedList);
                            return { ...current, keyResults: rebalanced };
                          });
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: isSupported ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          margin: 0
                        }}
                      />
                      <label htmlFor={`edit-kr-checkbox-${kr.type}`} style={{ flex: 1, cursor: isSupported ? 'pointer' : 'not-allowed', margin: 0, display: 'block' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--primary-dark)' : 'inherit' }}>{kr.displayName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{kr.description}</div>
                        {!isSupported && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '4px' }}>
                            Available only for {supportedLabels} projects.
                          </div>
                        )}
                      </label>
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <input
                            type="number"
                            title="Progress Weight"
                            className="search-input"
                            style={{ width: '70px', padding: '5px 8px', textAlign: 'center', height: '32px' }}
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
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="project-modal-foot" style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => onClose()} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !isFormValid}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};
