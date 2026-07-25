import React, { useEffect, useState } from 'react';
import { FileText, History, Users, Download, Eye, Award, X, Building2, Calendar, CheckCircle2, FileCode } from 'lucide-react';
import { api } from '../services/api';

type TabType = 'reports' | 'history' | 'kpi';

export const StrategicReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State for selected report modal / drawer
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any[]>('/reports').then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      api.get<any[]>('/analysis/history').then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      api.get<any[]>('/kpi/team').then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    ]).then(([repData, histData, kpiData]) => {
      setReports(repData);
      setHistory(histData);
      setKpis(kpiData);
      setLoading(false);
    });
  }, []);

  const safeVal = (v: any, fallback: string = 'N/A') => (v !== null && v !== undefined && v !== '' ? String(v) : fallback);

  const handleOpenReport = (report: any) => {
    setSelectedReport(report);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#1F2937', position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Strategic Posture & Intelligence
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Báo cáo Chiến lược & Hiệu suất Team
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
          Tổng hợp báo cáo chiến lược đã xuất bản, lịch sử phân tích chuyên sâu và đo lường KPI xử lý dữ liệu của team.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '2px solid #4F46E5' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'reports' ? '#4F46E5' : '#6B7280',
            fontWeight: activeTab === 'reports' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <FileText size={18} />
          <span>Báo cáo Xuất bản ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #4F46E5' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'history' ? '#4F46E5' : '#6B7280',
            fontWeight: activeTab === 'history' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <History size={18} />
          <span>Lịch sử Phân tích ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kpi')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'kpi' ? '2px solid #4F46E5' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'kpi' ? '#4F46E5' : '#6B7280',
            fontWeight: activeTab === 'kpi' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <Users size={18} />
          <span>Hiệu suất Review Team ({kpis.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            Đang tải dữ liệu chiến lược...
          </div>
        ) : activeTab === 'reports' ? (
          <div>
            {reports.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Chưa có báo cáo nào.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px' }}>Tên báo cáo</th>
                    <th style={{ padding: '14px 20px' }}>Ngày phát hành</th>
                    <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                        {safeVal(item.title, 'Báo cáo chưa đặt tên')}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#6B7280' }}>
                        {safeVal(item.date, 'Chưa rõ')}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: item.status === 'published' ? '#D1FAE5' : '#F3F4F6',
                          color: item.status === 'published' ? '#065F46' : '#6B7280',
                        }}>
                          {safeVal(item.status, 'draft').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenReport(item)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                            border: '1px solid #C7D2FE',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Eye size={14} />
                          <span>Xem chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <div>
            {history.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Chưa có lịch sử phân tích.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px' }}>Công ty mục tiêu</th>
                    <th style={{ padding: '14px 20px' }}>Loại phân tích</th>
                    <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                    <th style={{ padding: '14px 20px' }}>Cập nhật</th>
                    <th style={{ padding: '14px 20px' }}>Tóm tắt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                        {safeVal(item.companyName, 'Dự án mục tiêu')}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#4B5563' }}>
                        <span style={{ padding: '4px 8px', backgroundColor: '#F3F4F6', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          {safeVal(item.analysisType, 'GENERAL')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          {safeVal(item.status, 'IN_PROGRESS')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#6B7280' }}>{safeVal(item.date)}</td>
                      <td style={{ padding: '14px 20px', color: '#4B5563', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {safeVal(item.summary, 'Chưa có mô tả tóm tắt')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            {kpis.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Chưa có dữ liệu KPI.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px' }}>Thành viên</th>
                    <th style={{ padding: '14px 20px' }}>Vai trò</th>
                    <th style={{ padding: '14px 20px' }}>Số công ty đã Review</th>
                    <th style={{ padding: '14px 20px' }}>Chỉ số chính xác</th>
                    <th style={{ padding: '14px 20px' }}>Thưởng KPI</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((item, idx) => {
                    const accuracy = Number(item.accuracy ?? 0);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                          {safeVal(item.name, 'N/A')}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#4B5563' }}>
                          {safeVal(item.role, 'Research Staff')}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                          {safeVal(item.companiesReviewed, '0')} / {safeVal(item.target, '3')}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: accuracy >= 85 ? '#D1FAE5' : accuracy >= 70 ? '#FEF3C7' : '#FEE2E2',
                            color: accuracy >= 85 ? '#065F46' : accuracy >= 70 ? '#92400E' : '#991B1B',
                          }}>
                            {accuracy}%
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {item.bonus ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 600, fontSize: '13px' }}>
                              <Award size={16} /> Đạt Đánh Giá
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Đang phấn đấu</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Strategic Report Fullscreen Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Báo cáo Chiến lược xuất bản
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '6px 0 0 0' }}>
                  {safeVal(selectedReport.title, 'Báo cáo Chiến lược')}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B7280' }}>
                    📅 Ngày phát hành: <strong style={{ color: '#374151' }}>{safeVal(selectedReport.date, 'Chưa rõ')}</strong>
                  </span>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                    backgroundColor: selectedReport.status === 'published' ? '#D1FAE5' : '#FEF3C7',
                    color: selectedReport.status === 'published' ? '#065F46' : '#92400E',
                  }}>
                    {safeVal(selectedReport.status, 'draft').toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseReport}
                style={{ padding: '8px', border: 'none', background: '#F3F4F6', borderRadius: '8px', cursor: 'pointer', color: '#4B5563', marginLeft: '16px', flexShrink: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                {/* Executive Summary */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCode size={18} color="#4F46E5" /> Tóm tắt Điều hành (Executive Summary)
                  </h3>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', backgroundColor: '#F9FAFB', padding: '18px', borderRadius: '10px', border: '1px solid #E5E7EB', margin: 0 }}>
                    Báo cáo tổng hợp đánh giá thế posture kinh doanh, rủi ro chuỗi cung ứng và định hướng mở rộng hệ sinh thái đối tác. Dữ liệu được trích xuất và kiểm định từ cơ sở dữ liệu doanh nghiệp APMS. Kết quả phân tích dựa trên {(selectedReport as any)?.reviewCount ?? 'toàn bộ'} hồ sơ doanh nghiệp trong chu kỳ báo cáo.
                  </p>
                </div>

                {/* Key Metrics */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
                    📊 Chỉ số Tổng quan
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Hồ sơ được đánh giá', value: (selectedReport as any)?.companiesReviewed ?? '—' },
                      { label: 'Rủi ro cấp High', value: (selectedReport as any)?.highRiskCount ?? '—' },
                      { label: 'Đối tác mới tiềm năng', value: (selectedReport as any)?.newPartners ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>{label}</span>
                        <strong style={{ fontSize: '14px', color: '#111827' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic Recommendations */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
                    🎯 Khuyến nghị Chiến lược
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ padding: '12px 14px', backgroundColor: '#EEF2FF', borderRadius: '8px', borderLeft: '3px solid #4F46E5' }}>
                      <div style={{ fontWeight: 600, color: '#312E81', fontSize: '13px' }}>Mở rộng Đối tác mức Safe</div>
                      <div style={{ fontSize: '12px', color: '#4338CA', marginTop: '3px' }}>Tăng cường kết nối với đối tác rủi ro thấp trong phân khúc Công nghệ thông tin.</div>
                    </div>
                    <div style={{ padding: '12px 14px', backgroundColor: '#FEF3C7', borderRadius: '8px', borderLeft: '3px solid #D97706' }}>
                      <div style={{ fontWeight: 600, color: '#78350F', fontSize: '13px' }}>Theo dõi Đối thủ biến động</div>
                      <div style={{ fontSize: '12px', color: '#92400E', marginTop: '3px' }}>Cập nhật điểm đe dọa từ đơn vị có dấu hiệu thay đổi thị phần.</div>
                    </div>
                    <div style={{ padding: '12px 14px', backgroundColor: '#F0FDF4', borderRadius: '8px', borderLeft: '3px solid #059669' }}>
                      <div style={{ fontWeight: 600, color: '#065F46', fontSize: '13px' }}>Duyệt hồ sơ tồn đọng</div>
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '3px' }}>Giải quyết hồ sơ đang chờ phê duyệt để đẩy nhanh tiến độ ký kết hợp đồng.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleCloseReport}
                style={{ padding: '10px 18px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                onClick={() => alert(`Bắt đầu tải báo cáo "${selectedReport.title}"...`)}
                style={{ padding: '10px 20px', backgroundColor: '#4F46E5', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} />
                <span>Tải Báo cáo (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
