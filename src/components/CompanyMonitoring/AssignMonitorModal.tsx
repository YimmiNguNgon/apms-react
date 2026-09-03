import React, { useState, useEffect, useRef, useMemo } from 'react';
import { accountApi } from '../../API/accountApi';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';
import type { CompanyMonitoringAssignmentResponse, ProfileResponse, MonitoringFrequency } from '../../types/domain';

interface StaffCandidate {
  id: number;
  email: string;
  name: string;
}

interface AssignMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedCompany: ProfileResponse | null;
  selectedAssignment: CompanyMonitoringAssignmentResponse | null;
}

export const AssignMonitorModal: React.FC<AssignMonitorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedCompany,
  selectedAssignment
}) => {
  const [form, setForm] = useState<{ assignedStaffId: string | number; frequency: MonitoringFrequency }>({
    assignedStaffId: '',
    frequency: 'MONTHLY'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ staff?: string; frequency?: string }>({});
  const [fieldTouched, setFieldTouched] = useState<{ staff?: boolean; frequency?: boolean }>({});

  const [staffQuery, setStaffQuery] = useState('');
  const [staffSuggestions, setStaffSuggestions] = useState<StaffCandidate[]>([]);
  const [staffSuggestionsOpen, setStaffSuggestionsOpen] = useState(false);
  const [staffSearchLoading, setStaffSearchLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffCandidate | null>(null);

  const staffFieldRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedAssignment) {
        setForm({
          assignedStaffId: selectedAssignment.assignedStaffId,
          frequency: selectedAssignment.frequency
        });
        setStaffQuery(selectedAssignment.assignedStaffEmail || '');
        setSelectedStaff({
          id: selectedAssignment.assignedStaffId,
          email: selectedAssignment.assignedStaffEmail || '',
          name: selectedAssignment.assignedStaffName || ''
        });
      } else {
        setForm({ assignedStaffId: '', frequency: 'MONTHLY' });
        setStaffQuery('');
        setSelectedStaff(null);
      }
      setFormError(null);
      setFieldErrors({});
      setFieldTouched({});
      setStaffSuggestions([]);
      setStaffSuggestionsOpen(false);
    }
  }, [isOpen, selectedAssignment]);

  useEffect(() => {
    if (!isOpen) return;

    if (!staffQuery || selectedStaff) {
      setStaffSuggestions([]);
      setStaffSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      if (cancelled) return;
      setStaffSearchLoading(true);
      try {
        const res = await accountApi.searchAccountsByEmail(staffQuery);
        if (!cancelled) {
          const candidates: StaffCandidate[] = (res.data || []).map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.fullName || ''
          }));
          setStaffSuggestions(candidates);
        }
      } catch (err) {
        console.error('Failed to search staff by email:', err);
      } finally {
        if (!cancelled) {
          setStaffSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, staffQuery, selectedStaff]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (staffFieldRef.current && !staffFieldRef.current.contains(target)) {
        setStaffSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const validateForm = () => {
    const errors: { staff?: string; frequency?: string } = {};
    if (!form.assignedStaffId) {
      errors.staff = 'Please select a staff member from the suggestions.';
    }
    if (!form.frequency) {
      errors.frequency = 'Please select a review cycle.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const selectStaff = (staff: StaffCandidate) => {
    setSelectedStaff(staff);
    setStaffQuery(staff.email);
    setForm(curr => ({ ...curr, assignedStaffId: staff.id }));
    setStaffSuggestionsOpen(false);
    setFieldErrors(curr => ({ ...curr, staff: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldTouched({ staff: true, frequency: true });
    
    if (!validateForm()) return;
    
    setFormError(null);
    setSaving(true);
    
    try {
      if (selectedAssignment) {
        await companyMonitoringApi.updateAssignment(selectedAssignment.id, {
          assignedStaffId: Number(form.assignedStaffId),
          frequency: form.frequency
        });
      } else {
        if (!selectedCompany) {
            throw new Error('No company selected.');
        }
        await companyMonitoringApi.assignMonitor({
          companyProfileId: selectedCompany.id,
          assignedStaffId: Number(form.assignedStaffId),
          frequency: form.frequency
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save assignment', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to save assignment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const profileName = (p: ProfileResponse) => p.identity?.tradeName || p.identity?.legalName || 'Unnamed Company';
  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: '560px', maxWidth: '90vw', padding: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 20px', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedAssignment ? 'Manage monitoring assignment' : 'Assign Monitor'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {selectedAssignment
                ? 'Update the assigned staff member or schedule frequency.'
                : 'Assign a staff member to periodically monitor this company.'}
            </p>
          </div>
          <button
            type="button"
            className="workspace-icon-btn"
            onClick={onClose}
            aria-label="Close assignment modal"
            style={{ marginLeft: '16px', marginTop: '-4px', fontSize: '1.5rem', lineHeight: 1, padding: '4px 8px' }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          <form id="monitoring-assignment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {formError && <div className="admin-form-error" style={{ marginBottom: 0 }}>{formError}</div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Company</span>
                <div style={{ padding: '8px 12px', background: 'var(--cds-layer-hover, #f4f4f4)', border: '1px solid var(--cds-border-subtle)', borderRadius: '4px', fontSize: '0.95rem' }}>
                  {selectedAssignment ? selectedAssignment.companyName : (selectedCompany ? profileName(selectedCompany) : 'Unknown Company')}
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }} ref={staffFieldRef}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Assigned staff</span>
                <input
                  className="admin-input"
                  placeholder="Search staff email..."
                  value={staffQuery}
                  onChange={(e) => {
                     const val = e.target.value;
                     if (selectedStaff) {
                       setSelectedStaff(null);
                       setForm(curr => ({ ...curr, assignedStaffId: '' }));
                     }
                     setStaffQuery(val);
                     if (val) {
                       setStaffSuggestionsOpen(true);
                     } else {
                       setStaffSuggestionsOpen(false);
                     }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                       setFieldTouched(curr => ({ ...curr, staff: true }));
                    }, 200);
                  }}
                  onFocus={() => { if (staffQuery && !selectedStaff) setStaffSuggestionsOpen(true); }}
                />
                {staffSuggestionsOpen && (
                  <div className="admin-suggestions-dropdown" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10, background: 'var(--cds-layer, #fff)', border: '1px solid var(--cds-border-subtle)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto' }}>
                    {staffSearchLoading ? (
                      <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching...</div>
                    ) : staffSuggestions.length === 0 && staffQuery.trim().length > 0 ? (
                      <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No staff found.</div>
                    ) : (
                      staffSuggestions.map((staff) => (
                        <div
                          key={staff.id}
                          className="admin-suggestion-item"
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--cds-border-subtle)' }}
                          onClick={() => selectStaff(staff)}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cds-layer-hover, #f4f4f4)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{staff.email}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{staff.name || 'Staff Member'}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {fieldErrors.staff && <div style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.85rem', marginTop: '2px' }}>{fieldErrors.staff}</div>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Review cycle</span>
                <select
                  className="admin-select"
                  value={form.frequency}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, frequency: event.target.value as MonitoringFrequency }));
                    if (!fieldTouched.frequency) setFieldTouched(curr => ({ ...curr, frequency: true }));
                  }}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMI_ANNUALLY">Semi-annually</option>
                </select>
                {fieldErrors.frequency && <div style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.85rem', marginTop: '2px' }}>{fieldErrors.frequency}</div>}
              </label>
            </div>

            {selectedAssignment && (
              <div className="monitoring-management-summary" style={{ marginTop: '8px', padding: '16px', background: 'var(--cds-layer-01)', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current company</span>
                    <strong style={{ fontSize: '0.95rem' }}>{selectedAssignment.companyName}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current staff</span>
                    <strong style={{ fontSize: '0.95rem' }}>{selectedAssignment.assignedStaffName}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last reviewed</span>
                    <strong style={{ fontSize: '0.95rem' }}>{formatDateTime(selectedAssignment.lastReviewedAt || undefined)}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Next review</span>
                    <strong style={{ fontSize: '0.95rem' }}>{formatDateTime(selectedAssignment.nextReviewAt || undefined)}</strong>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--cds-layer-01, #f4f4f4)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: 'var(--text-primary)' }}>
            Cancel
          </button>
          <button type="submit" form="monitoring-assignment-form" className="btn btn-primary" disabled={saving} style={{ padding: '0 24px' }}>
            {saving ? 'Saving...' : selectedAssignment ? 'Save Changes' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};
