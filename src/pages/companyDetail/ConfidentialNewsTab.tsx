import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Newspaper,
  Shield,
  Tag,
  User,
} from 'lucide-react';
import { confidentialNewsApi } from '../../API/confidentialNewsApi';
import totpApi from '../../API/totpApi';
import type { CompanyIntelligenceArticleResponse } from '../../types/domain';
import { SecureTotpAccessGate, type SecureTotpGateState } from '../../components/SecureTotpAccessGate';
import { ownerSecureAccess } from '../../utils/ownerSecureAccess';
import type { StepUpVerifyResponse } from '../../API/totpApi';

interface ConfidentialNewsTabProps {
  companyId: string;
  userRole?: string | null;
}

type AuthState = SecureTotpGateState | 'VERIFIED';

const INTERNAL_NEWS_SCOPE = 'COMPANY_INTERNAL_NEWS';

const resolveExpiresInSeconds = (expiresAt?: string, fallback?: number) => {
  if (!expiresAt) return fallback ?? 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString('vi-VN');
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
  <div style={large ? styles.heroFallback : styles.thumbFallback}>
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
      style={large ? styles.heroImage : styles.thumbnail}
      onError={() => setFailed(true)}
    />
  );
};

const ConfidentialNewsTab: React.FC<ConfidentialNewsTabProps> = ({ companyId, userRole }) => {
  const [authState, setAuthState] = useState<AuthState>('CHECKING');
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [articles, setArticles] = useState<CompanyIntelligenceArticleResponse[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<CompanyIntelligenceArticleResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const expiresInLabel = tokenExpiry ? `${Math.max(1, Math.ceil(tokenExpiry / 60))} min` : 'security policy';

  const approvedCount = useMemo(
    () => articles.filter((article) => article.approvedAt || article.createdAt).length,
    [articles],
  );

  const checkInitialState = async () => {
    if (userRole !== 'ROLE_BUSINESS_OWNER' && userRole !== 'BUSINESS_OWNER') {
      setAuthState('FORBIDDEN');
      return;
    }

    try {
      setAuthState('CHECKING');
      const storedSession = ownerSecureAccess.get();
      const secureStatus = await totpApi.getStepUpStatus(INTERNAL_NEWS_SCOPE, companyId, storedSession?.token);
      if (storedSession?.token && secureStatus.data.secureAccessActive) {
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
    setStepUpToken(null);
    setTokenExpiry(null);
    setArticles([]);
    setSelectedArticle(null);
    setError(null);
    void checkInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, companyId]);

  useEffect(() => {
    if (!stepUpToken || !tokenExpiry) return;

    const expiryTime = Date.now() + tokenExpiry * 1000;
    const checkExpiry = window.setInterval(() => {
      if (Date.now() > expiryTime) {
        setStepUpToken(null);
        ownerSecureAccess.clear();
        setArticles([]);
        setSelectedArticle(null);
        void checkInitialState();
      }
    }, 5000);

    return () => window.clearInterval(checkExpiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepUpToken, tokenExpiry]);

  const loadArticles = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await confidentialNewsApi.getArticles(companyId, token);
      setArticles(res.content || []);
      setAuthState('VERIFIED');
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number; code?: string };
      setError(errorObj);
      if (errorObj?.status === 401 || errorObj?.status === 403) {
        setStepUpToken(null);
        ownerSecureAccess.clear();
        setSelectedArticle(null);
        void checkInitialState();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stepUpToken) void loadArticles(stepUpToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepUpToken, companyId]);

  const handleVerified = (secureSession: StepUpVerifyResponse) => {
    const savedSession = ownerSecureAccess.save(secureSession);
    setStepUpToken(savedSession.token);
    setTokenExpiry(resolveExpiresInSeconds(savedSession.expiresAt, savedSession.expiresInSeconds));
    setAuthState('VERIFIED');
    setIsVerifyModalOpen(false);
    setIsSetupModalOpen(false);
  };

  const openArticleDetail = async (article: CompanyIntelligenceArticleResponse) => {
    if (!stepUpToken) return;

    setDetailLoading(true);
    setError(null);
    try {
      const detail = await confidentialNewsApi.getArticle(companyId, article.id, stepUpToken);
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

  if (authState !== 'VERIFIED') {
    return (
      <SecureTotpAccessGate
        state={authState}
        lockedUntil={lockedUntil}
        setupOpen={isSetupModalOpen}
        verifyOpen={isVerifyModalOpen}
        scope={INTERNAL_NEWS_SCOPE}
        resourceId={companyId}
        forbiddenText={'Tin t\u1ee9c n\u1ed9i b\u1ed9 l\u00e0 d\u1eef li\u1ec7u b\u1ea3o m\u1eadt cao. Ch\u1ec9 BUSINESS_OWNER m\u1edbi c\u00f3 quy\u1ec1n truy c\u1eadp.'}
        requiredText={'B\u1ea1n \u0111ang truy c\u1eadp d\u1eef li\u1ec7u t\u00ecnh b\u00e1o doanh nghi\u1ec7p nh\u1ea1y c\u1ea3m. Vui l\u00f2ng x\u00e1c th\u1ef1c \u0111\u1ec3 ti\u1ebfp t\u1ee5c.'}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onCloseSetup={() => setIsSetupModalOpen(false)}
        onSetupSuccess={handleVerified}
        onOpenVerify={() => setIsVerifyModalOpen(true)}
        onCloseVerify={() => setIsVerifyModalOpen(false)}
        onVerified={handleVerified}
      />
    );
  }

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner} />
        <p style={styles.centerText}>Đang tải tin tức nội bộ...</p>
      </div>
    );
  }

  if (error && !selectedArticle) {
    return (
      <div style={styles.centerContainer}>
        <div style={{ ...styles.deniedIcon, backgroundColor: '#fef3c7' }}>
          <AlertTriangle size={48} color="#f59e0b" />
        </div>
        <h3 style={styles.title}>Không thể tải dữ liệu</h3>
        <p style={styles.text}>{error.message}</p>
        <button style={styles.actionBtn} onClick={() => stepUpToken && void loadArticles(stepUpToken)}>
          Làm mới
        </button>
      </div>
    );
  }

  if (selectedArticle) {
    return (
      <article style={styles.detailPage}>
        <div style={styles.detailToolbar}>
          <button type="button" style={styles.backButton} onClick={closeArticleDetail}>
            <ArrowLeft size={16} /> Quay lại danh sách tin
          </button>
          <div style={styles.sessionInfo}>
            <Clock size={14} /> Step-up session expires by {expiresInLabel}
          </div>
        </div>

        <section style={styles.detailHero}>
          <div style={styles.detailHeroImageWrap}>
            <NewsImage article={selectedArticle} large />
          </div>
          <div style={styles.detailHeroText}>
            <div style={styles.detailMetaTop}>
              <span style={styles.confidentialBadge}><Shield size={13} /> Confidential Internal News</span>
              {selectedArticle.approvedAt && <span style={styles.approvedBadge}><CheckCircle2 size={13} /> Đã duyệt</span>}
            </div>
            <h1 style={styles.detailTitle}>{selectedArticle.title}</h1>
            <div style={styles.metaRow}>
              {selectedArticle.sourceName && <span><Newspaper size={14} /> {selectedArticle.sourceName}</span>}
              {selectedArticle.author && <span><User size={14} /> {selectedArticle.author}</span>}
              <span><Calendar size={14} /> {formatDateTime(selectedArticle.publishedAt || selectedArticle.createdAt)}</span>
            </div>
            {selectedArticle.sourceUrl && (
              <a href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer" style={styles.primarySourceLink}>
                Mở nguồn gốc <ExternalLink size={15} />
              </a>
            )}
          </div>
        </section>

        {selectedArticle.summary && (
          <section style={styles.summaryPanel}>
            <h3 style={styles.sectionTitle}>Tóm tắt</h3>
            <p style={styles.summaryText}>{selectedArticle.summary}</p>
          </section>
        )}

        <section style={styles.contentPanel}>
          <h3 style={styles.sectionTitle}>Nội dung bài báo</h3>
          <div style={styles.fullText}>
            {selectedArticle.content || 'Bài báo chưa có nội dung chi tiết.'}
          </div>
        </section>

        {selectedArticle.tags && selectedArticle.tags.length > 0 && (
          <section style={styles.detailTags}>
            {selectedArticle.tags.map((tag) => (
              <span key={tag} style={styles.tag}><Tag size={12} /> {tag}</span>
            ))}
          </section>
        )}
      </article>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitleWrap}>
          <Shield size={20} color="#10b981" />
          <div>
            <h2 style={styles.headerTitle}>Tình báo Doanh nghiệp (Nội bộ)</h2>
            <p style={styles.headerSubtitle}>{articles.length} bài viết đã được duyệt cho Owner.</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => stepUpToken && void loadArticles(stepUpToken)} style={styles.refreshBtn}>
            Làm mới
          </button>
          <div style={styles.sessionInfo}>
            <Clock size={14} /> Step-up session expires by {expiresInLabel}
          </div>
        </div>
      </div>

      <section style={styles.newsHero}>
        <div>
          <p style={styles.heroEyebrow}>Confidential Intelligence</p>
          <h3 style={styles.newsHeroTitle}>Tin tức nội bộ đã được Manager phê duyệt</h3>
          <p style={styles.newsHeroText}>Mỗi bài viết hiển thị hình ảnh, nguồn gốc và trạng thái phê duyệt. Bấm vào bài hoặc nút xem để mở trang chi tiết riêng.</p>
        </div>
        <div style={styles.heroStat}>
          <strong>{approvedCount}</strong>
          <span>Approved articles</span>
        </div>
      </section>

      {articles.length === 0 ? (
        <div style={styles.emptyState}>
          <Newspaper size={40} color="#cbd5e1" />
          <h3 style={styles.emptyTitle}>Chưa có tin tức nội bộ được phê duyệt</h3>
          <p style={styles.emptyText}>Hiện chưa có bài báo nội bộ nào đã được Manager phê duyệt cho doanh nghiệp này.</p>
        </div>
      ) : (
        <div style={styles.newsGrid}>
          {articles.map((article) => (
            <button
              key={article.id}
              type="button"
              style={styles.newsCard}
              onClick={() => void openArticleDetail(article)}
              disabled={detailLoading}
            >
              <div style={styles.cardImageWrap}>
                <NewsImage article={article} />
              </div>
              <div style={styles.cardContent}>
                <div style={styles.cardMeta}>
                  <span><Newspaper size={13} /> {article.sourceName || getHostName(article.sourceUrl) || 'Internal News'}</span>
                  <span><Calendar size={13} /> {formatDate(article.publishedAt || article.createdAt)}</span>
                  {article.approvedAt && <span style={styles.approvedInline}><CheckCircle2 size={13} /> Đã duyệt</span>}
                </div>
                <h3 style={styles.cardTitle}>{article.title}</h3>
                <p style={styles.cardSummary}>{article.summary || 'Bấm để xem nội dung chi tiết của bài báo nội bộ này.'}</p>
                <div style={styles.cardFooter}>
                  <div style={styles.tags}>
                    {article.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} style={styles.tag}><Tag size={12} /> {tag}</span>
                    ))}
                  </div>
                  <span style={styles.readMore}>Xem chi tiết</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    minHeight: '300px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f1f5f9',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  centerText: { color: '#64748b', marginTop: '16px' },
  deniedIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  infoIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: { margin: '0 0 12px 0', fontSize: '20px', color: '#0f172a' },
  text: { margin: '0 0 24px 0', color: '#64748b', maxWidth: '460px', lineHeight: 1.5 },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px 18px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  headerTitleWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' },
  headerSubtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '13px' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  refreshBtn: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  sessionInfo: { fontSize: '13px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '5px' },
  newsHero: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '18px',
    alignItems: 'center',
    flexWrap: 'wrap',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    background: '#eff6ff',
    padding: '22px',
    marginBottom: '18px',
  },
  heroEyebrow: { margin: '0 0 8px', color: '#1d4ed8', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' },
  newsHeroTitle: { margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: 900 },
  newsHeroText: { margin: '10px 0 0', color: '#475569', lineHeight: 1.55 },
  heroStat: {
    minWidth: '132px',
    border: '1px solid #93c5fd',
    borderRadius: '12px',
    background: '#fff',
    padding: '16px',
    textAlign: 'center',
  },
  newsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  newsCard: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 0,
    textAlign: 'left',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  },
  cardImageWrap: { height: '190px', background: '#f1f5f9', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbFallback: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '16px',
    background: '#e0f2fe',
    color: '#075985',
    textAlign: 'center',
  },
  cardContent: { padding: '16px' },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#64748b', fontSize: '13px', marginBottom: '12px' },
  approvedInline: { color: '#059669', fontWeight: 800 },
  cardTitle: { margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 900, lineHeight: 1.35 },
  cardSummary: {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: '12px 0 0',
    color: '#475569',
    lineHeight: 1.55,
    fontSize: '14px',
  },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '16px' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '7px' },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 9px',
    borderRadius: '999px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
  },
  readMore: { color: '#2563eb', fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap' },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  emptyTitle: { marginTop: '16px', marginBottom: '8px', color: '#1e293b', fontSize: '16px' },
  emptyText: { margin: 0, color: '#64748b' },
  detailPage: { display: 'flex', flexDirection: 'column', gap: '18px' },
  detailToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 0',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#fff',
    color: '#334155',
    padding: '8px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  detailHero: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: '24px',
    alignItems: 'stretch',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    background: '#fff',
    overflow: 'hidden',
  },
  detailHeroImageWrap: { minHeight: '360px', background: '#f1f5f9' },
  heroImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroFallback: {
    minHeight: '360px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '24px',
    background: '#dbeafe',
    color: '#1e3a8a',
    textAlign: 'center',
  },
  detailHeroText: { padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  detailMetaTop: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' },
  confidentialBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#ecfdf5',
    color: '#047857',
    fontSize: '12px',
    fontWeight: 900,
  },
  approvedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#dcfce7',
    color: '#15803d',
    fontSize: '12px',
    fontWeight: 900,
  },
  detailTitle: { margin: 0, color: '#0f172a', fontSize: '32px', lineHeight: 1.2, fontWeight: 900 },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '14px', color: '#64748b', fontSize: '14px', marginTop: '18px' },
  primarySourceLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: 'fit-content',
    marginTop: '22px',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '10px 14px',
    textDecoration: 'none',
    fontWeight: 900,
  },
  summaryPanel: {
    border: '1px solid #bfdbfe',
    borderLeft: '4px solid #2563eb',
    borderRadius: '12px',
    background: '#eff6ff',
    padding: '20px',
  },
  contentPanel: { border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', padding: '24px' },
  sectionTitle: { margin: '0 0 12px', color: '#0f172a', fontSize: '16px', fontWeight: 900 },
  summaryText: { margin: 0, color: '#1e293b', lineHeight: 1.7, fontSize: '16px', whiteSpace: 'pre-wrap' },
  fullText: { color: '#1e293b', lineHeight: 1.85, fontSize: '16px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  detailTags: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
};

export default ConfidentialNewsTab;
