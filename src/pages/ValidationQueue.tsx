import React, { useState } from 'react';

// For Key Member / Senior BD Staff: validate AI-extracted data before sending to Manager
const records = [
  { company: 'Viettel Digital', field: 'Doanh thu', ai: '18,500 tỷ VNĐ', source: 'cafef.vn', confidence: 88, status: 'pending' },
  { company: 'VNPT Technology', field: 'Số nhân viên', ai: '3,200 người', source: 'linkedin.com', confidence: 71, status: 'pending' },
  { company: 'MoMo',            field: 'Vòng gọi vốn', ai: 'Series E — $200M', source: 'techcrunch.com', confidence: 93, status: 'approved' },
];

export const ValidationQueue: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<number, string>>(
    Object.fromEntries(records.map((r, i) => [i, r.status]))
  );

  return (
    <section className="page active" id="page-validate">
      <div className="page-header">
        <h1>Hàng đợi Xác thực Dữ liệu AI</h1>
        <span className="badge badge-yellow" style={{ fontSize: 14, padding: '4px 12px' }}>3 đang chờ xác thực</span>
      </div>

      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(139,92,246,0.06)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(139,92,246,0.15)', fontSize: 13, color: '#4c1d95' }}>
        Vai trò của bạn: <strong>Key Member / Senior BD Staff</strong> — Kiểm tra và xác thực thông tin AI đã trích xuất trước khi chuyển lên Manager duyệt.
      </div>

      <div className="company-list">
        {records.map((rec, i) => (
          <div key={i} className="company-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{rec.company}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trường: <strong>{rec.field}</strong> · Nguồn: {rec.source}</p>
              </div>
              <span className={`confidence ${rec.confidence >= 85 ? 'high' : rec.confidence >= 70 ? 'medium' : 'low'}`}>
                AI: {rec.confidence}%
              </span>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14 }}>
              Dữ liệu AI trích xuất: <strong>{rec.ai}</strong>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                defaultValue={rec.ai}
                placeholder="Chỉnh sửa nếu cần..."
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {statuses[i] === 'approved' ? (
                <span className="badge badge-green" style={{ fontSize: 12, padding: '4px 12px' }}>Đã xác nhận</span>
              ) : (
                <>
                  <button className="btn btn-success" onClick={() => setStatuses(s => ({...s, [i]: 'approved'}))}>Xác nhận & Gửi Manager</button>
                  <button className="btn btn-outline">Yêu cầu AI kiểm tra lại</button>
                  <button className="btn btn-danger">Từ chối</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
