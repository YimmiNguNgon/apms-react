import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, Save, ChevronLeft } from 'lucide-react';
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

      // Submit Proposal
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
        proposedRelationship: relationship
      };

      const proposalResponse = await api.post('/profile-update-proposals/monitoring', proposalPayload);
      const updateProposalId = proposalResponse.data.id;

      // Submit Review
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

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onClose}><ChevronLeft size={20} /> Back</button>
          <div className={styles.headerTitle}>Edit Company Profile / {profile?.identity?.tradeName || 'Company'}</div>
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

          <div className={styles.cardSection}>
            <h3>Legal & Identity Information</h3>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Trade Name</label>
                <input value={tradeName} onChange={e => setTradeName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Legal Name</label>
                <input value={legalName} onChange={e => setLegalName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Tax Code</label>
                <input value={taxCode} onChange={e => setTaxCode(e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.cardSection}>
            <h3>Contact & Size Information</h3>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Website</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Contact Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Company Size</label>
                <input value={companySize} onChange={e => setCompanySize(e.target.value)} />
              </div>
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <label>Head Office Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
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
