import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, RotateCcw, Search, Trash2 } from 'lucide-react';
import { adminCompanyProfileApi } from '../../API/adminCompanyProfileApi';
import type { ProfileResponse } from '../../types/domain';
import { ConfirmModal } from '../../components/Shared/ConfirmModal';
import styles from './AdminCompanyProfiles.module.css';

type StatusTab = 'ACTIVE' | 'HIDDEN';
type LifecycleAction = 'hide' | 'restore' | 'delete';

interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

interface AdminCompanyProfilesProps {
  setActivePage?: (page: string) => void;
}

const PAGE_SIZE = 20;

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const displayName = (profile: ProfileResponse) =>
  profile.identity?.legalName || profile.identity?.tradeName || '—';

export const AdminCompanyProfiles: React.FC<AdminCompanyProfilesProps> = ({ setActivePage }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<StatusTab>('ACTIVE');
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pending, setPending] = useState<{ action: LifecycleAction; profile: ProfileResponse } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async (status: StatusTab, pageNo: number, searchKeyword: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminCompanyProfileApi.getCompanyProfiles({
        status,
        keyword: searchKeyword || undefined,
        page: pageNo,
        size: PAGE_SIZE,
      });
      setProfiles(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hồ sơ doanh nghiệp.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab, page, keyword);
  }, [tab, page, keyword, load]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setKeyword(search.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const switchTab = (next: StatusTab) => {
    if (next === tab) return;
    setPage(0);
    setTab(next);
  };

  const openDetail = (profile: ProfileResponse) => {
    localStorage.setItem('apms-selected-company', profile.companyId || profile.id);
    setActivePage?.('admin-company-profile-detail');
  };

  const runAction = async () => {
    if (!pending) return;
    const { action, profile } = pending;
    try {
      if (action === 'hide') {
        await adminCompanyProfileApi.hideCompanyProfile(profile.id);
      } else if (action === 'restore') {
        await adminCompanyProfileApi.restoreCompanyProfile(profile.id);
      } else {
        await adminCompanyProfileApi.permanentlyDeleteCompanyProfile(profile.id);
      }
      setToast({
        kind: 'success',
        message: `Đã ${action === 'hide' ? 'ẩn' : action === 'restore' ? 'khôi phục' : 'xóa vĩnh viễn'} hồ sơ "${displayName(profile)}".`,
      });
      setPending(null);
      void load(tab, page, keyword);
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Thao tác thất bại.' });
    }
  };

  return (
    <main className={`cds-page-shell admin-console-page ${styles.page}`} id="admin-company-profiles">
      <div className={styles.header}>
        <h1 className={styles.title}>{t('page.adminCompanyProfiles')}</h1>
        <p className={styles.subtitle}>Quản lý vòng đời hồ sơ doanh nghiệp: ẩn, khôi phục hoặc xóa vĩnh viễn.</p>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          className={`${styles.tab} ${tab === 'ACTIVE' ? styles.tabActive : ''}`}
          role="tab"
          aria-selected={tab === 'ACTIVE'}
          onClick={() => switchTab('ACTIVE')}
        >
          <Eye size={15} /> Hoạt động
          <span className={styles.tabCount}>{tab === 'ACTIVE' ? totalElements : ''}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'HIDDEN' ? styles.tabActive : ''}`}
          role="tab"
          aria-selected={tab === 'HIDDEN'}
          onClick={() => switchTab('HIDDEN')}
        >
          <EyeOff size={15} /> Đã ẩn
          <span className={styles.tabCount}>{tab === 'HIDDEN' ? totalElements : ''}</span>
        </button>
      </div>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={14} />
            <input
              className={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên công ty hoặc mã doanh nghiệp"
            />
          </label>
          <span className={styles.resultCount}>
            {profiles.length} / {totalElements} hồ sơ
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doanh nghiệp</th>
                <th>Lĩnh vực</th>
                <th>Phiên bản</th>
                <th>Cập nhật</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}><div className={styles.loading}>Đang tải…</div></td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6}><div className={styles.error}>{error}</div></td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.empty}>
                      {search ? 'Không tìm thấy hồ sơ phù hợp.' : 'Chưa có hồ sơ nào trong trạng thái này.'}
                    </div>
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <div className={styles.companyName}>{displayName(profile)}</div>
                      {profile.identity?.tradeName && profile.identity?.tradeName !== displayName(profile) && (
                        <div className={styles.companySub}>{profile.identity.tradeName}</div>
                      )}
                    </td>
                    <td>{profile.business?.industries?.slice(0, 2).join(', ') || '—'}</td>
                    <td>v{profile.version ?? 1}</td>
                    <td>{formatTimestamp(profile.metadata?.updatedAt)}</td>
                    <td>
                      <span className={`${styles.chip} ${tab === 'ACTIVE' ? styles.chipActive : styles.chipHidden}`}>
                        {tab === 'ACTIVE' ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.actionView}`} onClick={() => openDetail(profile)} title="Xem hồ sơ">
                          <Eye size={13} /> Xem
                        </button>
                        {tab === 'ACTIVE' && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionWarn}`}
                            onClick={() => setPending({ action: 'hide', profile })}
                            title="Ẩn hồ sơ"
                          >
                            <EyeOff size={13} /> Ẩn
                          </button>
                        )}
                        {tab === 'HIDDEN' && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => setPending({ action: 'restore', profile })}
                            title="Khôi phục hồ sơ"
                          >
                            <RotateCcw size={13} /> Khôi phục
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => setPending({ action: 'delete', profile })}
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Trang trước
          </button>
          <span>Trang {page + 1} / {Math.max(1, totalPages)}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages - 1 || loading} onClick={() => setPage((current) => current + 1)}>
            Trang sau
          </button>
        </div>
      </section>

      {pending && pending.action === 'hide' && (
        <ConfirmModal
          isOpen
          title={`Ẩn hồ sơ — ${displayName(pending.profile)}`}
          message="Hồ sơ sẽ được ẩn khỏi hệ thống nhưng có thể khôi phục."
          confirmText="Ẩn hồ sơ"
          cancelText="Hủy"
          isDestructive={false}
          onConfirm={() => void runAction()}
          onCancel={() => setPending(null)}
        />
      )}

      {pending && pending.action === 'restore' && (
        <ConfirmModal
          isOpen
          title={`Khôi phục hồ sơ — ${displayName(pending.profile)}`}
          message="Khôi phục hồ sơ để hiển thị lại trong hệ thống?"
          confirmText="Khôi phục"
          cancelText="Hủy"
          isDestructive={false}
          onConfirm={() => void runAction()}
          onCancel={() => setPending(null)}
        />
      )}

      {pending && pending.action === 'delete' && (
        <ConfirmModal
          isOpen
          title={`Xóa vĩnh viễn — ${displayName(pending.profile)}`}
          message="Thao tác này sẽ xóa vĩnh viễn hồ sơ doanh nghiệp và không thể khôi phục."
          confirmText="Xóa vĩnh viễn"
          cancelText="Hủy"
          isDestructive
          onConfirm={() => void runAction()}
          onCancel={() => setPending(null)}
        />
      )}

      {toast && createPortal(<div className={`apms-toast ${toast.kind}`}>{toast.message}</div>, document.body)}
    </main>
  );
};
