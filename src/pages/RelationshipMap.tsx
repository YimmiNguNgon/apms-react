import React, { useEffect, useMemo, useState } from 'react';
import { Network, Search, Filter, ExternalLink, ArrowRight, Building, Download, X } from 'lucide-react';
import { api } from '../services/api';

type RelationshipType = 'PARTNER_WITH' | 'COMPETITOR_OF' | 'SUPPLIER_OF' | 'CUSTOMER_OF' | 'POTENTIAL_PARTNER_OF' | string;

export interface RelationshipRow {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  relationshipType: RelationshipType;
  establishedDate: string;
  industry?: string;
  confidence?: number;
}

interface RelationshipMapProps {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
}

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [relFilter, setRelFilter] = useState<string>('ALL');
  const [selectedRow, setSelectedRow] = useState<RelationshipRow | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<any>('/graph/network')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
        const extracted: RelationshipRow[] = [];

        list.forEach((item: any, idx: number) => {
          const sourceId = String(item.companyId || item.id || `COMP-${idx}`);
          const sourceName = String(item.name || item.tradeName || item.legalName || sourceId);
          const industry = item.industry || item.primaryIndustry;

          if (item.relationships && Array.isArray(item.relationships) && item.relationships.length > 0) {
            item.relationships.forEach((rel: any, rIdx: number) => {
              extracted.push({
                id: `REL-${sourceId}-${rel.targetCompanyId || rIdx}`,
                sourceId,
                sourceName,
                targetId: String(rel.targetCompanyId || rel.target || `TARGET-${rIdx}`),
                targetName: String(rel.targetCompanyName || rel.targetName || rel.targetCompanyId || 'Doanh nghiệp liên kết'),
                relationshipType: String(rel.relationshipType || item.relationshipType || 'PARTNER_WITH'),
                establishedDate: String(rel.establishedDate || rel.createdAt || 'Mới cập nhật'),
                industry,
                confidence: typeof rel.confidenceScore === 'number' ? rel.confidenceScore : undefined,
              });
            });
          } else {
            extracted.push({
              id: `NODE-${sourceId}`,
              sourceId,
              sourceName,
              targetId: '-',
              targetName: 'Doanh nghiệp độc lập',
              relationshipType: String(item.relationshipType || 'PARTNER_WITH'),
              establishedDate: 'Đã xác thực',
              industry,
            });
          }
        });

        setRows(extracted);
      })
      .catch(() => { setRows([]); })
      .finally(() => setLoading(false));
  }, []);

  const safeStr = (v: any, fallback: string = 'N/A') => (v !== null && v !== undefined && v !== '' ? String(v) : fallback);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const text = (row.sourceName + ' ' + row.targetName + ' ' + row.relationshipType).toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRel = relFilter === 'ALL' || row.relationshipType.toUpperCase().includes(relFilter.toUpperCase());
      return matchesSearch && matchesRel;
    });
  }, [rows, search, relFilter]);

  const stats = useMemo(() => {
    const partners = rows.filter((r) => r.relationshipType.includes('PARTNER')).length;
    const competitors = rows.filter((r) => r.relationshipType.includes('COMPETITOR')).length;
    const suppliers = rows.filter((r) => r.relationshipType.includes('SUPPLIER')).length;
    const customers = rows.filter((r) => r.relationshipType.includes('CUSTOMER')).length;
    return { total: rows.length, partners, competitors, suppliers, customers };
  }, [rows]);

  const handleViewCompany = (companyId: string) => {
    if (!companyId || companyId === '-') return;
    if (setActivePage) {
      window.history.pushState({}, '', `/partner-ecosystem/company/${companyId}`);
      setActivePage('company-detail');
    }
  };

  const handleExportCSV = () => {
    const header = ['Source ID', 'Source Name', 'Relationship', 'Target ID', 'Target Name', 'Established Date', 'Industry', 'Confidence'];
    const csvRows = filteredRows.map((r) => [
      r.sourceId, r.sourceName, r.relationshipType, r.targetId, r.targetName, r.establishedDate, r.industry ?? '', r.confidence ?? '',
    ]);
    const content = [header, ...csvRows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relationship_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRelBadgeStyle = (relType: string) => {
    if (relType.includes('COMPETITOR')) return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Đối thủ' };
    if (relType.includes('SUPPLIER')) return { bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC', label: 'Nhà cung ứng' };
    if (relType.includes('CUSTOMER')) return { bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE', label: 'Khách hàng' };
    if (relType.includes('POTENTIAL')) return { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D', label: 'Tiềm năng' };
    return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Đối tác' };
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#1F2937' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Graph Intelligence & Relationship Matrix
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Bản đồ Quan hệ Doanh nghiệp (Relationship Matrix)
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
            Danh sách các mối liên kết doanh nghiệp trong hệ sinh thái (Đối tác, Đối thủ, Nhà cung ứng, Khách hàng).
          </p>
        </div>
        {/* Export button */}
        <button
          onClick={handleExportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0, marginTop: '4px' }}
        >
          <Download size={16} color="#4F46E5" />
          <span>Xuất CSV ({filteredRows.length})</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Tổng liên kết Graph</span>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #D1FAE5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#065F46', fontWeight: 500 }}>Quan hệ Đối tác (Partner)</span>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{stats.partners}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #FEE2E2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>Đối thủ Cạnh tranh</span>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{stats.competitors}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E0F2FE', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#0369A1', fontWeight: 500 }}>Nhà cung ứng / Khách hàng</span>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0284C7', marginTop: '4px' }}>{stats.suppliers + stats.customers}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 12px', borderRadius: '8px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Tìm theo tên công ty chính hoặc công ty liên kết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#1F2937' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#6B7280" />
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Loại quan hệ:</span>
          {['ALL', 'PARTNER', 'COMPETITOR', 'SUPPLIER', 'CUSTOMER'].map((typeKey) => (
            <button
              key={typeKey}
              onClick={() => setRelFilter(typeKey)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid',
                borderColor: relFilter === typeKey ? '#4F46E5' : '#E5E7EB',
                backgroundColor: relFilter === typeKey ? '#EEF2FF' : '#FFFFFF',
                color: relFilter === typeKey ? '#4F46E5' : '#4B5563',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {typeKey === 'ALL' ? 'Tất cả' : typeKey === 'PARTNER' ? 'Đối tác' : typeKey === 'COMPETITOR' ? 'Đối thủ' : typeKey === 'SUPPLIER' ? 'Cung ứng' : 'Khách hàng'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Relationship Matrix Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Đang tải dữ liệu mạng lưới quan hệ...</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Không tìm thấy thông tin quan hệ nào phù hợp.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                <th style={{ padding: '14px 20px' }}>Doanh nghiệp gốc (Source)</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Loại quan hệ</th>
                <th style={{ padding: '14px 20px' }}>Doanh nghiệp liên kết (Target)</th>
                <th style={{ padding: '14px 20px' }}>Thời gian thiết lập</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const badge = getRelBadgeStyle(row.relationshipType);
                return (
                  <tr
                    key={row.id + idx}
                    style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{row.sourceName}</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>ID: {row.sourceId}</div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.label}
                        </span>
                        <ArrowRight size={14} color="#9CA3AF" />
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{row.targetName}</div>
                      {row.targetId !== '-' && (
                        <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>ID: {row.targetId}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6B7280' }}>{safeStr(row.establishedDate)}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedRow(row)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleViewCompany(row.sourceId)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <span>Hồ sơ</span>
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Relationship Detail Modal */}
      {selectedRow && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chi tiết Quan hệ Hệ thống</span>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>
                  {selectedRow.sourceName} → {selectedRow.targetName}
                </h2>
              </div>
              <button onClick={() => setSelectedRow(null)} style={{ padding: '8px', border: 'none', background: '#F3F4F6', borderRadius: '8px', cursor: 'pointer', color: '#4B5563' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 26px' }}>
              {/* Relationship Type visual */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: '#EEF2FF', borderRadius: '12px', margin: '0 auto 6px' }}>
                    <Building size={24} color="#4F46E5" />
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>{selectedRow.sourceName}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>ID: {selectedRow.sourceId}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <ArrowRight size={20} color="#6B7280" />
                  <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, backgroundColor: getRelBadgeStyle(selectedRow.relationshipType).bg, color: getRelBadgeStyle(selectedRow.relationshipType).color, border: `1px solid ${getRelBadgeStyle(selectedRow.relationshipType).border}` }}>
                    {getRelBadgeStyle(selectedRow.relationshipType).label}
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: '#F0FDF4', borderRadius: '12px', margin: '0 auto 6px' }}>
                    <Building size={24} color="#059669" />
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>{selectedRow.targetName}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>ID: {selectedRow.targetId}</div>
                </div>
              </div>

              {/* Metadata grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Loại quan hệ', value: selectedRow.relationshipType },
                  { label: 'Ngày thiết lập', value: safeStr(selectedRow.establishedDate) },
                  { label: 'Ngành nghề', value: safeStr(selectedRow.industry, 'Chưa phân loại') },
                  { label: 'Độ tin cậy', value: selectedRow.confidence !== undefined ? `${selectedRow.confidence}%` : 'Chưa có dữ liệu' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '12px 14px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelectedRow(null)}
                  style={{ padding: '10px 16px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button
                  onClick={() => { handleViewCompany(selectedRow.sourceId); setSelectedRow(null); }}
                  style={{ padding: '10px 16px', backgroundColor: '#4F46E5', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ExternalLink size={15} /> Xem Hồ sơ Công ty
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
