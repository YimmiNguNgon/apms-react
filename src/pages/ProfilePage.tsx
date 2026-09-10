import React from 'react';
import { useUser } from '../context/UserContext';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  const department = currentUser.role?.includes('ADMIN')
    ? 'Platform Administration'
    : 'Business Development';

  const defaultBio = 'Quản trị viên hệ thống APMS, phụ trách giám sát phân quyền và vận hành nền tảng.';

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
            <h3 className={styles.cardTitle}>Personal Information</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Full Name</span>
                <div className={styles.fieldValue}>{currentUser.name}</div>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Email Address</span>
                <div className={styles.fieldValue}>{currentUser.email}</div>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Phone Number</span>
                <div className={styles.fieldValue}>+84 901 234 567</div>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Department</span>
                <div className={styles.fieldValue}>{department}</div>
              </div>
              <div className={`${styles.fieldItem} ${styles.fieldFullWidth}`}>
                <span className={styles.fieldLabel}>Bio / Overview</span>
                <div className={styles.fieldBio}>{defaultBio}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
