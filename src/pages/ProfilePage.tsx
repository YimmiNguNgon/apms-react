import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { accountApi } from '../API/accountApi';
import totpApi from '../API/totpApi';
import { TotpSetupModal } from '../components/TotpSetupModal';
import { DisableTotpModal } from '../components/DisableTotpModal';
import type { UpdateMyProfileRequest } from '../types/domain';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateCurrentUser } = useUser();

  const defaultDepartment = currentUser?.role?.includes('ADMIN')
    ? 'Platform Administration'
    : 'Business Development';

  const [profileData, setProfileData] = useState<{
    department: string;
  }>({
    department: currentUser?.department ?? defaultDepartment,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2FA Security State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    accountApi.getMyProfile()
      .then((res) => {
        if (!active || !res?.data) return;
        const d = res.data;
        const department = d.department || defaultDepartment;
        setProfileData({ department });
        if (d.fullName && d.fullName !== currentUser.name) {
          updateCurrentUser({ name: d.fullName, department });
        } else {
          updateCurrentUser({ department });
        }
      })
      .catch((err) => {
        console.error('Failed to load profile details:', err);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.role]);

  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = window.setTimeout(() => setFeedback(null), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    let active = true;
    totpApi.getStatus()
      .then((res) => {
        if (!active) return;
        setTotpEnabled(!!res.data?.enabled);
      })
      .catch((err) => {
        console.error('Failed to load TOTP status:', err);
      })
      .finally(() => {
        if (active) setTotpLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (securityFeedback?.type === 'success') {
      const timer = window.setTimeout(() => setSecurityFeedback(null), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [securityFeedback]);

  const handleTotpEnabledSuccess = () => {
    setTotpEnabled(true);
    setSecurityFeedback({
      type: 'success',
      message: 'Two-factor authentication has been enabled successfully.',
    });
  };

  const handleTotpDisabledSuccess = () => {
    setTotpEnabled(false);
    setSecurityFeedback({
      type: 'success',
      message: 'Two-factor authentication has been disabled successfully.',
    });
  };

  if (!currentUser) return null;

  const handleStartEdit = () => {
    setFeedback(null);
    setNameInput(currentUser.name);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFeedback(null);
    setNameInput(currentUser.name);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Full name cannot be blank.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload: UpdateMyProfileRequest = {
        fullName: trimmed,
      };

      const res = await accountApi.updateMyProfile(payload);
      const savedName = res?.data?.fullName ?? trimmed;

      updateCurrentUser({ name: savedName });
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page" id="page-profile">
      <div className="workspace-main-full">
        {/* Page Header */}
        <div className="workspace-page-head">
          <div>
            <h1>Account Profile</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage your personal account information
            </p>
          </div>
        </div>

        <div className={styles.container}>
          {/* Identity Summary Row */}
          <div className={styles.identityCard}>
            <div className={styles.identityLeft}>
              <div
                className={styles.avatar}
                style={{ background: currentUser.avatarColor || '#2563eb' }}
              >
                {currentUser.avatar}
              </div>
              <div className={styles.identityInfo}>
                <h2 className={styles.identityName}>{currentUser.name}</h2>
                <span className={styles.identityEmail}>{currentUser.email}</span>
                <span className={styles.roleBadge}>{currentUser.roleName}</span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Personal Information</h3>
              <div className={styles.cardActions}>
                {!isEditing ? (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={handleStartEdit}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {feedback && (
              <div className={feedback.type === 'success' ? styles.alertSuccess : styles.alertError}>
                {feedback.message}
              </div>
            )}

            <div className={styles.fieldGrid}>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Full Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    className={styles.input}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter full name..."
                    disabled={saving}
                    autoFocus
                  />
                ) : (
                  <div className={styles.fieldValue}>{currentUser.name}</div>
                )}
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Email Address</span>
                <div className={styles.fieldValue}>{currentUser.email}</div>
              </div>
              <div className={`${styles.fieldItem} ${styles.fieldFullWidth}`}>
                <span className={styles.fieldLabel}>Department</span>
                <div className={styles.fieldValue}>{profileData.department}</div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className={`${styles.card} ${styles.securityCard}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Security</h3>
            </div>

            {securityFeedback && (
              <div className={securityFeedback.type === 'success' ? styles.alertSuccess : styles.alertError}>
                {securityFeedback.message}
              </div>
            )}

            <div className={styles.securityContent}>
              <div className={styles.securityRow}>
                <div className={styles.securityInfo}>
                  <div className={styles.securityTitleRow}>
                    <h4 className={styles.securityItemTitle}>Two-Factor Authentication</h4>
                    <span className={totpEnabled ? styles.badgeEnabled : styles.badgeDisabled}>
                      {totpLoading ? 'Loading...' : totpEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className={styles.securityDesc}>
                    {totpEnabled
                      ? 'Authenticator verification will be required the next time you sign in.'
                      : 'Add an extra layer of security to your account.'}
                  </p>
                </div>
                <div className={styles.securityAction}>
                  {totpEnabled ? (
                    <button
                      type="button"
                      className={styles.disable2faButton}
                      onClick={() => setIsDisableModalOpen(true)}
                      disabled={totpLoading}
                    >
                      Disable Two-Factor Authentication
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.enable2faButton}
                      onClick={() => setIsSetupModalOpen(true)}
                      disabled={totpLoading}
                    >
                      Enable Two-Factor Authentication
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <TotpSetupModal
          isOpen={isSetupModalOpen}
          onClose={() => setIsSetupModalOpen(false)}
          onSuccess={handleTotpEnabledSuccess}
        />

        <DisableTotpModal
          isOpen={isDisableModalOpen}
          onClose={() => setIsDisableModalOpen(false)}
          onSuccess={handleTotpDisabledSuccess}
        />
      </div>
    </section>
  );
};
