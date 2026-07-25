import React, { useEffect, useState, useMemo } from 'react';
import { Sliders, Search, CheckCircle, XCircle, Code, Info } from 'lucide-react';
import { api } from '../services/api';

export interface ScoreRuleDto {
  id?: number | string;
  ruleName?: string;
  ruleCategory?: string;
  weight?: number;
  ruleConditionJson?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const DEFAULT_SCORE_RULES: ScoreRuleDto[] = [
  { id: 1, ruleName: 'Quy tắc Đánh giá Năng lực Tài chính', ruleCategory: 'FINANCIAL', weight: 30, ruleConditionJson: '{"minRevenue": 1000000000, "minProfitMargin": 10}', isActive: true },
  { id: 2, ruleName: 'Quy tắc Tuân thủ Pháp lý & Thuế', ruleCategory: 'COMPLIANCE', weight: 25, ruleConditionJson: '{"requireValidTaxCode": true, "maxTaxDeficits": 0}', isActive: true },
  { id: 3, ruleName: 'Quy tắc Đánh giá Năng lực Vận hành', ruleCategory: 'OPERATION', weight: 25, ruleConditionJson: '{"minEmployeeCount": 20, "isoCertified": true}', isActive: true },
  { id: 4, ruleName: 'Quy tắc Mức độ Tin cậy Mạng lưới đối tác', ruleCategory: 'NETWORK', weight: 20, ruleConditionJson: '{"minPartnerTenureYears": 2, "conflictCount": 0}', isActive: true },
];

export const ScoreRulesViewer: React.FC = () => {
  const [rules, setRules] = useState<ScoreRuleDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    api.get<ScoreRuleDto[]>('/score-rules')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res as any)?.content ?? [];
        if (list.length > 0) {
          setRules(list);
        } else {
          setRules(DEFAULT_SCORE_RULES);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch score rules, falling back to standard rules:', err);
        setRules(DEFAULT_SCORE_RULES);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const safeStr = (v: any, fallback: string = 'N/A') => (v !== null && v !== undefined && v !== '' ? String(v) : fallback);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const text = (safeStr(rule.ruleName, '') + ' ' + safeStr(rule.ruleCategory, '') + ' ' + safeStr(rule.ruleConditionJson, '')).toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const cat = safeStr(rule.ruleCategory, '').toUpperCase();
      const matchesCat = filterCategory === 'ALL' || cat === filterCategory.toUpperCase();
      return matchesSearch && matchesCat;
    });
  }, [rules, search, filterCategory]);

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#1F2937' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Evaluation Engine Governance
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Quy tắc Chấm điểm Đánh giá (Score Rules)
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
          Xem danh sách các quy tắc, trọng số và công thức chấm điểm AI/Ecosystem được cấu hình trong hệ thống APMS.
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 12px', borderRadius: '8px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Tìm theo tên quy tắc, danh mục hoặc công thức..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#1F2937' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Danh mục:</span>
          {['ALL', 'FINANCIAL', 'COMPLIANCE', 'OPERATION', 'NETWORK'].map((catKey) => (
            <button
              key={catKey}
              onClick={() => setFilterCategory(catKey)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterCategory === catKey ? '#4F46E5' : '#E5E7EB',
                backgroundColor: filterCategory === catKey ? '#EEF2FF' : '#FFFFFF',
                color: filterCategory === catKey ? '#4F46E5' : '#4B5563',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {catKey === 'ALL' ? 'Tất cả' : catKey}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            Đang tải danh sách quy tắc chấm điểm...
          </div>
        ) : filteredRules.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            Không có quy tắc chấm điểm nào phù hợp.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                <th style={{ padding: '14px 20px' }}>ID</th>
                <th style={{ padding: '14px 20px' }}>Tên Quy tắc</th>
                <th style={{ padding: '14px 20px' }}>Danh mục (Category)</th>
                <th style={{ padding: '14px 20px' }}>Trọng số</th>
                <th style={{ padding: '14px 20px' }}>Điều kiện / Biểu thức JSON</th>
                <th style={{ padding: '14px 20px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule, idx) => {
                const ruleName = safeStr(rule.ruleName, 'Quy tắc chấm điểm');
                const category = safeStr(rule.ruleCategory, 'GENERAL');
                const weight = rule.weight !== undefined && rule.weight !== null ? `${rule.weight}%` : '20%';
                const condition = safeStr(rule.ruleConditionJson, '{}');
                const active = rule.isActive !== false;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#6B7280' }}>
                      #{safeStr(rule.id, String(idx + 1))}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                      {ruleName}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                        {category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#059669' }}>
                      {weight}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#374151', display: 'inline-block', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {condition}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}>
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
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
