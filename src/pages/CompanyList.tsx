import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface CompanyListProps {
  setActivePage: (page: string) => void;
}

const MOCK_COMPANIES = [
  { abbr: 'FPT', color: 'blue',   name: 'FPT Software',         meta: 'MST: 0101248141 · CNTT · >40,000 NV · Hà Nội', badge: 'Chiến lược', badgeClass: 'badge-green', kpi: 8.5, closeness: 7.8, assignee: 'Hà Đức Huy', projects: 7 },
  { abbr: 'VNG', color: 'orange',  name: 'VNG Corporation',      meta: 'CNTT · 4,000+ NV · Tp.HCM',                   badge: 'Đối thủ',    badgeClass: 'badge-red',   kpi: null, closeness: null, risk: 'HIGH' },
  { abbr: 'VT',  color: 'red',     name: 'Viettel Solutions',    meta: 'Viễn thông · 2,000+ NV · Hà Nội',             badge: 'Tiềm năng',  badgeClass: 'badge-yellow',kpi: 5.2, closeness: 3.1, assignee: '', projects: 0 },
  { abbr: 'CMC', color: 'purple',  name: 'CMC Technology Group', meta: 'CNTT · 5,000+ NV · Hà Nội',                   badge: 'Đối tác',    badgeClass: 'badge-green', kpi: 7.2, closeness: 6.5, assignee: 'Trần Minh', projects: 3 },
];

export const CompanyList: React.FC<CompanyListProps> = ({ setActivePage }) => {
  const [profileList, setProfileList] = useState<any[]>([]);
  const [totalElements, setTotalElements] = useState(47);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProfiles = (query: string = '') => {
    setLoading(true);
    const endpoint = query ? '/profiles/search' : '/profiles';
    const params: Record<string, string | number | boolean> = { page: 0, size: 20 };
    if (query) {
      params.name = query;
    }

    api.get<any>(endpoint, { params })
      .then(res => {
        if (res && res.success && res.data) {
          const content = res.data.content || [];
          setProfileList(content);
          setTotalElements(res.data.totalElements || content.length);
        }
      })
      .catch(err => {
        console.warn('Could not load company profiles from API (using mockup fallback):', err);
        setProfileList([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Map API data to UI structure
  const mappedApiProfiles = profileList.map(profile => {
    const tradeName = profile.identity?.tradeName || profile.identity?.legalName || 'Doanh nghiệp mới';
    const firstLetter = tradeName.charAt(0).toUpperCase();
    const colors = ['blue', 'orange', 'red', 'purple', 'green'];
    const color = colors[tradeName.length % colors.length];
    
    const industries = profile.business?.industries?.join(', ') || 'Chưa phân loại';
    const employees = profile.companySize?.employeeCount ? ` · ${profile.companySize.employeeCount} NV` : '';
    const city = profile.contact?.addresses?.[0]?.city ? ` · ${profile.contact.addresses[0].city}` : '';
    const mst = profile.identity?.taxCode ? `MST: ${profile.identity.taxCode}` : 'Chưa có MST';

    return {
      abbr: firstLetter + (tradeName.split(' ')[1]?.charAt(0) || '').toUpperCase(),
      color: color,
      name: tradeName,
      meta: `${mst} · ${industries}${employees}${city}`,
      badge: profile.reviewStatus || 'UNVERIFIED',
      badgeClass: profile.reviewStatus === 'VERIFIED' ? 'badge-green' : 'badge-yellow',
      kpi: 7.5,
      closeness: 6.0,
      assignee: 'Hà Đức Huy',
      projects: 1
    };
  });

  const displayList = profileList.length > 0 ? mappedApiProfiles : MOCK_COMPANIES;
  const displayTotal = profileList.length > 0 ? totalElements : 47;

  return (
    <section className="page active" id="page-companies">
      <div className="page-header">
        <h1>Hồ sơ Doanh nghiệp {loading && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 'normal' }}>(Đang tải...)</span>}</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => fetchProfiles(searchQuery)}>🔄 Tải lại</button>
          <button className="btn btn-primary" onClick={() => setActivePage('add-company')}>+ Thêm mới</button>
        </div>
      </div>

      <div className="search-bar-full">
        <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
        </svg>
        <input 
          type="text" 
          placeholder="Tìm theo tên đối tác (Ấn Enter)..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchProfiles(searchQuery)}
        />
      </div>

      <div className="tabs">
        <button className="tab active">Tất cả <span className="tab-count">{displayTotal}</span></button>
        <button className="tab">Đối tác <span className="tab-count">{profileList.length > 0 ? Math.ceil(displayTotal * 0.75) : 35}</span></button>
        <button className="tab">Đối thủ <span className="tab-count">{profileList.length > 0 ? Math.floor(displayTotal * 0.15) : 8}</span></button>
        <button className="tab">Tiềm năng <span className="tab-count">{profileList.length > 0 ? Math.floor(displayTotal * 0.1) : 9}</span></button>
      </div>

      <div className="company-list">
        {displayList.map((c, i) => (
          <div key={i} className="company-card" onClick={() => setActivePage('company-detail')}>
            <div className="company-card-left">
              <div className={`company-logo-sm ${c.color}`}>{c.abbr}</div>
              <div className="company-card-info">
                <h3>{c.name}</h3>
                <p className="company-meta">{c.meta}</p>
                <div className="company-card-scores">
                  {c.kpi !== null && c.kpi !== undefined ? (
                    <div className="mini-score">
                      <span>KPI</span>
                      <div className="progress-bar sm"><div className="progress-fill blue" style={{width:`${c.kpi*10}%`}}></div></div>
                      <span>{c.kpi}</span>
                    </div>
                  ) : (
                    <div className="mini-score">
                      <span>Rủi ro</span>
                      <div className="progress-bar sm"><div className="progress-fill red" style={{width:'74%'}}></div></div>
                      <span className="red-text">HIGH</span>
                    </div>
                  )}
                  {c.closeness !== null && c.closeness !== undefined && (
                    <div className="mini-score">
                      <span>Thân thiết</span>
                      <div className="progress-bar sm"><div className="progress-fill green" style={{width:`${c.closeness*10}%`}}></div></div>
                      <span>{c.closeness}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="company-card-right">
              <span className={`badge ${c.badgeClass}`}>{c.badge}</span>
              {c.assignee && <p className="assignee">Phụ trách: {c.assignee}</p>}
              {c.projects ? <p className="project-count">{c.projects} dự án chung</p> : null}
              <button className="btn-icon-sm">⋯</button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <span>Hiển thị 1-{displayList.length} / {displayTotal}</span>
        <div className="pagination-buttons">
          <button className="page-btn disabled">‹</button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <button className="page-btn">›</button>
        </div>
      </div>
    </section>
  );
};
