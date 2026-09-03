import React, { useState, useEffect, useMemo } from 'react';
import type { ProfileResponse, UpdateCompanyProfileRequest, CompanyProfileMember } from '../../types/domain';
import { companyProfileApi } from '../../API/companyProfileApi';

interface ProfileEditModalProps {
  profile: ProfileResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ProfileResponse) => void;
}

type EditTab = 'overview' | 'business' | 'leadership';

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<EditTab>('overview');

  // Form states
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [phonesText, setPhonesText] = useState('');
  const [headOfficeAddress, setHeadOfficeAddress] = useState('');
  const [employeeCount, setEmployeeCount] = useState<string>('');
  const [employeeTier, setEmployeeTier] = useState('');
  const [revenueTier, setRevenueTier] = useState('');

  const [industriesText, setIndustriesText] = useState('');
  const [marketsText, setMarketsText] = useState('');
  const [targetCustomersText, setTargetCustomersText] = useState('');
  const [productsText, setProductsText] = useState('');
  const [businessModel, setBusinessModel] = useState('');

  const [members, setMembers] = useState<CompanyProfileMember[]>([]);

  // Confirmation & submission state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noChangesWarning, setNoChangesWarning] = useState(false);
  const [openedMajorVersion, setOpenedMajorVersion] = useState<number>(1);
  const [openedRevision, setOpenedRevision] = useState<number>(0);

  // Initialize draft when modal opens or profile changes
  useEffect(() => {
    if (!isOpen || !profile) return;

    // Capture the exact opened version from the loaded official profile
    const major = profile.majorVersion ?? (profile.version ? parseInt(profile.version.split('.')[0].replace(/\D/g, ''), 10) || 1 : 1);
    const rev = profile.revision ?? (profile.version && profile.version.includes('.') ? parseInt(profile.version.split('.')[1], 10) || 0 : 0);
    setOpenedMajorVersion(major);
    setOpenedRevision(rev);

    setLegalName(profile.identity?.legalName || '');
    setTradeName(profile.identity?.tradeName || '');
    setTaxCode(profile.identity?.taxCode || '');
    setRegistrationNumber(profile.identity?.registrationNumber || '');

    setWebsite(profile.contact?.website || '');
    setEmailsText((profile.contact?.emails || []).join(', '));
    setPhonesText((profile.contact?.phones || []).join(', '));
    setHeadOfficeAddress(profile.contact?.addresses?.[0]?.fullAddress || '');

    setEmployeeCount(profile.companySize?.employeeCount != null ? String(profile.companySize.employeeCount) : '');
    setEmployeeTier(profile.companySize?.employeeTier || '');
    setRevenueTier(profile.companySize?.revenueTier || '');

    setIndustriesText((profile.business?.industries || []).join(', '));
    setMarketsText((profile.business?.markets || []).join(', '));
    setTargetCustomersText((profile.business?.targetCustomers || []).join(', '));
    const prodNames = (profile.business?.products || []).map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
    setProductsText(prodNames.join(', '));
    setBusinessModel(profile.business?.businessModel || '');

    setMembers(profile.companyMembers ? JSON.parse(JSON.stringify(profile.companyMembers)) : []);

    setShowConfirmModal(false);
    setChangeNote('');
    setErrorMsg(null);
    setNoChangesWarning(false);
  }, [isOpen, profile]);

  // Compute parsed lists
  const parsedEmails = useMemo(() => emailsText.split(',').map(s => s.trim()).filter(Boolean), [emailsText]);
  const parsedPhones = useMemo(() => phonesText.split(',').map(s => s.trim()).filter(Boolean), [phonesText]);
  const parsedIndustries = useMemo(() => industriesText.split(',').map(s => s.trim()).filter(Boolean), [industriesText]);
  const parsedMarkets = useMemo(() => marketsText.split(',').map(s => s.trim()).filter(Boolean), [marketsText]);
  const parsedTargetCustomers = useMemo(() => targetCustomersText.split(',').map(s => s.trim()).filter(Boolean), [targetCustomersText]);
  const parsedProducts = useMemo(() => productsText.split(',').map(s => s.trim()).filter(Boolean), [productsText]);

  // Calculate detected changes
  const changedFieldNames = useMemo(() => {
    if (!profile) return [];
    const changes: string[] = [];

    if (legalName !== (profile.identity?.legalName || '')) changes.push('Legal Name');
    if (tradeName !== (profile.identity?.tradeName || '')) changes.push('Trade Name');
    if (taxCode !== (profile.identity?.taxCode || '')) changes.push('Tax Code');
    if (registrationNumber !== (profile.identity?.registrationNumber || '')) changes.push('Registration Number');

    if (website !== (profile.contact?.website || '')) changes.push('Website');
    if (JSON.stringify(parsedEmails) !== JSON.stringify(profile.contact?.emails || [])) changes.push('Emails');
    if (JSON.stringify(parsedPhones) !== JSON.stringify(profile.contact?.phones || [])) changes.push('Phones');
    if (headOfficeAddress !== (profile.contact?.addresses?.[0]?.fullAddress || '')) changes.push('Head Office Address');

    const origEmpCount = profile.companySize?.employeeCount != null ? String(profile.companySize.employeeCount) : '';
    if (employeeCount !== origEmpCount) changes.push('Employee Count');
    if (employeeTier !== (profile.companySize?.employeeTier || '')) changes.push('Employee Tier');
    if (revenueTier !== (profile.companySize?.revenueTier || '')) changes.push('Revenue Tier');

    if (JSON.stringify(parsedIndustries) !== JSON.stringify(profile.business?.industries || [])) changes.push('Industries');
    if (JSON.stringify(parsedMarkets) !== JSON.stringify(profile.business?.markets || [])) changes.push('Markets');
    if (JSON.stringify(parsedTargetCustomers) !== JSON.stringify(profile.business?.targetCustomers || [])) changes.push('Target Customers');
    
    const origProds = (profile.business?.products || []).map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
    if (JSON.stringify(parsedProducts) !== JSON.stringify(origProds)) changes.push('Products & Services');
    if (businessModel !== (profile.business?.businessModel || '')) changes.push('Business Model');

    const origMembers = profile.companyMembers || [];
    if (JSON.stringify(members) !== JSON.stringify(origMembers)) changes.push('Company Members');

    return changes;
  }, [
    profile, legalName, tradeName, taxCode, registrationNumber, website,
    parsedEmails, parsedPhones, headOfficeAddress, employeeCount, employeeTier, revenueTier,
    parsedIndustries, parsedMarkets, parsedTargetCustomers, parsedProducts, businessModel, members
  ]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    setMembers([...members, { fullName: '', position: '' }]);
  };

  const handleMemberChange = (index: number, field: keyof CompanyProfileMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleInitialSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (changedFieldNames.length === 0) {
      setNoChangesWarning(true);
      return;
    }
    setNoChangesWarning(false);
    setErrorMsg(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const targetId = profile.companyId || profile.id;
    const payload: UpdateCompanyProfileRequest = {
      legalName,
      tradeName,
      taxCode,
      registrationNumber,
      website,
      emails: parsedEmails,
      phones: parsedPhones,
      headOfficeAddress,
      employeeCount: employeeCount ? parseInt(employeeCount, 10) : undefined,
      employeeTier: employeeTier || undefined,
      revenueTier: revenueTier || undefined,
      industries: parsedIndustries,
      markets: parsedMarkets,
      targetCustomers: parsedTargetCustomers,
      productsServices: parsedProducts,
      businessModel: businessModel || undefined,
      companyMembers: members.filter(m => m.fullName && m.fullName.trim()),
      expectedMajorVersion: openedMajorVersion,
      expectedRevision: openedRevision,
      changeNote: changeNote.trim() || undefined,
    };

    try {
      const updated = await companyProfileApi.updateCompanyProfile(targetId, payload);
      setShowConfirmModal(false);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update company profile:', err);
      if (err.status === 409 || err.message?.includes('changed since you opened it')) {
        setErrorMsg('The company profile has changed since you opened it. Please refresh before saving.');
      } else if (err.status === 403 || err.message?.includes('responsible') || err.message?.includes('permission')) {
        setErrorMsg(err.message || 'You are not responsible for this company profile.');
      } else {
        setErrorMsg(err.message || 'Failed to update company profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentVersionStr = profile.versionLabel || `v${openedMajorVersion}.${String(openedRevision).padStart(2, '0')}`;
  const nextRevisionStr = `v${openedMajorVersion}.${String(openedRevision + 1).padStart(2, '0')}`;

  return (
    <div style={overlayStyle}>
      <div style={modalContainerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Edit Company Profile
              </h2>
              <span style={versionBadgeStyle}>
                Current: {currentVersionStr}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Directly edit official profile data. Saving will increment revision to <strong>{nextRevisionStr}</strong>.
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div style={tabBarStyle}>
          <button
            type="button"
            style={activeTab === 'overview' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Contact
          </button>
          <button
            type="button"
            style={activeTab === 'business' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('business')}
          >
            Business & Market
          </button>
          <button
            type="button"
            style={activeTab === 'leadership' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('leadership')}
          >
            Leadership ({members.length})
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleInitialSaveClick} style={bodyStyle}>
          {noChangesWarning && (
            <div style={alertWarningStyle}>
              ⚠️ No changes detected. Please modify at least one field to save a new revision.
            </div>
          )}

          {errorMsg && !showConfirmModal && (
            <div style={alertErrorStyle}>
              ❌ {errorMsg}
            </div>
          )}

          {/* TAB 1: OVERVIEW & CONTACT */}
          {activeTab === 'overview' && (
            <div style={gridTwoCol}>
              <div style={formGroup}>
                <label style={labelStyle}>Trade Name / Brand Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  placeholder="e.g. FPT Software"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Legal Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="e.g. Công ty TNHH Phần mềm FPT"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Tax Code</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={taxCode}
                  onChange={e => setTaxCode(e.target.value)}
                  placeholder="e.g. 0101234567"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Registration Number</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={registrationNumber}
                  onChange={e => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. 0101234567"
                />
              </div>

              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Head Office Address</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={headOfficeAddress}
                  onChange={e => setHeadOfficeAddress(e.target.value)}
                  placeholder="e.g. FPT Tower, 10 Pham Van Bach, Cau Giay, Hanoi"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Website URL</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Email Addresses (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={emailsText}
                  onChange={e => setEmailsText(e.target.value)}
                  placeholder="contact@company.com, info@company.com"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Phone Numbers (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={phonesText}
                  onChange={e => setPhonesText(e.target.value)}
                  placeholder="+84 24 1234 5678"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Employee Count</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={employeeCount}
                  onChange={e => setEmployeeCount(e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Employee Tier</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={employeeTier}
                  onChange={e => setEmployeeTier(e.target.value)}
                  placeholder="e.g. 100-500 personnel"
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Revenue Tier</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={revenueTier}
                  onChange={e => setRevenueTier(e.target.value)}
                  placeholder="e.g. $10M - $50M"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS & MARKET */}
          {activeTab === 'business' && (
            <div style={gridTwoCol}>
              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Industries (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={industriesText}
                  onChange={e => setIndustriesText(e.target.value)}
                  placeholder="Information Technology, Software Development, Cloud Computing"
                />
              </div>

              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Active Markets (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={marketsText}
                  onChange={e => setMarketsText(e.target.value)}
                  placeholder="Vietnam, Japan, United States, Europe"
                />
              </div>

              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Target Customers (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={targetCustomersText}
                  onChange={e => setTargetCustomersText(e.target.value)}
                  placeholder="Enterprises, Financial Institutions, Healthcare"
                />
              </div>

              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Products & Services (comma-separated)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={productsText}
                  onChange={e => setProductsText(e.target.value)}
                  placeholder="Digital Transformation Consulting, Custom Software, AI Solutions"
                />
              </div>

              <div style={{ ...formGroup, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Business Model & Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={businessModel}
                  onChange={e => setBusinessModel(e.target.value)}
                  placeholder="Describe the company's business model, key offerings, and value proposition..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: LEADERSHIP */}
          {activeTab === 'leadership' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Key Executives & Board Members</span>
                <button
                  type="button"
                  onClick={handleAddMember}
                  style={secondaryBtnStyle}
                >
                  + Add Executive
                </button>
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: '#F8FAFC', borderRadius: '8px', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No leadership members recorded. Click "+ Add Executive" to add one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map((member, idx) => (
                    <div key={idx} style={memberRowStyle}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          style={inputStyle}
                          value={member.fullName || ''}
                          onChange={e => handleMemberChange(idx, 'fullName', e.target.value)}
                          placeholder="Full Name (e.g. Nguyen Van A)"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          style={inputStyle}
                          value={member.position || ''}
                          onChange={e => handleMemberChange(idx, 'position', e.target.value)}
                          placeholder="Position (e.g. CEO / General Director)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        style={removeBtnStyle}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div style={footerStyle}>
            <div style={{ fontSize: '0.8rem', color: changedFieldNames.length > 0 ? '#1D4ED8' : '#94A3B8', fontWeight: 600 }}>
              {changedFieldNames.length > 0
                ? `${changedFieldNames.length} field${changedFieldNames.length > 1 ? 's' : ''} modified`
                : 'No changes'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={saveBtnStyle}
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>

        {/* Save Confirmation Sub-Modal */}
        {showConfirmModal && (
          <div style={confirmOverlayStyle}>
            <div style={confirmModalStyle}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                Save Profile Changes
              </h3>

              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                You have modified <strong>{changedFieldNames.length} field{changedFieldNames.length > 1 ? 's' : ''}</strong>:
              </p>

              <div style={changesBadgeListStyle}>
                {changedFieldNames.map((name, i) => (
                  <span key={i} style={changeBadgeStyle}>{name}</span>
                ))}
              </div>

              <p style={{ margin: '12px 0 6px 0', fontSize: '0.8rem', color: '#64748B' }}>
                This will increment official profile version to <strong>{nextRevisionStr}</strong>.
              </p>

              <div style={{ margin: '10px 0 16px 0' }}>
                <label style={labelStyle}>Change Note (optional explanation)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                  placeholder="e.g. Verified and updated official contact info with CEO office."
                />
              </div>

              {errorMsg && (
                <div style={{ ...alertErrorStyle, marginBottom: '12px' }}>
                  ❌ {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  style={cancelBtnStyle}
                >
                  Back to Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSubmitting}
                  style={saveBtnStyle}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '16px',
};

const modalContainerStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '780px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  position: 'relative',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  background: '#F8FAFC',
};

const versionBadgeStyle: React.CSSProperties = {
  background: '#EFF6FF',
  border: '1px solid #BFDBFE',
  color: '#1D4ED8',
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '999px',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  color: '#64748B',
  cursor: 'pointer',
  padding: '4px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #E2E8F0',
  padding: '0 20px',
  background: '#FFFFFF',
};

const activeTabStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid #2563EB',
  color: '#2563EB',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const inactiveTabStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'none',
  border: 'none',
  color: '#64748B',
  fontWeight: 500,
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const bodyStyle: React.CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

const gridTwoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
};

const formGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.85rem',
  color: '#0F172A',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  background: '#F8FAFC',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #E2E8F0',
};

const removeBtnStyle: React.CSSProperties = {
  background: '#FEE2E2',
  border: '1px solid #FECACA',
  color: '#DC2626',
  borderRadius: '6px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.8rem',
};

const footerStyle: React.CSSProperties = {
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#475569',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '6px',
  border: 'none',
  background: '#2563EB',
  color: '#FFFFFF',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '6px',
  border: '1px solid #BFDBFE',
  background: '#EFF6FF',
  color: '#1D4ED8',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const alertWarningStyle: React.CSSProperties = {
  background: '#FEF3C7',
  border: '1px solid #FDE68A',
  color: '#92400E',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '0.85rem',
  marginBottom: '14px',
};

const alertErrorStyle: React.CSSProperties = {
  background: '#FEE2E2',
  border: '1px solid #FECACA',
  color: '#DC2626',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '0.85rem',
  marginBottom: '14px',
};

const confirmOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(15, 23, 42, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: '20px',
};

const confirmModalStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '10px',
  padding: '20px',
  maxWidth: '480px',
  width: '100%',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
};

const changesBadgeListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  maxHeight: '100px',
  overflowY: 'auto',
  background: '#F8FAFC',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #E2E8F0',
};

const changeBadgeStyle: React.CSSProperties = {
  background: '#E0E7FF',
  color: '#4338CA',
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '4px',
};
