import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import type { CandidateResponse } from '../../types/domain';
import { CandidateQualitySummary } from './CandidateQualitySummary';
import { EditableScalarField } from './EditableScalarField';
import { EditableListField } from './EditableListField';
import { EditableProductList } from './EditableProductList';
import { EditableObjectField } from './EditableObjectField';
import { SwotGrid } from './SwotGrid';
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
  strengths: 'insights.strengths',
  weaknesses: 'insights.weaknesses',
  opportunities: 'insights.opportunities',
  threats: 'insights.threats',
  financial: 'financial',
  innovation: 'innovation',
  market: 'market',
  risk: 'risk',
  compliance: 'compliance',
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
}

type TabType = 'Identity' | 'Business' | 'Markets' | 'Products' | 'SWOT' | 'Analysis';
type ReviewFilter = 'ALL' | 'PENDING' | 'EDITED' | 'ISSUES' | 'LOW_CONFIDENCE';

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
  SWOT: [
    { key: 'insights.strengths', label: 'Strengths' },
    { key: 'insights.weaknesses', label: 'Weaknesses' },
    { key: 'insights.opportunities', label: 'Opportunities' },
    { key: 'insights.threats', label: 'Threats' },
  ],
  Analysis: [
    { key: 'financial', label: 'Financial' },
    { key: 'innovation', label: 'Innovation' },
    { key: 'market', label: 'Market Analysis' },
    { key: 'risk', label: 'Risk' },
    { key: 'compliance', label: 'Compliance' },
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

export const CandidateReviewWorkspace: React.FC<CandidateReviewWorkspaceProps> = ({
  projectId,
  candidateId,
  onReviewed,
  onCancel,
  onSubmit,
  submitLoading,
  readOnly
}) => {
  const [serverCandidate, setServerCandidate] = useState<CandidateResponse | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { reviewedValue: any, reviewStatus: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Identity');
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (flatUpdates: Record<string, any>) => candidateApi.reviewCandidateFields(projectId, candidateId, flatUpdates),
    onSuccess: () => {
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

  const totalFields = Object.keys(FLAT_TO_DOT).length;
  let confirmedFields = 0;
  let editedFields = 0;
  let pendingFields = 0;
  let issueFields = 0;
  let lowConfidenceFields = 0;

  for (const key of Object.values(FLAT_TO_DOT)) {
    const staffStatus = fieldResults[key]?.staffReviewStatus;
    const validationStatus = fieldResults[key]?.validationStatus;
    const confidence = fieldResults[key]?.confidence;
    
    if (staffStatus === 'CONFIRMED') confirmedFields++;
    else if (staffStatus === 'EDITED' || staffStatus === 'ADDED' || staffStatus === 'REMOVED') editedFields++;
    else pendingFields++;
    
    if (validationStatus === 'FAIL') issueFields++;
    if (typeof confidence === 'number' && confidence > 0 && confidence < 0.6) lowConfidenceFields++;
  }

  const resolvedFields = confirmedFields;
  const unsavedCount = Object.keys(pendingUpdates).length;
  const isRejected = serverCandidate.status === 'REJECTED';
  const hasChangesRequested = Object.values(fieldResults).some(f => (f as any)?.managerReviewStatus === 'CHANGES_REQUESTED');
  const progressPercent = Math.round((resolvedFields / totalFields) * 100);
  const isSubmitEnabled = resolvedFields === totalFields;

  const isSaving = saveMutation.isPending;

  const tabs: TabType[] = ['Identity', 'Business', 'Markets', 'Products', 'SWOT', 'Analysis'];
  const reviewFilters: Array<{ id: ReviewFilter; label: string; count: number }> = [
    { id: 'ALL', label: 'All', count: totalFields },
    { id: 'PENDING', label: 'Pending', count: pendingFields },
    { id: 'EDITED', label: 'Edited', count: editedFields },
    { id: 'ISSUES', label: 'Issues', count: issueFields },
    { id: 'LOW_CONFIDENCE', label: 'Low Confidence', count: lowConfidenceFields },
  ];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const getFieldValue = (key: string) => {
    const field = fieldResults[key];
    if (field?.reviewedValue !== undefined) return field.reviewedValue;
    if (field?.staffReviewedValue !== undefined) return field.staffReviewedValue;
    return field?.value;
  };
  const matchesReviewFilter = (key: string) => {
    const field = fieldResults[key];
    const staffStatus = field?.staffReviewStatus;
    const isEdited = staffStatus === 'EDITED' || staffStatus === 'ADDED' || staffStatus === 'REMOVED';
    const isConfirmed = staffStatus === 'CONFIRMED';
    const isPending = !isConfirmed && !isEdited;
    const confidence = field?.confidence;

    if (activeFilter === 'PENDING') return isPending;
    if (activeFilter === 'EDITED') return isEdited;
    if (activeFilter === 'ISSUES') return field?.validationStatus === 'FAIL';
    if (activeFilter === 'LOW_CONFIDENCE') return typeof confidence === 'number' && confidence > 0 && confidence < 0.6;
    return true;
  };
  const matchesFieldSearch = (key: string, label: string) => {
    if (!normalizedSearch) return true;
    return `${label} ${fieldValueToText(getFieldValue(key))}`.toLowerCase().includes(normalizedSearch);
  };
  const shouldShowField = (key: string, label: string) => matchesReviewFilter(key) && matchesFieldSearch(key, label);
  const activeTabFields = TAB_FIELD_GROUPS[activeTab];
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

  return (
    <div className={styles.workspace}>
      <div className={styles.candidateHeader}>
        <div className={styles.candidateHeaderLeft}>
          <h2>{serverCandidate.identity?.legalName || 'Unknown Company'}</h2>
          <div className={styles.candidateSubline}>
            ID: {serverCandidate.id.slice(-8)} &middot; {totalFields} fields extracted
          </div>
        </div>
        <div className={styles.candidateHeaderRight}>
          <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
            {serverCandidate.status}
          </span>
        </div>
      </div>

      {isRejected && (
        <div className={styles.feedbackBanner}>
          <AlertCircle size={20} />
          <div className={styles.feedbackBody}>
            <strong>Manager Feedback: Changes Required</strong>
            <p>Please review the fields below and submit again.</p>
          </div>
        </div>
      )}

      {!isRejected && hasChangesRequested && (
        <div className={styles.feedbackBanner}>
          <AlertCircle size={20} />
          <div className={styles.feedbackBody}>
            <strong>Changes Requested</strong>
            <p>The manager has requested changes on some fields. Please review and update.</p>
          </div>
        </div>
      )}

      <div className={styles.qualityBar}>
        <CandidateQualitySummary 
          metrics={serverCandidate.qualityMetrics || {}} 
          status={serverCandidate.qualityStatus || 'UNKNOWN'} 
        />
      </div>

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
            <label className={styles.fieldSearch}>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fields..."
              />
            </label>
            <div className={styles.quickFilterActions}>
              {reviewFilters.map(filter => (
                <button
                  type="button"
                  key={filter.id}
                  className={`${styles.quickFilterButton} ${activeFilter === filter.id ? styles.quickFilterButtonActive : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label} <strong>{filter.count}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'Identity' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('identity.legalName', 'Legal Name', <EditableScalarField disabled={readOnly || fieldResults['identity.legalName']?.managerReviewStatus === 'ACCEPTED'} label="Legal Name" fieldKey="identity.legalName" fieldResult={fieldResults['identity.legalName']} onChange={handleFieldChange} />)}
                {renderReviewField('identity.tradeName', 'Trade Name', <EditableScalarField disabled={readOnly || fieldResults['identity.tradeName']?.managerReviewStatus === 'ACCEPTED'} label="Trade Name" fieldKey="identity.tradeName" fieldResult={fieldResults['identity.tradeName']} onChange={handleFieldChange} />)}
                {renderReviewField('identity.taxCode', 'Tax Code', <EditableScalarField disabled={readOnly || fieldResults['identity.taxCode']?.managerReviewStatus === 'ACCEPTED'} label="Tax Code" fieldKey="identity.taxCode" fieldResult={fieldResults['identity.taxCode']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.website', 'Website', <EditableScalarField disabled={readOnly || fieldResults['contact.website']?.managerReviewStatus === 'ACCEPTED'} label="Website" fieldKey="contact.website" fieldResult={fieldResults['contact.website']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.address', 'Address', <EditableScalarField disabled={readOnly || fieldResults['contact.address']?.managerReviewStatus === 'ACCEPTED'} label="Address" fieldKey="contact.address" type="textarea" fieldResult={fieldResults['contact.address']} onChange={handleFieldChange} />, true)}
                {renderReviewField('contact.emails', 'Emails', <EditableListField disabled={readOnly || fieldResults['contact.emails']?.managerReviewStatus === 'ACCEPTED'} label="Emails" fieldKey="contact.emails" fieldResult={fieldResults['contact.emails']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.phones', 'Phones', <EditableListField disabled={readOnly || fieldResults['contact.phones']?.managerReviewStatus === 'ACCEPTED'} label="Phones" fieldKey="contact.phones" fieldResult={fieldResults['contact.phones']} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeTab === 'Business' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.businessModel', 'Business Model', <EditableScalarField disabled={readOnly || fieldResults['business.businessModel']?.managerReviewStatus === 'ACCEPTED'} label="Business Model" fieldKey="business.businessModel" type="textarea" fieldResult={fieldResults['business.businessModel']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.industries', 'Industries', <EditableListField disabled={readOnly || fieldResults['business.industries']?.managerReviewStatus === 'ACCEPTED'} label="Industries" fieldKey="business.industries" fieldResult={fieldResults['business.industries']} onChange={handleFieldChange} />, true)}
                {renderReviewField('companySize.employeeTier', 'Employee Tier', <EditableScalarField disabled={readOnly || fieldResults['companySize.employeeTier']?.managerReviewStatus === 'ACCEPTED'} label="Employee Tier" fieldKey="companySize.employeeTier" fieldResult={fieldResults['companySize.employeeTier']} onChange={handleFieldChange} />)}
                {renderReviewField('companySize.employeeCount', 'Employee Count', <EditableScalarField disabled={readOnly || fieldResults['companySize.employeeCount']?.managerReviewStatus === 'ACCEPTED'} label="Employee Count" type="number" fieldKey="companySize.employeeCount" fieldResult={fieldResults["companySize.employeeCount"]} onChange={handleFieldChange} />)}
                {renderReviewField('companySize.revenueTier', 'Revenue Tier', <EditableScalarField disabled={readOnly || fieldResults['companySize.revenueTier']?.managerReviewStatus === 'ACCEPTED'} label="Revenue Tier" fieldKey="companySize.revenueTier" fieldResult={fieldResults["companySize.revenueTier"]} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeTab === 'Markets' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.markets', 'Markets (Regions)', <EditableListField disabled={readOnly || fieldResults['business.markets']?.managerReviewStatus === 'ACCEPTED'} label="Markets (Regions)" fieldKey="business.markets" fieldResult={fieldResults['business.markets']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.targetCustomers', 'Target Customers', <EditableListField disabled={readOnly || fieldResults['business.targetCustomers']?.managerReviewStatus === 'ACCEPTED'} label="Target Customers" fieldKey="business.targetCustomers" fieldResult={fieldResults['business.targetCustomers']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {activeTab === 'Products' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.products', 'Products & Services', <EditableProductList disabled={readOnly || fieldResults['business.products']?.managerReviewStatus === 'ACCEPTED'} label="Products & Services" fieldKey="business.products" fieldResult={fieldResults['business.products']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {activeTab === 'SWOT' && (
              <div className={styles.fieldGrid}>
                {TAB_FIELD_GROUPS.SWOT.some((field) => shouldShowField(field.key, field.label)) && (
                  <div className={styles.fieldGridFull}>
                    <SwotGrid 
                      strengths={fieldResults['insights.strengths']}
                      weaknesses={fieldResults['insights.weaknesses']}
                      opportunities={fieldResults['insights.opportunities']}
                      threats={fieldResults['insights.threats']}
                      onChange={handleFieldChange}
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Analysis' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('financial', 'Financial', <EditableObjectField 
                    disabled={readOnly || fieldResults['financial']?.managerReviewStatus === 'ACCEPTED'} 
                    label="Financial" 
                    fieldKey="financial" 
                    fieldResult={fieldResults['financial']} 
                    onChange={handleFieldChange}
                    schema={[
                      { key: 'revenue', label: 'Revenue', type: 'number' },
                      { key: 'revenueCurrency', label: 'Revenue Currency', type: 'string' },
                      { key: 'revenueGrowth', label: 'Revenue Growth', type: 'number' },
                      { key: 'profitMargin', label: 'Profit Margin', type: 'number' },
                      { key: 'debtRatio', label: 'Debt Ratio', type: 'number' },
                      { key: 'fundingStage', label: 'Funding Stage', type: 'string' },
                      { key: 'profitability', label: 'Profitability', type: 'string' },
                    ]}
                  />, true)}
                {renderReviewField('innovation', 'Innovation', <EditableObjectField 
                    disabled={readOnly || fieldResults['innovation']?.managerReviewStatus === 'ACCEPTED'} 
                    label="Innovation" 
                    fieldKey="innovation" 
                    fieldResult={fieldResults['innovation']} 
                    onChange={handleFieldChange}
                    schema={[
                      { key: 'patents', label: 'Patents', type: 'number' },
                      { key: 'rdInvestmentPercent', label: 'R&D Investment (%)', type: 'number' },
                      { key: 'techStack', label: 'Tech Stack', type: 'list' },
                      { key: 'technologyCapabilities', label: 'Capabilities', type: 'list' },
                      { key: 'techMaturityLevel', label: 'Maturity Level', type: 'number' },
                      { key: 'productInnovationRate', label: 'Innovation Rate', type: 'number' },
                    ]}
                  />, true)}
                {renderReviewField('market', 'Market Analysis', <EditableObjectField 
                    disabled={readOnly || fieldResults['market']?.managerReviewStatus === 'ACCEPTED'} 
                    label="Market Analysis" 
                    fieldKey="market" 
                    fieldResult={fieldResults['market']} 
                    onChange={handleFieldChange}
                    schema={[
                      { key: 'marketShare', label: 'Market Share (%)', type: 'number' },
                      { key: 'brandRank', label: 'Brand Rank', type: 'number' },
                      { key: 'clientCount', label: 'Client Count', type: 'number' },
                      { key: 'mainMarkets', label: 'Main Markets', type: 'list' },
                    ]}
                  />, true)}
                {renderReviewField('risk', 'Risk', <EditableObjectField 
                  disabled={readOnly || fieldResults['risk']?.managerReviewStatus === 'ACCEPTED'} 
                  label="Risk" 
                  fieldKey="risk" 
                  fieldResult={fieldResults['risk']} 
                  onChange={handleFieldChange}
                  schema={[
                    { key: 'overallRiskLevel', label: 'Overall Risk Level', type: 'string' },
                    { key: 'financialRisk', label: 'Financial Risk', type: 'textarea' },
                    { key: 'legalRisk', label: 'Legal Risk', type: 'textarea' },
                    { key: 'reputationRisk', label: 'Reputation Risk', type: 'textarea' },
                    { key: 'securityRisk', label: 'Security Risk', type: 'textarea' },
                    { key: 'supplyInterruptionRisk', label: 'Supply Risk', type: 'textarea' },
                    { key: 'dependencyRisk', label: 'Dependency Risk', type: 'textarea' },
                  ]}
                />, true)}
                {renderReviewField('compliance', 'Compliance', <EditableObjectField 
                  disabled={readOnly || fieldResults['compliance']?.managerReviewStatus === 'ACCEPTED'} 
                  label="Compliance" 
                  fieldKey="compliance" 
                  fieldResult={fieldResults['compliance']} 
                  onChange={handleFieldChange}
                  schema={[
                    { key: 'status', label: 'Status', type: 'string' },
                    { key: 'qualityCertifications', label: 'Quality Certifications', type: 'list' },
                    { key: 'securityCertifications', label: 'Security Certifications', type: 'list' },
                    { key: 'antiCorruptionPolicy', label: 'Anti-Corruption Policy', type: 'textarea' },
                    { key: 'laborCompliance', label: 'Labor Compliance', type: 'textarea' },
                    { key: 'environmentalPolicy', label: 'Environmental Policy', type: 'textarea' },
                  ]}
                />, true)}
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
                <span>{resolvedFields} / {totalFields} confirmed</span>
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
                <strong>{confirmedFields}</strong>
              </div>
              
              <div className={styles.staffReviewStat}>
                <span>
                  <i className={styles.dotEdited}></i>
                  Edited
                </span>
                <strong>{editedFields}</strong>
              </div>
              
              <div className={styles.staffReviewStat}>
                <span>
                  <i className={styles.dotPending}></i>
                  Pending
                </span>
                <strong>{pendingFields}</strong>
              </div>

              {issueFields > 0 && (
                <div className={`${styles.staffReviewStat} ${styles.staffReviewWarning}`}>
                  <span>
                    <AlertCircle size={14} />
                    Validation Issues
                  </span>
                  <strong>{issueFields}</strong>
                </div>
              )}

              {lowConfidenceFields > 0 && (
                <div className={`${styles.staffReviewStat} ${styles.staffReviewCaution}`}>
                  <span>
                    <AlertCircle size={14} />
                    Low Confidence
                  </span>
                  <strong>{lowConfidenceFields}</strong>
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
                  : `${pendingFields} field${pendingFields !== 1 ? 's' : ''} still need confirmation.`}
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
            {isSubmitEnabled ? '✓ Ready to submit' : `${resolvedFields} / ${totalFields} resolved`}
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

          {unsavedCount === 0 && onSubmit && (
            <button 
              className={styles.btnSubmit} 
              onClick={onSubmit} 
              disabled={!isSubmitEnabled || submitLoading}
              title={isSubmitEnabled ? "Submit to Manager" : `${pendingFields} field${pendingFields !== 1 ? 's' : ''} still require confirmation`}
            >
              {submitLoading ? 'Submitting...' : (serverCandidate.status === 'REVISION_REQUIRED' ? 'Resubmit for Review' : 'Submit for Review')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
