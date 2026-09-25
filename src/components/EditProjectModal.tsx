import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { projectApi } from '../API/projectApi';
import { api } from '../services/api';
import {
  balanceDeliverableWeights,
  RELATIONSHIP_OPTIONS,
  isRelationshipContractEligible,
  normalizeRelationshipInput,
  getProfileCanonicalRelationship,
  EXISTING_COMPANY_DELIVERABLE_TYPES,
  findCompanyProfile,
  profileName,
  filterAndRebalanceDeliverables,
  isDeliverableMandatory,
  getDeliverableMandatoryReason,
  getLocalTodayDateString,
  validateProjectDueDate,
} from '../utils/deliverableUtils';
import type {
  ProjectResponse,
  UpdateProjectRequest,
  KeyResultReferenceResponse,
  RelationshipType,
  ProfileResponse,
  PageResult,
} from '../types/domain';

type EditProjectModalProps = {
  project: ProjectResponse;
  onClose: () => void;
  onSuccess: (updatedProject: ProjectResponse) => void;
};

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSuccess }) => {
  const { t } = useTranslation('projects-overview');
  const isDraftProject = project.status === 'DRAFT';
  const isUpdateExisting = project.projectType === 'UPDATE_EXISTING_COMPANY';

  const [companyProfile, setCompanyProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Initialize key results filtering out deliverables invalid for project type
  const [projectForm, setProjectForm] = useState(() => {
    const isUpdate = project.projectType === 'UPDATE_EXISTING_COMPANY';
    const initialTargetRel = normalizeRelationshipInput(project.targetRelationshipType);
    const targetEligible = isRelationshipContractEligible(initialTargetRel);

    const krs = (project.keyResults || []).filter((kr) => {
      if (isUpdate) {
        if (!EXISTING_COMPANY_DELIVERABLE_TYPES.includes(kr.type)) return false;
        if (kr.type === 'CONTRACT_INFORMATION' && !targetEligible) return false;
      } else {
        if (kr.type === 'CONTRACT_INFORMATION' && !targetEligible) return false;
      }
      return true;
    }).map((kr) => ({ type: kr.type, weight: kr.weight }));

    // Deduplicate
    const map = new Map<string, { type: string; weight: number }>();
    for (const item of krs) {
      map.set(item.type, item);
    }
    let list = Array.from(map.values());
    if (!isUpdate && !list.some(k => k.type === 'BASIC_COMPANY_INFORMATION')) {
      list.push({ type: 'BASIC_COMPANY_INFORMATION', weight: 0 });
    }
    const sum = list.reduce((s, k) => s + (k.weight || 0), 0);
    if (sum !== 100 && list.length > 0) {
      list = balanceDeliverableWeights(list);
    }

    return {
      projectName: project.projectName || '',
      targetCompanyName: project.targetCompanyName || '',
      targetCompanyTaxCode: project.targetCompanyTaxCode || '',
      targetRelationshipType: project.targetRelationshipType || '',
      description: project.description || '',
      objective: project.objective || '',
      plannedEndDate: project.plannedEndDate || '',
      keyResults: list,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [krOptions, setKrOptions] = useState<KeyResultReferenceResponse[]>([]);
  const [krLoading, setKrLoading] = useState(true);

  // Load authoritative Company Profile for Existing Company Update
  useEffect(() => {
    if (project.projectType !== 'UPDATE_EXISTING_COMPANY') return;
    const targetId = project.targetCompanyProfileId;
    let cancelled = false;

    const loadCompanyProfile = async () => {
      setProfileLoading(true);
      try {
        if (targetId) {
          try {
            const res = await api.get<ProfileResponse>(`/profiles/${targetId}`);
            if (!cancelled && res.data) {
              setCompanyProfile(res.data);
              return;
            }
          } catch {
            // fallback to /profiles list
          }
        }
        const res = await api.get<PageResult<ProfileResponse>>('/profiles', {
          params: { page: 0, size: 100, excludeOwner: true },
        });
        if (!cancelled && res.data?.content) {
          const found = findCompanyProfile(res.data.content, targetId) ||
            res.data.content.find(
              (p) =>
                (project.targetCompanyName && profileName(p).toLowerCase() === project.targetCompanyName.toLowerCase()) ||
                (project.targetCompanyTaxCode && p.identity?.taxCode === project.targetCompanyTaxCode)
            );
          if (found) {
            setCompanyProfile(found);
          }
        }
      } catch (err) {
        console.error('Failed to load profile for existing company', err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    void loadCompanyProfile();
    return () => {
      cancelled = true;
    };
  }, [project.projectType, project.targetCompanyProfileId, project.targetCompanyName, project.targetCompanyTaxCode]);

  useEffect(() => {
    projectApi.getKeyResultReference()
      .then(res => setKrOptions(res.data))
      .catch(console.error)
      .finally(() => setKrLoading(false));
  }, []);

  const currentRelationship = isUpdateExisting ? getProfileCanonicalRelationship(companyProfile) : null;
  const currentRelOption = RELATIONSHIP_OPTIONS.find((o) => o.value === currentRelationship);
  const currentRelLabel = profileLoading
    ? 'Loading...'
    : currentRelOption?.label || (currentRelationship ? currentRelationship.replace(/_/g, ' ') : '—');

  const normalizedTargetRel = normalizeRelationshipInput(projectForm.targetRelationshipType);
  const targetRelOption = RELATIONSHIP_OPTIONS.find((o) => o.value === normalizedTargetRel);
  const targetRelLabel = targetRelOption?.label || (projectForm.targetRelationshipType ? projectForm.targetRelationshipType.replace(/_/g, ' ') : '—');

  const isRelationshipChanged = isUpdateExisting &&
    !!currentRelationship &&
    !!normalizedTargetRel &&
    normalizedTargetRel !== currentRelationship;

  const isTargetContractEligible = isRelationshipContractEligible(normalizedTargetRel);
  const isContractMandatory = isRelationshipChanged && isTargetContractEligible;

  // Auto-sync contract requirement when company profile canonical relationship resolves
  useEffect(() => {
    if (!isUpdateExisting || !companyProfile || !isDraftProject) return;
    const canonical = getProfileCanonicalRelationship(companyProfile);
    const target = normalizeRelationshipInput(projectForm.targetRelationshipType);
    if (!canonical || !target || canonical === target) return;

    if (isRelationshipContractEligible(target)) {
      setProjectForm((prev) => {
        if (!prev.keyResults.some((k) => k.type === 'CONTRACT_INFORMATION')) {
          const allowedKrs = [...prev.keyResults.filter((k) => k.type === 'FINANCIAL_INFORMATION'), { type: 'CONTRACT_INFORMATION', weight: 0 }];
          return {
            ...prev,
            keyResults: balanceDeliverableWeights(allowedKrs),
          };
        }
        return prev;
      });
    }
  }, [companyProfile, isUpdateExisting, isDraftProject, projectForm.targetRelationshipType]);

  const totalWeight = projectForm.keyResults.reduce((sum, kr) => sum + (kr.weight || 0), 0);
  const is100 = totalWeight === 100;
  const isOver = totalWeight > 100;

  const minDate = getLocalTodayDateString();
  const dueDateError = validateProjectDueDate(projectForm.plannedEndDate);

  const isFormValid =
    (!isDraftProject || totalWeight === 100) &&
    projectForm.projectName.trim() !== '' &&
    projectForm.targetCompanyName.trim() !== '' &&
    projectForm.targetRelationshipType !== '' &&
    !dueDateError &&
    (!isDraftProject || (
      projectForm.keyResults.length > 0 &&
      projectForm.keyResults.every(kr => kr.weight > 0) &&
      (!isContractMandatory || projectForm.keyResults.some(kr => kr.type === 'CONTRACT_INFORMATION' && kr.weight > 0))
    ));

  const handleBalanceEqually = () => {
    setProjectForm(prev => ({
      ...prev,
      keyResults: balanceDeliverableWeights(prev.keyResults),
    }));
  };

  const handleTargetRelationshipChange = (newRel: string) => {
    const normalizedTarget = normalizeRelationshipInput(newRel);
    const contractEligible = isRelationshipContractEligible(normalizedTarget);
    const isChanged = isUpdateExisting &&
      !!currentRelationship &&
      !!normalizedTarget &&
      normalizedTarget !== currentRelationship;
    const contractRequired = isChanged && contractEligible;

    setProjectForm((prev) => {
      const rebalancedKrs = filterAndRebalanceDeliverables(
        prev.keyResults,
        normalizedTarget,
        krOptions,
        project.projectType,
        contractRequired
      );

      return {
        ...prev,
        targetRelationshipType: newRel,
        keyResults: rebalancedKrs,
      };
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid || dueDateError) return;
    try {
      setLoading(true);
      setError(null);

      const targetContractEligible = isRelationshipContractEligible(normalizedTargetRel);
      const sanitizedKRs = projectForm.keyResults.filter((kr) => {
        if (kr.type === 'CONTRACT_INFORMATION' && !targetContractEligible) {
          return false;
        }
        if (isUpdateExisting) {
          return EXISTING_COMPANY_DELIVERABLE_TYPES.includes(kr.type);
        }
        return true;
      });

      if (isDraftProject) {
        if (project.projectType === 'RESEARCH_NEW_COMPANY') {
          const hasBasic = sanitizedKRs.some((kr) => kr.type === 'BASIC_COMPANY_INFORMATION' && kr.weight > 0);
          if (!hasBasic) {
            setError('Basic Company Information is required for New Company Research projects.');
            setLoading(false);
            return;
          }
        }

        if (isUpdateExisting && isContractMandatory) {
          const hasContract = sanitizedKRs.some((kr) => kr.type === 'CONTRACT_INFORMATION' && kr.weight > 0);
          if (!hasContract) {
            setError('Contract Information is required for this relationship change.');
            setLoading(false);
            return;
          }
        }

        const selectedKRs = sanitizedKRs.filter((kr) => kr.weight > 0);
        if (selectedKRs.length === 0) {
          setError('At least one Project Deliverable must be selected.');
          setLoading(false);
          return;
        }

        const total = selectedKRs.reduce((s, k) => s + k.weight, 0);
        if (total !== 100) {
          setError('Total Progress Weight of Project Deliverables must be exactly 100.');
          setLoading(false);
          return;
        }
      }

      const payload: UpdateProjectRequest = {
        projectName: projectForm.projectName.trim(),
        targetCompanyName: projectForm.targetCompanyName.trim(),
        targetCompanyTaxCode: projectForm.targetCompanyTaxCode.trim() || undefined,
        targetRelationshipType: normalizedTargetRel || undefined,
        description: projectForm.description.trim() || undefined,
        objective: projectForm.objective.trim() || undefined,
        plannedEndDate: projectForm.plannedEndDate || undefined,
        ...(isDraftProject ? { keyResults: sanitizedKRs.filter(kr => kr.weight > 0) } : {}),
      };

      const updated = await projectApi.updateProject(project.id, payload);
      onSuccess(updated.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      setError(message);
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
            <h3>Update {isDraftProject ? 'Draft' : ''} Project</h3>
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
                  value={isUpdateExisting ? 'Existing company update' : 'New company research'}
                  readOnly
                  style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' }}
                />
              </label>
              <label>
                <span>Target Company</span>
                <input
                  className="search-input"
                  value={projectForm.targetCompanyName}
                  readOnly={isUpdateExisting}
                  onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyName: e.target.value }))}
                  style={isUpdateExisting ? { backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' } : undefined}
                />
              </label>
              <label>
                <span>Tax Code</span>
                <input
                  className="search-input"
                  value={projectForm.targetCompanyTaxCode}
                  onChange={e => setProjectForm(prev => ({ ...prev, targetCompanyTaxCode: e.target.value.replace(/[^0-9-]/g, '') }))}
                  readOnly={isUpdateExisting}
                  style={isUpdateExisting ? { backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' } : undefined}
                />
              </label>

              {isUpdateExisting ? (
                <>
                  <label>
                    <span>Current Relationship</span>
                    <input
                      className="search-input"
                      value={currentRelLabel}
                      readOnly
                      style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' }}
                    />
                  </label>
                  <label>
                    <span>Target Relationship</span>
                    <select
                      className="search-input"
                      value={projectForm.targetRelationshipType}
                      disabled={!isDraftProject}
                      onChange={e => handleTargetRelationshipChange(e.target.value)}
                    >
                      <option value="">Select relationship</option>
                      {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  {isRelationshipChanged && (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeeba',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#856404',
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Relationship change detected</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <strong>{currentRelLabel}</strong> &rarr; <strong>{targetRelLabel}</strong>
                      </div>
                      {isContractMandatory && (
                        <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#664d03' }}>
                          Contract Information is required for this relationship change.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <label>
                  <span>Target Relationship</span>
                  <select
                    className="search-input"
                    value={projectForm.targetRelationshipType}
                    disabled={!isDraftProject}
                    onChange={e => handleTargetRelationshipChange(e.target.value)}
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </label>
              )}

              <label>
                <span>Due Date</span>
                <input
                  className="search-input"
                  type="date"
                  min={minDate}
                  value={projectForm.plannedEndDate}
                  style={dueDateError ? { borderColor: '#ef4444' } : undefined}
                  onChange={e => setProjectForm(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                />
                {dueDateError && (
                  <div
                    className="workspace-inline-error"
                    style={{
                      marginTop: '4px',
                      fontSize: '0.82rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      marginBottom: 0,
                    }}
                  >
                    {dueDateError}
                  </div>
                )}
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
                  {isDraftProject && projectForm.keyResults.length > 0 && (
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
                {krOptions
                  .filter((kr) => {
                    if (isUpdateExisting) {
                      return EXISTING_COMPANY_DELIVERABLE_TYPES.includes(kr.type);
                    }
                    return true;
                  })
                  .map((kr) => {
                    const isDeliverableMandatoryVal = isDeliverableMandatory(kr.type, project.projectType, isContractMandatory);
                    const isContract = kr.type === 'CONTRACT_INFORMATION';
                    const isContractEligible = !isContract || isTargetContractEligible;
                    const isSupported = isContract
                      ? isContractEligible
                      : kr.supportedRelationshipTypes.length === 0 || kr.supportedRelationshipTypes.includes(normalizedTargetRel as RelationshipType);

                    const selectedKr = projectForm.keyResults.find((k) => k.type === kr.type);
                    const isSelected = isDeliverableMandatoryVal || (isSupported && !!selectedKr);
                    const supportedLabels = kr.supportedRelationshipTypes.map(rt => RELATIONSHIP_OPTIONS.find(o => o.value === rt)?.label || rt).join(', ');
                    const canEditKr = isDraftProject && !isDeliverableMandatoryVal && isSupported;
                    const mandatoryReason = getDeliverableMandatoryReason(kr.type, project.projectType, isContractMandatory, currentRelLabel, targetRelLabel);

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
                          disabled={!canEditKr}
                          onChange={(e) => {
                            if (!canEditKr) return;
                            const checked = e.target.checked;
                            setProjectForm((current) => {
                              const withoutCurrent = current.keyResults.filter((k) => k.type !== kr.type);
                              const updatedList = checked ? [...withoutCurrent, { type: kr.type, weight: 0 }] : withoutCurrent;
                              const rebalanced = filterAndRebalanceDeliverables(
                                updatedList,
                                normalizedTargetRel,
                                krOptions,
                                project.projectType,
                                isContractMandatory
                              );
                              return { ...current, keyResults: rebalanced };
                            });
                          }}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: canEditKr ? 'pointer' : 'not-allowed',
                            flexShrink: 0,
                            margin: 0
                          }}
                        />
                        <label htmlFor={`edit-kr-checkbox-${kr.type}`} style={{ flex: 1, cursor: canEditKr ? 'pointer' : 'not-allowed', margin: 0, display: 'block' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--primary-dark)' : 'inherit' }}>{kr.displayName}</span>
                            {isDeliverableMandatoryVal && (
                              <span style={{ fontSize: '0.72rem', color: '#856404', background: '#fff3cd', border: '1px solid #ffeeba', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Required
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{kr.description}</div>
                          {isDeliverableMandatoryVal && mandatoryReason && (
                            <div style={{ fontSize: '0.75rem', color: '#856404', marginTop: '3px', fontWeight: 500 }}>
                              {mandatoryReason}
                            </div>
                          )}
                          {!isSupported && !isDeliverableMandatoryVal && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '4px' }}>
                              Available only for {supportedLabels || 'Partner, Customer, Supplier'} projects.
                            </div>
                          )}
                        </label>
                        {isSelected && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <input
                              type="number"
                              title="Progress Weight"
                              className="search-input"
                              disabled={!isDraftProject}
                              style={{ width: '70px', padding: '5px 8px', textAlign: 'center', height: '32px' }}
                              value={selectedKr?.weight || (projectForm.keyResults.length === 1 ? 100 : 50)}
                              min={1}
                              max={100}
                              onChange={(e) => {
                                if (!isDraftProject) return;
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
          <button className="btn btn-outline" onClick={() => onClose()} disabled={loading}>{t('create.cancel') || 'Cancel'}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !isFormValid}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};
