import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Newspaper, AlertTriangle, ExternalLink, ArrowLeft, Clock, CheckCircle2, User, Calendar, Tag, Search } from 'lucide-react';
import { useUser, ROLES } from '../context/UserContext';
import { confidentialNewsApi } from '../API/confidentialNewsApi';
import totpApi from '../API/totpApi';
import { api } from '../services/api';
import { SecureTotpAccessGate } from '../components/SecureTotpAccessGate';
import { ownerSecureAccess } from '../utils/ownerSecureAccess';
import type { CompanyIntelligenceArticleResponse, ProfileResponse } from '../types/domain';
import styles from './OwnerInternalNewsView.module.css';

const GLOBAL_INTERNAL_NEWS_SCOPE = undefined;
const GLOBAL_RESOURCE_ID = undefined;

const resolveExpiresInSeconds = (expiresAt?: string, fallback?: number) => {
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }
  return fallback || 1800; // default 30 mins
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return 'Unknown time';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('vi-VN');
};

const getHostName = (url?: string | null) => {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const articleImage = (article: CompanyIntelligenceArticleResponse) => article.externalImageUrl || null;

const VisualFallback: React.FC<{ article: CompanyIntelligenceArticleResponse; large?: boolean }> = ({ article, large }) => (
  <div className={styles.fallbackImage}>
    <Newspaper size={large ? 46 : 28} />
    <strong>{article.sourceName || getHostName(article.sourceUrl) || 'Internal News'}</strong>
    {article.hasImage && <span>Image attached</span>}
  </div>
);

const NewsImage: React.FC<{ article: CompanyIntelligenceArticleResponse; large?: boolean }> = ({ article, large }) => {
  const [failed, setFailed] = useState(false);
  const image = articleImage(article);
  if (!image || failed) return <VisualFallback article={article} large={large} />;

  return (
    <img
      src={image}
      alt={article.title}
      className={large ? styles.detailHeroImage : styles.cardImage}
      onError={() => setFailed(true)}
    />
  );
};

export const OwnerInternalNewsView: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useUser();
  const userRole = currentUser?.role;

  // -- 2FA State --
  const [authState, setAuthState] = useState<'CHECKING' | 'NOT_ENROLLED' | 'LOCKED' | 'TOTP_REQUIRED' | 'VERIFIED' | 'FORBIDDEN'>('CHECKING');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  // -- Data State --
  const [articles, setArticles] = useState<CompanyIntelligenceArticleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [companyLookup, setCompanyLookup] = useState<Record<string, string>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  const [selectedArticle, setSelectedArticle] = useState<CompanyIntelligenceArticleResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const checkInitialState = async () => {
    if (userRole !== ROLES.OWNER) {
      setAuthState('FORBIDDEN');
      return;
    }

    try {
      setAuthState('CHECKING');
      const storedSession = ownerSecureAccess.get();
      
      let secureStatus;
      try {
        secureStatus = await totpApi.getStepUpStatus(GLOBAL_INTERNAL_NEWS_SCOPE, GLOBAL_RESOURCE_ID, storedSession?.token);
      } catch (err) {
        console.warn('getStepUpStatus failed', err);
      }
      
      if (storedSession?.token && secureStatus?.data?.secureAccessActive) {
        setStepUpToken(storedSession.token);
        setTokenExpiry(resolveExpiresInSeconds(secureStatus.data.expiresAt, storedSession.expiresInSeconds));
        setAuthState('VERIFIED');
        return;
      }

      const statusRes = await totpApi.getStatus();

      if (!statusRes.data.enrolled || !statusRes.data.enabled) {
        setAuthState('NOT_ENROLLED');
      } else if (statusRes.data.locked) {
        setLockedUntil(statusRes.data.lockedUntil || 'Vài phút nữa');
        setAuthState('LOCKED');
      } else {
        setAuthState('TOTP_REQUIRED');
      }
    } catch (err) {
      console.error('Failed to check TOTP status', err);
      setAuthState('TOTP_REQUIRED');
    }
  };

  useEffect(() => {
    void checkInitialState();
  }, [userRole]);

  useEffect(() => {
    if (!stepUpToken || !tokenExpiry) return;

    const expiryTime = Date.now() + tokenExpiry * 1000;
    const checkExpiry = window.setInterval(() => {
      if (Date.now() > expiryTime) {
        setStepUpToken(null);
        ownerSecureAccess.clear();
        setArticles([]);
        void checkInitialState();
      }
    }, 5000);

    return () => window.clearInterval(checkExpiry);
  }, [stepUpToken, tokenExpiry]);

  const loadCompanies = async () => {
    try {
      const res = await api.get<any>('/profiles', { params: { size: 1000 } });
      const profiles: ProfileResponse[] = res.data.content || [];
      const lookup: Record<string, string> = {};
      profiles.forEach(p => {
        lookup[p.id] = p.identity?.tradeName || p.identity?.legalName || 'Unknown Company';
      });
      setCompanyLookup(lookup);
    } catch (err) {
      console.error('Failed to load companies for filter', err);
    }
  };

  const loadData = async (token: string, page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await confidentialNewsApi.getAllArticles(token, selectedCompanyId, page, 10);
      setArticles(res.content || []);
      setTotalPages(res.totalPages || 1);
      setCurrentPage(page);
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number };
      setError(errorObj);
      if (errorObj.status === 401 || errorObj.status === 403) {
        setStepUpToken(null);
        ownerSecureAccess.clear();
        void checkInitialState();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authState === 'VERIFIED' && stepUpToken) {
      void loadCompanies();
    }
  }, [authState, stepUpToken]);

  useEffect(() => {
    if (authState === 'VERIFIED' && stepUpToken) {
      void loadData(stepUpToken, 0);
      setSelectedArticle(null);
    }
  }, [selectedCompanyId, authState, stepUpToken]);

  const handleVerified = (response: any) => {
    ownerSecureAccess.save(response);
    setStepUpToken(response.stepUpToken);
    setTokenExpiry(resolveExpiresInSeconds(response.expiresAt, response.expiresInSeconds));
    setIsSetupModalOpen(false);
    setIsVerifyModalOpen(false);
    setAuthState('VERIFIED');
  };

  const openArticleDetail = async (article: CompanyIntelligenceArticleResponse) => {
    if (!stepUpToken) return;

    setSelectedArticle(article);
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await confidentialNewsApi.getArticle(article.companyProfileId, article.id, stepUpToken);
      setSelectedArticle(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number };
      setError(errorObj);
      if (errorObj.status === 401 || errorObj.status === 403) {
        setStepUpToken(null);
        ownerSecureAccess.clear();
        setSelectedArticle(null);
        void checkInitialState();
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeArticleDetail = () => {
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterOptions = useMemo(() => {
    return Object.entries(companyLookup)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companyLookup]);

  if (authState !== 'VERIFIED') {
    return (
      <div className={styles.container}>
        <SecureTotpAccessGate
          state={authState}
          lockedUntil={lockedUntil}
          setupOpen={isSetupModalOpen}
          verifyOpen={isVerifyModalOpen}
          scope={GLOBAL_INTERNAL_NEWS_SCOPE}
          resourceId={GLOBAL_RESOURCE_ID}
          forbiddenText={'Tin tức nội bộ là dữ liệu bảo mật cao. Chỉ BUSINESS_OWNER mới có quyền truy cập.'}
          requiredText={'Bạn đang truy cập dữ liệu tình báo doanh nghiệp nhạy cảm toàn hệ thống. Vui lòng xác thực để tiếp tục.'}
          onOpenSetup={() => setIsSetupModalOpen(true)}
          onCloseSetup={() => setIsSetupModalOpen(false)}
          onSetupSuccess={handleVerified}
          onOpenVerify={() => setIsVerifyModalOpen(true)}
          onCloseVerify={() => setIsVerifyModalOpen(false)}
          onVerified={handleVerified}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Shield size={24} className={styles.icon} />
            Global Internal News Hub
          </h1>
          <p className={styles.subtitle}>Consolidate internal news from all businesses within the system.</p>
        </div>
        {!selectedArticle && (
          <select 
            className={styles.filterSelect}
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="ALL">All Companies</option>
            {filterOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {detailLoading && !selectedArticle ? (
        <div className={styles.centerContainer}>
          <div className={styles.spinner} />
          <p className={styles.centerText}>Loading details...</p>
        </div>
      ) : error && !selectedArticle ? (
        <div className={styles.centerContainer}>
           <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
           <p className={styles.errorText}>Error loading data: {error.message}</p>
           <button onClick={() => stepUpToken && void loadData(stepUpToken, currentPage)}>Refresh</button>
        </div>
      ) : selectedArticle ? (
        <article className={styles.detailPage}>
          <div className={styles.detailToolbar}>
            <button type="button" className={styles.backButton} onClick={closeArticleDetail}>
              <ArrowLeft size={16} /> Back to List
            </button>
          </div>

          <section className={styles.detailHero}>
            <div className={styles.detailHeroImageWrap}>
              <NewsImage article={selectedArticle} large />
            </div>
            <div className={styles.detailHeroText}>
              <div className={styles.detailMetaTop}>
                <span className={styles.confidentialBadge}><Shield size={13} /> Confidential Internal News</span>
                {selectedArticle.approvedAt && (
                  <span className={styles.approvedBadge}>
                    <CheckCircle2 size={13} /> 
                    Đã duyệt{selectedArticle.approvedBy ? ` bởi ${selectedArticle.approvedBy}` : ''}
                  </span>
                )}
              </div>
              <h1 className={styles.detailTitle}>{selectedArticle.title}</h1>
              <div className={styles.metaRow}>
                {selectedArticle.sourceName && <span><Newspaper size={14} /> {selectedArticle.sourceName}</span>}
                {selectedArticle.author && <span><User size={14} /> {selectedArticle.author}</span>}
                <span><Calendar size={14} /> {formatDateTime(selectedArticle.publishedAt || selectedArticle.createdAt)}</span>
              </div>
              {selectedArticle.sourceUrl && (
                <a href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.primarySourceLink}>
                  Mở nguồn gốc <ExternalLink size={15} />
                </a>
              )}
            </div>
          </section>

          {selectedArticle.summary && (
            <section className={styles.summaryPanel}>
              <h3 className={styles.sectionTitle}>Summary</h3>
              <p className={styles.summaryText}>{selectedArticle.summary}</p>
            </section>
          )}

          <section className={styles.contentPanel}>
            <h3 className={styles.sectionTitle}>Content</h3>
            <div className={styles.fullText}>
              {selectedArticle.content || 'No detailed content available.'}
            </div>
          </section>

          {selectedArticle.tags && selectedArticle.tags.length > 0 && (
            <section className={styles.detailTags}>
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className={styles.tag}><Tag size={12} /> {tag}</span>
              ))}
            </section>
          )}
        </article>
      ) : loading ? (
        <div className={styles.centerContainer}>
          <div className={styles.spinner} />
          <p className={styles.centerText}>Loading news...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.centerContainer}>
          <Newspaper size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p className={styles.centerText}>No internal news articles available{selectedCompanyId !== 'ALL' ? ' for this company' : ''}.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {articles.map((article) => (
              <div 
                key={article.id} 
                className={styles.card}
                onClick={() => void openArticleDetail(article)}
              >
                <div className={styles.cardImageWrap}>
                   <NewsImage article={article} />
                </div>
                <div className={styles.cardBody}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Newspaper size={13} /> {article.sourceName || getHostName(article.sourceUrl) || 'Internal News'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> {formatDateTime(article.publishedAt || article.createdAt)}</span>
                    </div>
                    {article.approvedAt && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> 
                        Approved{article.approvedBy ? ` by ${article.approvedBy}` : ''}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>{article.title}</h3>
                  <p className={styles.cardSummary}>{article.summary || 'Click to view the detailed content of this internal news article.'}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                      {article.tags?.slice(0, 2).map((tag) => (
                         <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}><Tag size={10} /> {tag}</span>
                      ))}
                    </div>
                    <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}>View Details</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.pagination}>
            <button 
              className={styles.pageBtn}
              disabled={currentPage <= 0 || loading}
              onClick={() => stepUpToken && void loadData(stepUpToken, currentPage - 1)}
            >
              Trang trước
            </button>
            <span className={styles.pageInfo}>
              Trang {currentPage + 1} / {Math.max(1, totalPages)}
            </span>
            <button 
              className={styles.pageBtn}
              disabled={currentPage >= totalPages - 1 || loading}
              onClick={() => stepUpToken && void loadData(stepUpToken, currentPage + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </div>
  );
};
