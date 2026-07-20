import React, { useState } from 'react';
import { UserManagement } from './UserManagement';
import { ActivityAudit } from './ActivityAudit';
import { SystemSettingsPage } from './SystemSettings';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'settings'>('users');

  return (
    <section className="workspace-page" id="page-admin-panel">
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <div className="workspace-breadcrumbs">Administration <span>/</span> Control Panel</div>
            <h1>System administration</h1>
            <p>This panel now renders only backend-connected account, audit, and system settings views.</p>
          </div>
        </div>

        <div className="detail-tabs" style={{ marginBottom: 18 }}>
          <button className={`detail-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Accounts & permissions</button>
          <button className={`detail-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Activity logs</button>
          <button className={`detail-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>System settings</button>
        </div>

        {activeTab === 'users' && <UserManagement defaultTab="users" />}
        {activeTab === 'logs' && <ActivityAudit defaultTab="audit" />}
        {activeTab === 'settings' && <SystemSettingsPage defaultTab="system" />}
      </div>
    </section>
  );
};
