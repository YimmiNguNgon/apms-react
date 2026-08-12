import React, { useState, useEffect } from 'react';
import { ExternalLink, Newspaper, Search, Sparkles, Filter } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import { externalDataApi } from '../../API/externalDataApi';
import type { CompanyNews } from '../../types/listingData';
import { ListingTabShell } from './common';
import { formatDateTime, useListingTabData } from './utils';

const PAGE_SIZE = 8;
const CATEGORIES = ['Tất cả', 'CÔNG BỐ THÔNG TIN', 'HOẠT ĐỘNG KINH DOANH', 'CỔ TỨC & PHÁT HÀNH', 'BÁO CÁO PHÂN TÍCH', 'CẢNH BẢO RỦI RO', 'CƠ HỘI ĐẦU TƯ'];

interface NewsTabProps {
  companyId: string;
}

const repairMojibake = (value?: string | null): string => {
  if (!value) return '';
  if (!/[\u00c2\u00c3\u00e2á»Ä½ºÆ°â]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return repaired.includes('\uFFFD') ? value : repaired;
  } catch {
    return value;
  }
};

const NewsTab: React.FC<NewsTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyNews[]>(
    `news:${companyId}`,
    companyId,
    listingDataApi.getNews,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);
  const showManualCrawler = companyId !== '6a31a0000000000000000001';

  // Reset pagination when companyId, searchQuery, or selectedCategory changes
  useEffect(() => {
    setCurrentPage(0);
  }, [companyId, searchQuery, selectedCategory]);

  const news = data?.data ?? [];

  const filteredNews = news.filter((item) => {
    const matchCat = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    const matchQuery = !searchQuery.trim() ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / PAGE_SIZE));
  const shown = filteredNews.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const startItem = filteredNews.length > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, filteredNews.length);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const handleRunAiCrawler = async () => {
    setCrawling(true);
    setCrawlMsg('Đang kích hoạt AI Crawler thu thập tin tức cho doanh nghiệp...');
    try {
      await externalDataApi.triggerCompanyCrawl(companyId);
      setCrawlMsg('Đang thu thập tin tức... Vui lòng chờ trong giây lát.');

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await externalDataApi.getCompanyCrawlStatus(companyId);
          if (statusRes.status === 'COMPLETED') {
            clearInterval(interval);
            setCrawlMsg('Thu thập tin tức hoàn tất!');
            setCrawling(false);
            reload();
          } else if (statusRes.status === 'FAILED' || attempts >= 15) {
            clearInterval(interval);
            setCrawlMsg(statusRes.status === 'FAILED' ? 'Thu thập tin tức thất bại.' : 'Hoàn tất thu thập.');
            setCrawling(false);
            reload();
          }
        } catch {
          if (attempts >= 15) {
            clearInterval(interval);
            setCrawling(false);
            reload();
          }
        }
      }, 2000);
    } catch (err) {
      setCrawlMsg(err instanceof Error ? err.message : 'Kích hoạt crawler thất bại.');
      setCrawling(false);
    }
  };

  const renderPageButtons = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      if (currentPage <= 2) {
        end = 3;
      } else if (currentPage >= totalPages - 3) {
        start = totalPages - 4;
      }

      if (start > 1) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push('...');
      pages.push(totalPages - 1);
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', fontSize: '0.72rem', color: '#94A3B8' }}>...</span>;
      }
      const pageNum = p as number;
      const isActive = pageNum === currentPage;
      return (
        <button
          key={pageNum}
          type="button"
          onClick={() => handlePageChange(pageNum)}
          style={{
            padding: '4px 9px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: isActive ? '#2563EB' : '#CBD5E1',
            background: isActive ? '#2563EB' : '#FFFFFF',
            color: isActive ? '#FFFFFF' : '#334155',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {pageNum + 1}
        </button>
      );
    });
  };

  return (
    <ListingTabShell loading={loading} error={error} hasData={news.length > 0} crawledAt={data?.crawledAt} onRetry={reload} emptyHint="Chưa có tin tức đã được crawler thu thập cho doanh nghiệp này. Hãy bấm 'AI Crawler Thu Thập'.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header Bar */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={20} style={{ color: '#2563EB' }} />
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Tin Tức & Truyền Thông ({filteredNews.length} bài)
              </h2>
            </div>

            {showManualCrawler && <button
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
            </button>}
          </div>

          {showManualCrawler && crawlMsg && (
            <div style={{ fontSize: '0.65rem', color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: '4px', marginBottom: '10px', fontWeight: 600 }}>
              {crawlMsg}
            </div>
          )}

          {/* Search & Category Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm kiếm tin tức theo tiêu đề hoặc nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.73rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={13} style={{ color: '#64748B' }} />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? '#2563EB' : '#E2E8F0',
                    background: selectedCategory === cat ? '#EFF6FF' : '#F8FAFC',
                    color: selectedCategory === cat ? '#1D4ED8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* News Stream List (Max 8 articles per page) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shown.map((item) => (
            <div key={item.id ?? item.sourceUrl} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: '110px', height: '75px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                />
              )}

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  {item.category && (
                    <span style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                      {item.category}
                    </span>
                  )}
                  <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>
                    {item.sourceName || 'Nguồn Tin'} • {formatDateTime(item.publishedAt) || 'Mới cập nhật'}
                  </span>
                </div>

                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.35 }}>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0F172A', textDecoration: 'none' }}>
                      {repairMojibake(item.title)} <ExternalLink size={11} style={{ display: 'inline', color: '#2563EB' }} />
                    </a>
                  ) : (
                    repairMojibake(item.title)
                  )}
                </h3>

                {item.summary && (
                  <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                    {repairMojibake(item.summary)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Numerated Pagination Bar */}
        {filteredNews.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 16px',
            marginTop: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
              Hiển thị {startItem}–{endItem} trong tổng số {filteredNews.length} bài báo (Trang {currentPage + 1}/{totalPages})
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: currentPage === 0 ? '#F1F5F9' : '#FFFFFF',
                    color: currentPage === 0 ? '#94A3B8' : '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ‹ Trước
                </button>

                {renderPageButtons()}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: currentPage >= totalPages - 1 ? '#F1F5F9' : '#FFFFFF',
                    color: currentPage >= totalPages - 1 ? '#94A3B8' : '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Sau ›
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </ListingTabShell>
  );
};

export default NewsTab;
