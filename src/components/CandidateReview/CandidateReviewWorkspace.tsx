import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCheck, Edit2 } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import type { AiFieldResult, CandidateResponse } from '../../types/domain';
import { CandidateQualitySummary } from './CandidateQualitySummary';
import { EditableScalarField } from './EditableScalarField';
import { EditableListField } from './EditableListField';
import { EditableProductList } from './EditableProductList';
import styles from './CandidateReview.module.css';

const FLAT_TO_DOT: Record<string, string> = {
  legalName: 'identity.legalName',
  tradeName: 'identity.tradeName',
  taxCode: 'identity.taxCode',
  address: 'contact.address',
  website: 'contact.website',
  email: 'contact.emails',
  phone: 'contact.phones',
  businessModel: 'business.businessModel',
  industries: 'business.industries',
  markets: 'business.markets',
  targetCustomers: 'business.targetCustomers',
  products: 'business.products',
  employeeTier: 'companySize.employeeTier',
  companySize: 'companySize.revenueTier',
};

function normalizeFieldResults(raw: Record<string, any> | undefined): Record<string, any> {
  if (!raw) return {};
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    const dotKey = FLAT_TO_DOT[key] || key;
    normalized[dotKey] = {
      ...value,
      reviewedValue: value.staffReviewedValue !== undefined ? value.staffReviewedValue : value.reviewedValue
    };
  }
  return normalized;
}

interface CandidateReviewWorkspaceProps {
  projectId: string;
  candidateId: string;
  taskId?: number;
  role?: string;
  onReviewed?: () => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLoading?: boolean;
  readOnly?: boolean;
  isResearchNewCompany?: boolean;
}

type TabType = 'Identity' | 'Business' | 'Markets' | 'Products';
type ReviewFilter = 'ALL' | 'RETURNED' | 'PENDING' | 'EDITED' | 'ISSUES' | 'LOW_CONFIDENCE';

const TAB_FIELD_GROUPS: Record<TabType, Array<{ key: string; label: string }>> = {
  Identity: [
    { key: 'identity.legalName', label: 'Legal Name' },
    { key: 'identity.tradeName', label: 'Trade Name' },
    { key: 'identity.taxCode', label: 'Tax Code' },
    { key: 'contact.website', label: 'Website' },
    { key: 'contact.address', label: 'Address' },
    { key: 'contact.emails', label: 'Emails' },
    { key: 'contact.phones', label: 'Phones' },
  ],
  Business: [
    { key: 'business.businessModel', label: 'Business Model' },
    { key: 'business.industries', label: 'Industries' },
    { key: 'companySize.employeeTier', label: 'Employee Tier' },
    { key: 'companySize.employeeCount', label: 'Employee Count' },
    { key: 'companySize.revenueTier', label: 'Revenue Tier' },
  ],
  Markets: [
    { key: 'business.markets', label: 'Markets (Regions)' },
    { key: 'business.targetCustomers', label: 'Target Customers' },
  ],
  Products: [
    { key: 'business.products', label: 'Products & Services' },
  ],
};

const fieldValueToText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(fieldValueToText).filter(Boolean).join(' ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizeManagerStatus = (status: unknown): 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' => {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'ACCEPTED' || value === 'APPROVED') return 'ACCEPTED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'CHANGES_REQUESTED' || value === 'NEEDS_REVIEW' || value === 'REVISION_REQUIRED') return 'CHANGES_REQUESTED';
  return 'PENDING';
};

const isManagerAccepted = (field?: AiFieldResult) => normalizeManagerStatus(field?.managerReviewStatus) === 'ACCEPTED';

const isReturnedByManager = (field?: AiFieldResult) => {
  const current = normalizeManagerStatus(field?.managerReviewStatus);
  const previous = normalizeManagerStatus(field?.previousManagerReviewStatus);
  return current === 'REJECTED' || current === 'CHANGES_REQUESTED' || previous === 'REJECTED' || previous === 'CHANGES_REQUESTED';
};

const allCandidateFields = Object.values(TAB_FIELD_GROUPS).flat();
const labelForField = (key: string) => allCandidateFields.find((field) => field.key === key)?.label || key;

