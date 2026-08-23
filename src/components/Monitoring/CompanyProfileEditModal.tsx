import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, ChevronLeft, Edit3, Check, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';
import type { ProfileResponse } from '../../types/domain';
import styles from './CompanyProfileEditModal.module.css';

interface CompanyProfileEditModalProps {
  assignmentId: number;
  companyProfileId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewField = ({ label, value, onSave, renderInput, renderDisplay, isList = false }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [edited, setEdited] = useState(false);
  const inputRef = React.useRef<any>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  const handleSaveClick = () => {
    let finalDraft = draft;
    if (isList && inputRef.current && inputRef.current.value) {
        const val = inputRef.current.value.trim();
        if (val && !draft.includes(val)) {
            finalDraft = [...draft, val];
        }
    }
    onSave(finalDraft);
    setEdited(true);
    setIsEditing(false);
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', background: '#fff', width: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{label}</span>
        {edited && !isEditing && <span style={{ fontSize: '0.7rem', color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Edited</span>}
      </div>
      <div style={{ padding: '16px' }}>
        {isEditing ? (
          <div>
            {renderInput(draft, setDraft, inputRef)}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setDraft(value); setIsEditing(false); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <X size={14} /> Cancel
              </button>
              <button type="button" onClick={handleSaveClick} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>{renderDisplay(value)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
              <button type="button" onClick={() => { setDraft(value); setIsEditing(true); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <Edit3 size={14} /> Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CompanyProfileEditModal: React.FC<CompanyProfileEditModalProps> = ({
  assignmentId,
  companyProfileId,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  
  // Form State
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [address, setAddress] = useState('');
  const [foundedDate, setFoundedDate] = useState('');
  const [relationship, setRelationship] = useState('Partner');

  // Business Fields
  const [products, setProducts] = useState<Array<{ name: string; category: string; description: string }>>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [targetCustomers, setTargetCustomers] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get<ProfileResponse>(`/company-profiles/${companyProfileId}`);
        const p = response.data;
        setProfile(p);
        
        setTradeName(p.identity?.tradeName || '');
        setLegalName(p.identity?.legalName || '');
        setTaxCode(p.identity?.taxCode || '');
        setRegistrationNo(p.identity?.registrationNumber || '');
        setWebsite(p.contact?.website || '');
        setEmail(p.contact?.emails?.[0] || '');
        setPhone(p.contact?.phones?.[0] || '');
        setCompanySize(p.companySize?.employeeTier || '');
        setAddress(p.contact?.addresses?.[0]?.fullAddress || '');
        setFoundedDate(p.identity?.foundedDate || '');

        setProducts(p.business?.products?.map(prod => ({
            name: prod.name || '',
            category: prod.category || '',
            description: prod.description || ''
        })) || []);
        setMarkets(p.business?.markets || []);
        setTargetCustomers(p.business?.targetCustomers || []);
        setIndustries(p.business?.industries || []);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [companyProfileId]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const proposalPayload = {
        companyProfileId,
        changeSummary: 'Update profile from the Supervising Staff member.',
        sourceDocumentIds: [],
        proposedIdentity: {
          tradeName,
          legalName,
          taxCode,
          registrationNumber: registrationNo,
          foundedDate
        },
        proposedContact: {
          website,
          emails: [email],
          phones: [phone],
          addresses: [{ fullAddress: address }]
        },
        proposedCompanySize: {
          employeeTier: companySize
        },
        proposedRelationship: relationship,
        proposedBusiness: {
          products,
          markets,
          targetCustomers,
          industries
        }
      };

      const proposalResponse = await api.post('/profile-update-proposals/monitoring', proposalPayload);
      const updateProposalId = proposalResponse.data.id;

      await companyMonitoringApi.submitReview(assignmentId, {
        result: 'UPDATE_PROPOSED',
        note: 'Proposed changing Profile and Relationship to:' + relationship,
        updateProposalId
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.overlay}><div className={styles.loader}>Đang tải...</div></div>;

  const renderStringDisplay = (val: string) => <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>{val || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}</span>;
  const renderStringInput = (draft: string, setDraft: any) => <input className={styles.input} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} value={draft} onChange={e => setDraft(e.target.value)} />;
  
  const renderTagsDisplay = (tags: string[]) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {tags.length > 0 ? tags.map((t, i) => (
        <span key={i} style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{t}</span>
      )) : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>No tags</span>}
    </div>
  );
  const renderTagsInput = (draft: string[], setDraft: any, inputRef: any) => {
    const handleRemove = (idx: number) => setDraft(draft.filter((_, i) => i !== idx));
    const handleAdd = (e: any) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !draft.includes(val)) {
                setDraft([...draft, val]);
                e.target.value = '';
            }
        }
    };
    return (
        <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {draft.map((t, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {t} <button type="button" onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                    </span>
                ))}
            </div>
            <input ref={inputRef} type="text" placeholder="+ Add item (press Enter)" onKeyDown={handleAdd} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
        </div>
    );
  };

  const renderProductsDisplay = (prods: any[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {prods.length > 0 ? prods.map((p, idx) => (
        <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{p.name || 'Unnamed'}</strong>
                {p.category && <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{p.category}</span>}
            </div>
            {p.description && <div style={{ fontSize: '0.8rem', color: '#475569' }}>{p.description}</div>}
        </div>
      )) : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>No products</span>}
    </div>
  );

  const renderProductsInput = (draft: any[], setDraft: any) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {draft.map((p, idx) => (
                <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input placeholder="Name" value={p.name} onChange={e => { const nd = [...draft]; nd[idx].name = e.target.value; setDraft(nd); }} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        <input placeholder="Category" value={p.category} onChange={e => { const nd = [...draft]; nd[idx].category = e.target.value; setDraft(nd); }} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                    </div>
                    <textarea placeholder="Description" rows={2} value={p.description} onChange={e => { const nd = [...draft]; nd[idx].description = e.target.value; setDraft(nd); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit' }} />
                    <button type="button" onClick={() => setDraft(draft.filter((_, i) => i !== idx))} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Trash2 size={14} /> Remove
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => setDraft([...draft, { name: '', category: '', description: '' }])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={14} /> Add Product
            </button>
        </div>
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onClose}><ChevronLeft size={20} /> Back</button>
          <div className={styles.headerTitle}>Review & Propose Profile Updates / {profile?.identity?.tradeName || 'Company'}</div>
          <button className={styles.closeButton} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.content}>
          <div className={styles.topSection}>
            <div className={styles.logoBox}>{tradeName.substring(0, 2).toUpperCase() || 'CP'}</div>
            <div className={styles.titleArea}>
              <h2>{tradeName || 'Tên Công Ty'}</h2>
              <div className={styles.relationshipSelect}>
                <select value={relationship} onChange={e => setRelationship(e.target.value)}>
                  <option value="Partner">Partner</option>
                  <option value="Competitor">Competitor</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Customer">Customer</option>
                  <option value="Potential Partner">Potential Partner</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <ReviewField label="Trade Name" value={tradeName} onSave={setTradeName} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Legal Name" value={legalName} onSave={setLegalName} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Tax Code" value={taxCode} onSave={setTaxCode} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            
            <ReviewField label="Website" value={website} onSave={setWebsite} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Contact Email" value={email} onSave={setEmail} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Phone" value={phone} onSave={setPhone} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Head Office Address" value={address} onSave={setAddress} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />
            <ReviewField label="Company Size" value={companySize} onSave={setCompanySize} renderInput={renderStringInput} renderDisplay={renderStringDisplay} />

            <ReviewField label="Industry" value={industries} onSave={setIndustries} renderInput={renderTagsInput} renderDisplay={renderTagsDisplay} isList />
            <ReviewField label="Markets (Regions)" value={markets} onSave={setMarkets} renderInput={renderTagsInput} renderDisplay={renderTagsDisplay} isList />
            <ReviewField label="Target Customers" value={targetCustomers} onSave={setTargetCustomers} renderInput={renderTagsInput} renderDisplay={renderTagsDisplay} isList />
            
            <ReviewField label="Products & Services" value={products} onSave={setProducts} renderInput={renderProductsInput} renderDisplay={renderProductsDisplay} isList />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button className={styles.submitButton} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : <><Save size={16} /> Submit Proposal</>}
          </button>
        </div>
      </div>
    </div>
  );
};
