import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { ExternalLink, Building2, MapPin, Phone, Mail, Globe, Sparkles } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import { externalDataApi } from '../../API/externalDataApi';
import { api } from '../../services/api';
import type { ProfileResponse } from '../../types/domain';
import type { CompanyListingInfo } from '../../types/listingData';
import { ListingTabShell } from './common';
import { formatCurrency, useListingTabData } from './utils';

interface ListingInfoTabProps {
  companyId: string;
}

const sanitizeHtml = (html: string): string => DOMPurify.sanitize(html);

const ListingInfoTab: React.FC<ListingInfoTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyListingInfo>(
    `listing-info:${companyId}`,
    companyId,
    listingDataApi.getListingInfo,
  );
  const [profileFallback, setProfileFallback] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);

  const info = data?.data;

  useEffect(() => {
    if (!data?.hasData && companyId) {
      setProfileLoading(true);
      api.get<ProfileResponse>(`/profiles/${companyId}`)
        .then((res) => setProfileFallback(res.data ?? null))
        .catch(() => setProfileFallback(null))
        .finally(() => setProfileLoading(false));
    }
  }, [data?.hasData, companyId]);

  const stockTicker = info?.stockTicker || profileFallback?.stockTicker || profileFallback?.identity?.stockTicker;
  const stockExchange = info?.stockExchange || profileFallback?.stockExchange || profileFallback?.identity?.stockExchange || 'NONE';
  const companyName = info?.companyName || profileFallback?.identity?.legalName || profileFallback?.identity?.tradeName || 'Hồ sơ Doanh nghiệp';
  const englishName = info?.englishName || profileFallback?.identity?.tradeName || '';
  const businessLine = info?.businessLine || profileFallback?.business?.industries?.join(', ') || 'Chưa cập nhật ngành nghề';
  const charterCapital = info?.charterCapital || profileFallback?.financial?.charterCapital || profileFallback?.financials?.charterCapital;
  const sourceUrl = info?.sourceUrl || (stockTicker ? `https://cafef.vn/du-lieu/hose/${stockTicker.toLowerCase()}-thong-tin-co-ban.chn` : null);

  const handleRunAiCrawler = async () => {
    setCrawling(true);
    setCrawlMsg(null);
    try {
      const msg = await externalDataApi.runFetch({ forceRefresh: true });
      setCrawlMsg(msg || 'Đã kích hoạt AI crawler thu thập dữ liệu tự động!');
      reload();
    } catch (err) {
      setCrawlMsg(err instanceof Error ? err.message : 'Kích hoạt crawler thất bại.');
    } finally {
      setCrawling(false);
    }
  };

  const fields = [
    { label: 'Tên Pháp Lý', value: companyName },
    { label: 'Tên Thương Mại', value: englishName },
    { label: 'Ngành nghề kinh doanh', value: businessLine },
    { label: 'Mã Số Thuế', value: profileFallback?.identity?.taxCode, monospace: true },
    { label: 'Số Đăng Ký Kinh Doanh', value: profileFallback?.identity?.registrationNumber, monospace: true },
    { label: 'Mã Cổ Phiếu', value: stockTicker ? `${stockTicker} (${stockExchange})` : 'Chưa niêm yết', monospace: true },
    { label: 'Sàn Giao Dịch', value: stockExchange !== 'NONE' ? stockExchange : 'Chưa niêm yết' },
    { label: 'Người Đại Diện Pháp Luật', value: info?.legalRepresentative },
    { label: 'Vốn Điều Lệ (VNĐ)', value: charterCapital ? `${formatCurrency(charterCapital)} VNĐ` : 'Chưa cập nhật' },
    { label: 'Đơn vị kiểm toán', value: info?.auditorCompany },
    { label: 'Website', value: info?.website || profileFallback?.contact?.website, isLink: true },
    { label: 'Email liên hệ', value: info?.email || profileFallback?.contact?.emails?.[0] },
    { label: 'Điện thoại', value: info?.phone || profileFallback?.contact?.phones?.[0] },
    { label: 'Địa chỉ trụ sở chính', value: info?.address || profileFallback?.contact?.addresses?.[0]?.fullAddress },
  ].filter((f) => f.value != null && String(f.value).trim() !== '');

  return (
    <ListingTabShell
      loading={loading || profileLoading}
      error={error}
      hasData={fields.length > 0 || !!info}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header Bar */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{companyName}</h2>
                {stockTicker && (
                  <span style={{ background: '#1E40AF', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                    {stockTicker} : {stockExchange}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>{businessLine}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRunAiCrawler}
                disabled={crawling}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: crawling ? 'not-allowed' : 'pointer',
                  opacity: crawling ? 0.7 : 1,
                }}
              >
                <Sparkles size={12} />
                <span>{crawling ? 'AI Crawling...' : 'AI Crawler Thu Thập'}</span>
              </button>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '5px 10px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <span>Nguồn CafeF Thông tin cơ bản</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {crawlMsg && (
            <div style={{ marginTop: '8px', fontSize: '0.65rem', color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {crawlMsg}
            </div>
          )}
        </div>

        {/* Dynamic Fields Grid */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} style={{ color: '#2563EB' }} />
            <span>Thông tin Cơ bản & Pháp lý Doanh nghiệp</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {fields.map((f) => (
              <div key={f.label} style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '2px' }}>{f.label}</span>
                {f.isLink ? (
                  <a href={String(f.value).startsWith('http') ? String(f.value) : `https://${f.value}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                    {f.value}
                  </a>
                ) : (
                  <strong style={{ fontSize: '0.76rem', color: '#0F172A', fontWeight: 700, fontFamily: f.monospace ? 'monospace' : 'inherit' }}>
                    {f.value}
                  </strong>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Introduction / Business Model */}
        {info?.introduction && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
              Mô hình Kinh doanh & Giới thiệu
            </h3>
            <div
              style={{ fontSize: '0.74rem', color: '#334155', lineHeight: '1.5' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(info.introduction) }}
            />
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default ListingInfoTab;