export const CandidateReviewWorkspace: React.FC<CandidateReviewWorkspaceProps> = ({
  projectId,
  candidateId,
  taskId,
  onReviewed,
  onCancel,
  onSubmit,
  submitLoading,
  readOnly,
  isResearchNewCompany
}) => {
  const [serverCandidate, setServerCandidate] = useState<CandidateResponse | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { reviewedValue: any, reviewStatus: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Identity');
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (flatUpdates: Record<string, any>) => candidateApi.reviewCandidateFields(projectId, candidateId, flatUpdates),
    onSuccess: (response) => {
      if (response?.data) {
        setServerCandidate(response.data);
        queryClient.setQueryData(["candidate", candidateId], response);
      }
      setPendingUpdates({});
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      if (onReviewed) onReviewed();
    },
    onError: () => {
      alert("Error saving changes");
    }
  });

  useEffect(() => {
    fetchData();
  }, [candidateId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const candidateRes = await candidateApi.getCandidateById(candidateId);
      if (candidateRes.success && candidateRes.data) {
        setServerCandidate(candidateRes.data);
        setPendingUpdates({});
      }
    } catch (err) {
      alert("Failed to load candidate data");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any, status: string = 'EDITED') => {
    setPendingUpdates((prev) => ({ ...prev, [key]: { reviewedValue: value, reviewStatus: status } }));
  };

  const handleApproveAllInTab = () => {
    const activeTabFields = TAB_FIELD_GROUPS[activeTab];
    const newPendingUpdates = { ...pendingUpdates };
    let hasChanges = false;

    for (const { key } of activeTabFields) {
      const field = fieldResults[key];
      const isConfirmed = field?.staffReviewStatus === 'CONFIRMED';
      
      if (!isConfirmed && !isManagerAccepted(field)) {
        newPendingUpdates[key] = {
          ...newPendingUpdates[key],
          reviewedValue: field?.reviewedValue !== undefined ? field.reviewedValue : (field?.staffReviewedValue !== undefined ? field.staffReviewedValue : field?.value),
          reviewStatus: 'CONFIRMED'
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setPendingUpdates(newPendingUpdates);
    }
  };

  const handleSave = () => {
    if (Object.keys(pendingUpdates).length === 0) return;
    const reviewUpdates: Record<string, any> = {};
    for (const [dotKey, val] of Object.entries(pendingUpdates)) {
      let staffStatus = val.reviewStatus;
      if (staffStatus === 'ACCEPTED') staffStatus = 'CONFIRMED';
      if (staffStatus === 'RESTORED') staffStatus = 'PENDING';

      reviewUpdates[dotKey] = {
        reviewedValue: val.reviewedValue,
        staffReviewStatus: staffStatus,
        isManager: false,
        manager: false
      };
    }
    saveMutation.mutate(reviewUpdates);
  };

  const handleDiscard = () => {
    setPendingUpdates({});
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading candidate...</div>;
  if (!serverCandidate) return <div>Not found</div>;

  const originalFieldResults = normalizeFieldResults(serverCandidate.fieldResults);
  const fieldResults = { ...originalFieldResults };
  Object.keys(pendingUpdates).forEach(key => {
    if (!fieldResults[key]) fieldResults[key] = { value: null };
    
    let staffStatus = pendingUpdates[key].reviewStatus;
    if (staffStatus === 'ACCEPTED') staffStatus = 'CONFIRMED';
    if (staffStatus === 'RESTORED') staffStatus = 'PENDING';

    fieldResults[key] = {
      ...fieldResults[key],
      reviewedValue: pendingUpdates[key].reviewedValue,
      staffReviewStatus: staffStatus,
    };
  });

  const activeTabFields = TAB_FIELD_GROUPS[activeTab];

  let tabTotalFields = 0;
  let tabConfirmedFields = 0;
  let tabEditedFields = 0;
  let tabPendingFields = 0;
  let tabIssueFields = 0;
  let tabLowConfidenceFields = 0;
  let tabReturnedFields = 0;

  for (const { key } of activeTabFields) {
    tabTotalFields++;
    const field = fieldResults[key];
    const staffStatus = field?.staffReviewStatus;
    const validationStatus = field?.validationStatus;
    const confidence = field?.confidence;
    
    if (staffStatus === 'CONFIRMED') tabConfirmedFields++;
    else if (staffStatus === 'EDITED' || staffStatus === 'ADDED' || staffStatus === 'REMOVED') tabEditedFields++;
    else tabPendingFields++;
    
    if (validationStatus === 'FAIL') tabIssueFields++;
    if (typeof confidence === 'number' && confidence > 0 && confidence < 0.6) tabLowConfidenceFields++;
    if (isReturnedByManager(field)) tabReturnedFields++;
  }

  const resolvedFields = Object.values(FLAT_TO_DOT).filter(key => fieldResults[key]?.staffReviewStatus === 'CONFIRMED').length;
  const totalFieldsGlobal = Object.keys(FLAT_TO_DOT).length;
  const progressPercent = Math.round((resolvedFields / totalFieldsGlobal) * 100);
  const unsavedCount = Object.keys(pendingUpdates).length;
  const isRejected = serverCandidate.status === 'REJECTED';
  const isRevision = serverCandidate.status === 'REVISION_REQUIRED';
  const allFieldKeys = Object.values(FLAT_TO_DOT);
  const returnedFields = allFieldKeys
    .map((key) => ({ key, label: labelForField(key), field: fieldResults[key] }))
    .filter(({ field }) => isReturnedByManager(field));
  const hasChangesRequested = returnedFields.length > 0;
  const isSubmitEnabled = allFieldKeys.every((key) => {
    const field = fieldResults[key];
    if (isManagerAccepted(field)) return true;
    return field?.staffReviewStatus === 'CONFIRMED';
  });

  const isSaving = saveMutation.isPending;

  const tabs: TabType[] = ['Identity', 'Business', 'Markets', 'Products'];
  const reviewFilters: Array<{ id: ReviewFilter; label: string; count: number }> = [
    { id: 'ALL', label: 'All', count: tabTotalFields },
    { id: 'RETURNED', label: 'Changes', count: tabReturnedFields },
    { id: 'PENDING', label: 'Pending', count: tabPendingFields },
    { id: 'EDITED', label: 'Edited', count: tabEditedFields },
    { id: 'ISSUES', label: 'Issues', count: tabIssueFields },
    { id: 'LOW_CONFIDENCE', label: 'Low Confidence', count: tabLowConfidenceFields },
  ];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const getFieldValue = (key: string) => {
    const field = fieldResults[key];
    if (field?.reviewedValue !== undefined) return field.reviewedValue;
    if (field?.staffReviewedValue !== undefined) return field.staffReviewedValue;
    return field?.value;
  };
  const checkFilterMatch = (key: string, filterId: ReviewFilter) => {
    const field = fieldResults[key];
    const staffStatus = field?.staffReviewStatus;
    const isEdited = staffStatus === 'EDITED' || staffStatus === 'ADDED' || staffStatus === 'REMOVED';
    const isConfirmed = staffStatus === 'CONFIRMED';
    const isPending = !isConfirmed && !isEdited;
    const confidence = field?.confidence;

    if (filterId === 'RETURNED') return isReturnedByManager(field);
    if (filterId === 'PENDING') return isPending;
    if (filterId === 'EDITED') return isEdited;
    if (filterId === 'ISSUES') return field?.validationStatus === 'FAIL';
    if (filterId === 'LOW_CONFIDENCE') return typeof confidence === 'number' && confidence > 0 && confidence < 0.6;
    return true;
  };

  const matchesReviewFilter = (key: string) => checkFilterMatch(key, activeFilter);

  const handleFilterClick = (filterId: ReviewFilter) => {
    setActiveFilter(filterId);
  };
  const matchesFieldSearch = (key: string, label: string) => {
    if (!normalizedSearch) return true;
    return `${label} ${fieldValueToText(getFieldValue(key))}`.toLowerCase().includes(normalizedSearch);
  };
  const shouldShowField = (key: string, label: string) => matchesReviewFilter(key) && matchesFieldSearch(key, label);
  const visibleFieldCount = activeTabFields.filter((field) => shouldShowField(field.key, field.label)).length;
  const tabStats = tabs.reduce<Record<TabType, { total: number; issues: number }>>((map, tab) => {
    const fields = TAB_FIELD_GROUPS[tab];
    map[tab] = {
      total: fields.length,
      issues: fields.filter((field) => fieldResults[field.key]?.validationStatus === 'FAIL').length,
    };
    return map;
  }, {} as Record<TabType, { total: number; issues: number }>);
  const renderReviewField = (key: string, label: string, content: React.ReactNode, fullWidth = false) => {
    if (!shouldShowField(key, label)) return null;
    return fullWidth ? (
      <div className={styles.fieldGridFull} key={key}>{content}</div>
    ) : (
      <React.Fragment key={key}>{content}</React.Fragment>
    );
  };

  const isManual = serverCandidate.extractionSource?.extractionMethod === 'MANUAL';

  return (
    <div className={styles.workspace}>
      <div className={styles.candidateHeader}>
        <div className={styles.candidateHeaderLeft}>
          <span className={styles.candidateEyebrow}>{isRevision ? 'CANDIDATE REVISION' : (isManual ? 'MANUAL CANDIDATE DRAFT' : 'CANDIDATE DRAFT')}</span>
          {isEditingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                autoFocus
                style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '4px 8px', margin: '-4px -8px', border: '1px solid #ccc', borderRadius: '4px', width: '300px' }}
                value={titleInputValue}
                onChange={(e) => setTitleInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPendingUpdates(prev => ({
                      ...prev,
                      'identity.legalName': {
                        reviewedValue: titleInputValue,
                        reviewStatus: 'DRAFT'
                      }
                    }));
                    setIsEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={() => {
                  setPendingUpdates(prev => ({
                    ...prev,
                    'identity.legalName': {
                      reviewedValue: titleInputValue,
                      reviewStatus: 'DRAFT'
                    }
                  }));
                  setIsEditingTitle(false);
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2>{(pendingUpdates['identity.legalName']?.reviewedValue !== undefined ? pendingUpdates['identity.legalName']?.reviewedValue : serverCandidate.identity?.legalName) || (isManual ? 'New Company' : 'Unknown Company')}</h2>
              {isManual && (
                <button 
                  type="button"
                  title="Edit Company Name"
                  onClick={() => {
                    const currentVal = pendingUpdates['identity.legalName']?.reviewedValue !== undefined ? pendingUpdates['identity.legalName']?.reviewedValue : serverCandidate.identity?.legalName;
                    setTitleInputValue(currentVal || '');
                    setIsEditingTitle(true);
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>
          )}
          <div className={styles.candidateSubline}>
            ID: {serverCandidate.id.slice(-8)} &middot; Round {serverCandidate.revisionNumber || 1}{isRevision ? ' preparation' : ''}{!isManual && ` \u00B7 ${totalFieldsGlobal} fields extracted`}
          </div>
        </div>
        <div className={styles.candidateHeaderRight}>
          <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
            {serverCandidate.status}
          </span>
        </div>
      </div>

      {(isRejected || hasChangesRequested) && (
        <div className={styles.feedbackBanner}>
          <AlertCircle size={20} />
          <div className={styles.feedbackBody}>
            <strong>Manager Feedback</strong>
            <p>{returnedFields.length} field{returnedFields.length !== 1 ? 's' : ''} require revision.</p>
            {returnedFields.length > 0 && (
              <ul className={styles.feedbackList}>
                {returnedFields.map(({ key, label, field }) => (
                  <li key={key}>
                    <strong>{label}</strong>
                    <span>{field?.previousManagerReviewComment || field?.managerReviewComment || 'Manager requested a change.'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!isManual && (
        <div className={styles.qualityBar}>
          <CandidateQualitySummary 
            metrics={serverCandidate.qualityMetrics || {}} 
            status={serverCandidate.qualityStatus || 'UNKNOWN'} 
          />
        </div>
      )}

      <div className={styles.layoutContainer}>
        <div className={styles.mainContent}>
          <div className={styles.tabsContainer}>
            {tabs.map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                <span className={styles.tabCount}>{tabStats[tab].total}</span>
                {tabStats[tab].issues > 0 && <span className={styles.tabIssueDot}>{tabStats[tab].issues} issue</span>}
              </button>
            ))}
          </div>

          <div className={styles.quickFilterBar} aria-label="Review field filters">
            <div>
              <span>Review fields</span>
              <small>{visibleFieldCount} visible in {activeTab}</small>
            </div>
            {/* <label className={styles.fieldSearch}>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fields..."
              />
            </label> */}
            <div className={styles.quickFilterActions}>
              {reviewFilters.map(filter => (
                <button
                  type="button"
                  key={filter.id}
                  className={`${styles.quickFilterButton} ${activeFilter === filter.id ? styles.quickFilterButtonActive : ''}`}
                  onClick={() => handleFilterClick(filter.id)}
                >
                  {filter.label} <strong>{filter.count}</strong>
                </button>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  className={styles.approveAllBtn}
                  onClick={handleApproveAllInTab}
                  title={`Approve all unconfirmed fields in ${activeTab}`}
                >
                  <CheckCheck size={16} /> Approve All
                </button>
              )}
            </div>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'Identity' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('identity.legalName', 'Legal Name', <EditableScalarField disabled={readOnly || isResearchNewCompany || isManagerAccepted(fieldResults['identity.legalName'])} label="Legal Name" fieldKey="identity.legalName" fieldResult={fieldResults['identity.legalName']} onChange={handleFieldChange} />)}
                {renderReviewField('identity.tradeName', 'Trade Name', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['identity.tradeName'])} label="Trade Name" fieldKey="identity.tradeName" fieldResult={fieldResults['identity.tradeName']} onChange={handleFieldChange} />)}
                {renderReviewField('identity.taxCode', 'Tax Code', <EditableScalarField disabled={readOnly || isResearchNewCompany || isManagerAccepted(fieldResults['identity.taxCode'])} label="Tax Code" fieldKey="identity.taxCode" fieldResult={fieldResults['identity.taxCode']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.website', 'Website', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['contact.website'])} label="Website" fieldKey="contact.website" fieldResult={fieldResults['contact.website']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.address', 'Address', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['contact.address'])} label="Address" fieldKey="contact.address" type="textarea" fieldResult={fieldResults['contact.address']} onChange={handleFieldChange} />, true)}
                {renderReviewField('contact.emails', 'Emails', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['contact.emails'])} label="Emails" fieldKey="contact.emails" fieldResult={fieldResults['contact.emails']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.phones', 'Phones', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['contact.phones'])} label="Phones" fieldKey="contact.phones" fieldResult={fieldResults['contact.phones']} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeTab === 'Business' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.businessModel', 'Business Model', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['business.businessModel'])} label="Business Model" fieldKey="business.businessModel" type="textarea" fieldResult={fieldResults['business.businessModel']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.industries', 'Industries', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['business.industries'])} label="Industries" fieldKey="business.industries" fieldResult={fieldResults['business.industries']} onChange={handleFieldChange} />, true)}
                {renderReviewField('companySize.employeeTier', 'Employee Tier', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['companySize.employeeTier'])} label="Employee Tier" fieldKey="companySize.employeeTier" fieldResult={fieldResults['companySize.employeeTier']} onChange={handleFieldChange} />)}
                {renderReviewField('companySize.employeeCount', 'Employee Count', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['companySize.employeeCount'])} label="Employee Count" type="number" fieldKey="companySize.employeeCount" fieldResult={fieldResults["companySize.employeeCount"]} onChange={handleFieldChange} />)}
                {renderReviewField('companySize.revenueTier', 'Revenue Tier', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['companySize.revenueTier'])} label="Revenue Tier" fieldKey="companySize.revenueTier" fieldResult={fieldResults["companySize.revenueTier"]} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeTab === 'Markets' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.markets', 'Markets (Regions)', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['business.markets'])} label="Markets (Regions)" fieldKey="business.markets" fieldResult={fieldResults['business.markets']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.targetCustomers', 'Target Customers', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['business.targetCustomers'])} label="Target Customers" fieldKey="business.targetCustomers" fieldResult={fieldResults['business.targetCustomers']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {activeTab === 'Products' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.products', 'Products & Services', <EditableProductList disabled={readOnly || isManagerAccepted(fieldResults['business.products'])} label="Products & Services" fieldKey="business.products" fieldResult={fieldResults['business.products']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {visibleFieldCount === 0 && (
              <div className={styles.emptyFilteredState}>
                No fields match the current search or filter.
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.staffReviewPanel}>
            <h3>Staff Review</h3>
            
            <div className={styles.staffProgressBlock}>
              <div className={styles.staffProgressTopline}>
                <span>{resolvedFields} / {totalFieldsGlobal} confirmed</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#16a34a' : '#2563eb' }}
                />
              </div>
            </div>

            <div className={styles.staffReviewStats}>
              <div className={styles.staffReviewStat}>
                <span>
                  <i className={styles.dotConfirmed}></i>
                  Confirmed
                </span>
                <strong>{tabConfirmedFields}</strong>
              </div>
              
              <div className={styles.staffReviewStat}>
                <span>
                  <i className={styles.dotEdited}></i>
                  Edited
                </span>
                <strong>{tabEditedFields}</strong>
              </div>
              
              <div className={styles.staffReviewStat}>
                <span>
                  <i className={styles.dotPending}></i>
                  Pending
                </span>
                <strong>{tabPendingFields}</strong>
              </div>

              {tabIssueFields > 0 && (
                <div className={`${styles.staffReviewStat} ${styles.staffReviewWarning}`}>
                  <span>
                    <AlertCircle size={14} />
                    Validation Issues
                  </span>
                  <strong>{tabIssueFields}</strong>
                </div>
              )}

              {tabLowConfidenceFields > 0 && (
                <div className={`${styles.staffReviewStat} ${styles.staffReviewCaution}`}>
                  <span>
                    <AlertCircle size={14} />
                    Low Confidence
                  </span>
                  <strong>{tabLowConfidenceFields}</strong>
                </div>
              )}
            </div>

            <div className={styles.sidebarSection}>
              <h3>
                Submission Readiness
              </h3>
              <p className={isSubmitEnabled ? styles.readyText : ''}>
                {isSubmitEnabled 
                  ? '✓ Ready for Manager Review. All required fields have been reviewed.' 
                  : `${tabPendingFields} field${tabPendingFields !== 1 ? 's' : ''} still need confirmation.`}
              </p>
            </div>

            <div className={styles.sidebarSection}>
              <h3>
                Review History
              </h3>
              <div className={styles.reviewHistoryEmpty}>
                <p>No submissions yet.</p>
                <p>Your first Manager review submission will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarLeft}>
          <span className={styles.progressTitle} style={{ fontWeight: '600', color: isSubmitEnabled ? '#16a34a' : '#0f172a' }}>
            {isSubmitEnabled ? '✓ Ready to submit' : `${resolvedFields} / ${totalFieldsGlobal} resolved`}
          </span>
          {unsavedCount > 0 && (
            <span className={styles.actionBarDirty}>
              &middot; {unsavedCount} unsaved change{unsavedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className={styles.actionBarRight}>
          <button className={styles.btnSecondary} onClick={onCancel} disabled={isSaving || submitLoading}>Close</button>
          
          {unsavedCount > 0 && (
            <>
              <button className={styles.btnSecondary} onClick={handleDiscard} disabled={isSaving || submitLoading}>Discard</button>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={isSaving || submitLoading}>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            </>
          )}

          {unsavedCount === 0 && onSubmit && !readOnly && (
            <button 
              className={styles.btnSubmit} 
              onClick={onSubmit} 
              disabled={!isSubmitEnabled || submitLoading}
              title={isSubmitEnabled ? "Submit to Manager" : `${tabPendingFields} field${tabPendingFields !== 1 ? 's' : ''} still require confirmation`}
            >
              {submitLoading ? 'Submitting...' : (serverCandidate.status === 'REVISION_REQUIRED' ? 'Resubmit for Review' : 'Submit for Review')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
