import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { accountApi } from '../API/accountApi';
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
        </div>
      </div>
    </section>
  );
};
