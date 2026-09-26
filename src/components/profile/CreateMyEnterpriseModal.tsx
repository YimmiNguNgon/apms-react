import React, { useState } from 'react';
import { Building2, X, AlertCircle, Loader2 } from 'lucide-react';
import type { CreateOwnerEnterpriseRequest, ProfileResponse } from '../../types/domain';
import { companyProfileApi } from '../../API/companyProfileApi';

interface CreateMyEnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: ProfileResponse) => void;
}

type TabKey = 'identity' | 'contact' | 'description' | 'business';

export const CreateMyEnterpriseModal: React.FC<CreateMyEnterpriseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('identity');

  // Form fields
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [stockTicker, setStockTicker] = useState('');
  const [stockExchange, setStockExchange] = useState('');

  const [website, setWebsite] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [phonesText, setPhonesText] = useState('');
  const [address, setAddress] = useState('');
  const [foundedYear, setFoundedYear] = useState<string>('');
  const [employeeCount, setEmployeeCount] = useState<string>('');
  const [employeeTier, setEmployeeTier] = useState('');
  const [revenueTier, setRevenueTier] = useState('');

  const [companyDescription, setCompanyDescription] = useState('');
  const [businessModel, setBusinessModel] = useState('');

  const [industriesText, setIndustriesText] = useState('');
  const [productsText, setProductsText] = useState('');
  const [marketsText, setMarketsText] = useState('');
  const [targetCustomersText, setTargetCustomersText] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const splitCommaList = (val: string): string[] => {
    return val
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!legalName.trim()) {
      errors.legalName = 'Legal name is required';
    }
    if (!tradeName.trim()) {
      errors.tradeName = 'Trade name is required';
    }
    if (!taxCode.trim()) {
      errors.taxCode = 'Tax code is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      setActiveTab('identity');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateOwnerEnterpriseRequest = {
        legalName: legalName.trim(),
        tradeName: tradeName.trim(),
        taxCode: taxCode.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        stockTicker: stockTicker.trim().toUpperCase() || undefined,
        stockExchange: stockExchange.trim().toUpperCase() || undefined,

        website: website.trim() || undefined,
        emails: splitCommaList(emailsText),
        phones: splitCommaList(phonesText),
        addresses: address.trim() ? [address.trim()] : undefined,
        address: address.trim() || undefined,

        foundedYear: foundedYear.trim() ? parseInt(foundedYear.trim(), 10) : undefined,
        employeeCount: employeeCount.trim() ? parseInt(employeeCount.trim(), 10) : undefined,
        employeeTier: employeeTier.trim() || undefined,
        revenueTier: revenueTier.trim() || undefined,

        companyDescription: companyDescription.trim() || undefined,
        businessModel: businessModel.trim() || undefined,

        industries: splitCommaList(industriesText),
        products: splitCommaList(productsText),
        markets: splitCommaList(marketsText),
        targetCustomers: splitCommaList(targetCustomersText),
      };

      const created = await companyProfileApi.createAdminMyEnterprise(payload);
      if (created) {
        onSuccess(created);
        onClose();
      } else {
        throw new Error('No response data received from the server.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while creating the enterprise profile.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalContainerStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={headerIconContainer}>
              <Building2 size={20} color="#2563EB" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                My Enterprise Setup
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Create the initial profile for your enterprise in APMS.
              </p>
            </div>
          </div>
          <button style={closeButtonStyle} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={tabBarStyle}>
          <button
            type="button"
            style={activeTab === 'identity' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('identity')}
          >
            Identity & Legal Information *
          </button>
          <button
            type="button"
            style={activeTab === 'contact' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('contact')}
          >
            Contact & Scale
          </button>
          <button
            type="button"
            style={activeTab === 'description' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('description')}
          >
            Introduction & Business Model
          </button>
          <button
            type="button"
            style={activeTab === 'business' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('business')}
          >
            Business Fields
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={errorBannerStyle}>
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={formContainerStyle}>
          <div style={scrollContentStyle}>
            {/* TAB: IDENTITY */}
            {activeTab === 'identity' && (
              <div style={tabContentStyle}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Legal Name <span style={requiredMark}>*</span>
                  </label>
                  <input
                    type="text"
                    style={{ ...inputStyle, ...(validationErrors.legalName ? inputErrorStyle : {}) }}
                    value={legalName}
                    onChange={(e) => {
                      setLegalName(e.target.value);
                      if (validationErrors.legalName) {
                        setValidationErrors((prev) => ({ ...prev, legalName: '' }));
                      }
                    }}
                    placeholder="e.g. APMS Technology and Communications JSC"
                  />
                  {validationErrors.legalName && (
                    <span style={errorTextStyle}>{validationErrors.legalName}</span>
                  )}
                </div>

                <div style={twoColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Trade Name <span style={requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      style={{ ...inputStyle, ...(validationErrors.tradeName ? inputErrorStyle : {}) }}
                      value={tradeName}
                      onChange={(e) => {
                        setTradeName(e.target.value);
                        if (validationErrors.tradeName) {
                          setValidationErrors((prev) => ({ ...prev, tradeName: '' }));
                        }
                      }}
                      placeholder="e.g. APMS Tech"
                    />
                    {validationErrors.tradeName && (
                      <span style={errorTextStyle}>{validationErrors.tradeName}</span>
                    )}
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Tax Code <span style={requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      style={{ ...inputStyle, ...(validationErrors.taxCode ? inputErrorStyle : {}) }}
                      value={taxCode}
                      onChange={(e) => {
                        setTaxCode(e.target.value);
                        if (validationErrors.taxCode) {
                          setValidationErrors((prev) => ({ ...prev, taxCode: '' }));
                        }
                      }}
                      placeholder="e.g. 0101234567"
                    />
                    {validationErrors.taxCode && (
                      <span style={errorTextStyle}>{validationErrors.taxCode}</span>
                    )}
                  </div>
                </div>

                <div style={threeColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Registration No.</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="0101234567"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Ticker</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={stockTicker}
                      onChange={(e) => setStockTicker(e.target.value)}
                      placeholder="e.g. APM"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Exchange</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={stockExchange}
                      onChange={(e) => setStockExchange(e.target.value)}
                      placeholder="HOSE / HNX / UPCoM"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONTACT & SCALE */}
            {activeTab === 'contact' && (
              <div style={tabContentStyle}>
                <div style={twoColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Website</label>
                    <input
                      type="url"
                      style={inputStyle}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Founded Year</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={foundedYear}
                      onChange={(e) => setFoundedYear(e.target.value)}
                      placeholder="2010"
                    />
                  </div>
                </div>

                <div style={twoColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Contact Emails</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={emailsText}
                      onChange={(e) => setEmailsText(e.target.value)}
                      placeholder="contact@enterprise.com, info@enterprise.com"
                    />
                    <span style={hintStyle}>Separate multiple emails with commas</span>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Phone Numbers</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={phonesText}
                      onChange={(e) => setPhonesText(e.target.value)}
                      placeholder="+84 24 1234 5678, +84 90 123 4567"
                    />
                    <span style={hintStyle}>Separate multiple numbers with commas</span>
                  </div>
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Headquarters Address</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 10 ABC Street, District 1, Ho Chi Minh City"
                  />
                </div>

                <div style={threeColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Number of Employees</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={employeeCount}
                      onChange={(e) => setEmployeeCount(e.target.value)}
                      placeholder="500"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Employee Scale (Tier)</label>
                    <select
                      style={selectStyle}
                      value={employeeTier}
                      onChange={(e) => setEmployeeTier(e.target.value)}
                    >
                      <option value="">-- Select Tier --</option>
                      <option value="1-50">1 - 50 employees</option>
                      <option value="51-200">51 - 200 employees</option>
                      <option value="201-1000">201 - 1,000 employees</option>
                      <option value="1001-5000">1,001 - 5,000 employees</option>
                      <option value="5000+">5,000+ employees</option>
                    </select>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Revenue Tier</label>
                    <select
                      style={selectStyle}
                      value={revenueTier}
                      onChange={(e) => setRevenueTier(e.target.value)}
                    >
                      <option value="">-- Select Tier --</option>
                      <option value="TIER_1">&lt; 10B VND</option>
                      <option value="TIER_2">10 - 50B VND</option>
                      <option value="TIER_3">50 - 200B VND</option>
                      <option value="TIER_4">200 - 1,000B VND</option>
                      <option value="TIER_5">&gt; 1,000B VND</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DESCRIPTION & MODEL */}
            {activeTab === 'description' && (
              <div style={tabContentStyle}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Company Description</label>
                  <textarea
                    rows={4}
                    style={textareaStyle}
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Brief summary of company history, mission, and key strengths..."
                  />
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Business Model</label>
                  <textarea
                    rows={3}
                    style={textareaStyle}
                    value={businessModel}
                    onChange={(e) => setBusinessModel(e.target.value)}
                    placeholder="e.g. B2B SaaS, IT Outsourcing, System Integration..."
                  />
                </div>
              </div>
            )}

            {/* TAB: BUSINESS FIELDS */}
            {activeTab === 'business' && (
              <div style={tabContentStyle}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Industries</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={industriesText}
                    onChange={(e) => setIndustriesText(e.target.value)}
                    placeholder="Information Technology, Telecommunications, Enterprise Software"
                  />
                  <span style={hintStyle}>Comma-separated list</span>
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Products & Services</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={productsText}
                    onChange={(e) => setProductsText(e.target.value)}
                    placeholder="Risk Management Platform, Digital Transformation Consulting, Cloud Services"
                  />
                  <span style={hintStyle}>Comma-separated list</span>
                </div>

                <div style={twoColRowStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Markets & Regions</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={marketsText}
                      onChange={(e) => setMarketsText(e.target.value)}
                      placeholder="Vietnam, Southeast Asia, Japan"
                    />
                    <span style={hintStyle}>Comma-separated</span>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Target Customers</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={targetCustomersText}
                      onChange={(e) => setTargetCustomersText(e.target.value)}
                      placeholder="Banking & Finance, Retail, Public Sector"
                    />
                    <span style={hintStyle}>Comma-separated</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={footerStyle}>
            <button
              type="button"
              style={cancelButtonStyle}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...submitButtonStyle,
                ...(isSubmitting ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />
                  Creating profile...
                </>
              ) : (
                'Create My Enterprise'
              )}
            </button>
          </div>
        </form>
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
  maxWidth: '740px',
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
  alignItems: 'center',
  background: '#F8FAFC',
};

const headerIconContainer: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: '#EFF6FF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748B',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #E2E8F0',
  padding: '0 16px',
  background: '#FFFFFF',
  overflowX: 'auto',
};

const activeTabStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid #2563EB',
  color: '#2563EB',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const inactiveTabStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#64748B',
  fontWeight: 500,
  fontSize: '0.85rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const errorBannerStyle: React.CSSProperties = {
  background: '#FEF2F2',
  borderBottom: '1px solid #FCA5A5',
  padding: '10px 20px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
};

const formContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
};

const scrollContentStyle: React.CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  maxHeight: 'calc(90vh - 180px)',
};

const tabContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flex: 1,
};

const twoColRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
};

const threeColRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.825rem',
  fontWeight: 600,
  color: '#334155',
};

const requiredMark: React.CSSProperties = {
  color: '#EF4444',
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.875rem',
  color: '#0F172A',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const inputErrorStyle: React.CSSProperties = {
  borderColor: '#EF4444',
  backgroundColor: '#FEF2F2',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#DC2626',
  marginTop: 2,
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#94A3B8',
  marginTop: 2,
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.875rem',
  color: '#0F172A',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#FFFFFF',
};

const textareaStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.875rem',
  color: '#0F172A',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const footerStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderTop: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  background: '#F8FAFC',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#475569',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: '6px',
  border: 'none',
  background: '#2563EB',
  color: '#FFFFFF',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
