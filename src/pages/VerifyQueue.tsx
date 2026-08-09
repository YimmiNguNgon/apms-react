import React from 'react';

// For Manager: Review & approve data submitted by staff or AI Crawl
export const VerifyQueue: React.FC = () => {
  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager verify-page" id="page-verify">
      <div className="page-header">
        <h1>Hàng đợi Xét duyệt Dữ liệu</h1>
      </div>
      <div className="workspace-panel">
        <div className="workspace-empty">
          Không có bản ghi nào đang chờ xét duyệt.
        </div>
      </div>
    </section>
  );
};
