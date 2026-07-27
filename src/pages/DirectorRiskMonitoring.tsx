import React, { useEffect, useState, useMemo } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Search, Building2, ExternalLink, Filter } from 'lucide-react';
import { api } from '../services/api';

export interface RiskItem {
  companyId?: string;
  tradeName?: string;
  legalName?: string;
  taxCode?: string;
  industry?: string;
  reviewStatus?: string;
  riskLevel?: string;
  riskScore?: number | string;
}

interface DirectorRiskMonitoringProps {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
}

export const DirectorRiskMonitoring: React.FC<DirectorRiskMonitoringProps> = ({ setActivePage }) => {
  const [data, setData] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get<RiskItem[]>('/risk-monitoring')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data) ? res.data : (res as { data?: RiskItem[] })?.data ?? [];
        setData(list);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch risk monitoring data:', err);
        setError('Không thể tải dữ liệu giám sát rủi ro');
        setData([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Safe helper to extract and normalize string fields
  const safeStr = (val: unknown, fallback: string = 'Chưa có dữ liệu'): string => {
    if (val === null || val === undefined || val === '') return fallback;
    return String(val).trim();
  };

  // Safe helper to parse risk score
  const safeScore = (scoreRaw: unknown): number => {
    if (scoreRaw === null || scoreRaw === undefined) return 0;
    const num = Number(scoreRaw);
    return isNaN(num) ? 0 : num;
  };

  // Safe helper to normalize risk level
  const safeRiskLevel = (item: RiskItem): 'High' | 'Medium' | 'Low' => {
    const rawLevel = safeStr(item.riskLevel, '').toLowerCase();
    if (rawLevel === 'high') return 'High';
    if (rawLevel === 'medium' || rawLevel === 'med') return 'Medium';
    if (rawLevel === 'low') return 'Low';

    // Infer from score if available
    const score = safeScore(item.riskScore);
    if (score > 60) return 'High';
    if (score > 40) return 'Medium';
    return 'Low';
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const name = (safeStr(item.tradeName, '') + ' ' + safeStr(item.legalName, '') + ' ' + safeStr(item.companyId, '')).toLowerCase();
      const matchesSearch = name.includes(search.toLowerCase());
      const level = safeRiskLevel(item);
      const matchesLevel = levelFilter === 'ALL' || level.toUpperCase() === levelFilter.toUpperCase();
      return matchesSearch && matchesLevel;
    });
  }, [data, search, levelFilter]);

  const stats = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    data.forEach((item) => {
      const lvl = safeRiskLevel(item);
      if (lvl === 'High') high++;
      else if (lvl === 'Medium') medium++;
      else low++;
    });
    return { total: data.length, high, medium, low };
  }, [data]);

  const handleViewCompany = (companyId?: string) => {
    if (!companyId) return;
    if (setActivePage) {
      window.history.pushState({}, '', `/partner-ecosystem/company/${companyId}`);
      setActivePage('company-detail');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#1F2937' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Executive Command Center
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Giám sát Rủi ro Đối tác (Risk Monitoring)
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
            Theo dõi điểm số rủi ro, phân loại mức độ đe dọa và trạng thái xác minh doanh nghiệp trong hệ sinh thái.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Tổng doanh nghiệp</span>
            <Building2 size={20} color="#6366F1" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Hồ sơ được theo dõi rủi ro</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #FEE2E2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#991B1B' }}>Rủi ro Cao (High)</span>
            <ShieldAlert size={20} color="#DC2626" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#DC2626' }}>{stats.high}</div>
          <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>Cần theo dõi và can thiệp ngay</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #FEF3C7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#92400E' }}>Rủi ro Trung bình</span>
            <AlertTriangle size={20} color="#D97706" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#D97706' }}>{stats.medium}</div>
          <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px' }}>Yêu cầu xem xét bổ sung bằng chứng</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #D1FAE5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#065F46' }}>Rủi ro Thấp (Safe)</span>
            <ShieldCheck size={20} color="#059669" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{stats.low}</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Hồ sơ an toàn, đã xác minh</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 12px', borderRadius: '8px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Tìm theo tên công ty, ID hoặc MST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#1F2937' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#6B7280" />
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Mức rủi ro:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: levelFilter === lvl ? '#4F46E5' : '#E5E7EB',
                backgroundColor: levelFilter === lvl ? '#EEF2FF' : '#FFFFFF',
                color: levelFilter === lvl ? '#4F46E5' : '#4B5563',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {lvl === 'ALL' ? 'Tất cả' : lvl === 'HIGH' ? 'Cao' : lvl === 'MEDIUM' ? 'T.Bình' : 'Thấp'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Panel */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            Đang tải dữ liệu giám sát rủi ro...
          </div>
        ) : error ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#DC2626' }}>
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            Không tìm thấy doanh nghiệp nào phù hợp với bộ lọc.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                <th style={{ padding: '14px 20px' }}>Tên công ty / ID</th>
                <th style={{ padding: '14px 20px' }}>Ngành nghề</th>
                <th style={{ padding: '14px 20px' }}>Mã số thuế</th>
                <th style={{ padding: '14px 20px' }}>Trạng thái hồ sơ</th>
                <th style={{ padding: '14px 20px' }}>Điểm rủi ro</th>
                <th style={{ padding: '14px 20px' }}>Mức rủi ro</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const companyId = safeStr(item.companyId, `UNKNOWN-${idx}`);
                const tradeName = safeStr(item.tradeName, item.legalName ? item.legalName : 'Chưa có dữ liệu');
                const industry = safeStr(item.industry, 'Chưa xác định');
                const taxCode = safeStr(item.taxCode, 'Chưa có MST');
                const reviewStatus = safeStr(item.reviewStatus, 'UNVERIFIED');
                const score = safeScore(item.riskScore);
                const level = safeRiskLevel(item);

                const levelBadge = level === 'High'
                  ? { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' }
                  : level === 'Medium'
                  ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
                  : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };

                return (
                  <tr key={companyId + idx} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{tradeName}</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '2px' }}>ID: {companyId}</div>
                    </td>

                    <td style={{ padding: '14px 20px', color: '#4B5563' }}>
                      {industry}
                    </td>

                    <td style={{ padding: '14px 20px', color: '#4B5563', fontFamily: 'monospace' }}>
                      {taxCode}
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: reviewStatus === 'VERIFIED' ? '#E0F2FE' : '#F3F4F6',
                        color: reviewStatus === 'VERIFIED' ? '#0369A1' : '#6B7280',
                      }}>
                        {reviewStatus}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', width: '80px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, score))}%`,
                            backgroundColor: score > 60 ? '#DC2626' : score > 40 ? '#D97706' : '#10B981',
                            borderRadius: '3px',
                          }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>{score}/100</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: levelBadge.bg,
                        color: levelBadge.color,
                        border: `1px solid ${levelBadge.border}`,
                      }}>
                        {level === 'High' ? 'Rủi ro Cao' : level === 'Medium' ? 'Trung bình' : 'An toàn'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewCompany(item.companyId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>Hồ sơ</span>
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
