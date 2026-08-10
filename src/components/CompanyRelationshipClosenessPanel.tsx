import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Lock, RefreshCw, Save, Star, Trash2, X } from 'lucide-react';
import {
  companyRelationshipClosenessApi,
  type RelationshipClosenessResponse,
} from '../API/companyRelationshipClosenessApi';
import { ROLES, type Role } from '../context/UserContext';
import styles from './CompanyRelationshipClosenessPanel.module.css';

interface CompanyRelationshipClosenessPanelProps {
  companyProfileId: string;
  currentUserRole?: Role;
}

const LEVEL_LABELS: Record<string, string> = {
  CONTACT_ONLY: 'Chỉ mới liên hệ',
  WEAK: 'Quan hệ yếu',
  ESTABLISHED: 'Đã thiết lập',
  CLOSE: 'Thân thiết',
  STRATEGIC: 'Chiến lược',
  UNRATED: 'Chưa đánh giá',
};

const describeStars = (stars: number | null | undefined) => {
  if (!stars) return 'Chưa có mức độ thân thiết';
  return `${stars}/5 sao`;
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildUnrated = (companyProfileId: string): RelationshipClosenessResponse => ({
  targetCompanyProfileId: companyProfileId,
  stars: null,
  label: 'UNRATED',
  note: null,
  ratedByAccountId: null,
  ratedAt: null,
  updatedAt: null,
});

export const CompanyRelationshipClosenessPanel: React.FC<CompanyRelationshipClosenessPanelProps> = ({
  companyProfileId,
  currentUserRole,
}) => {
  const [data, setData] = useState<RelationshipClosenessResponse | null>(null);
  const [draftStars, setDraftStars] = useState(0);
  const [draftNote, setDraftNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const isAdmin = currentUserRole === ROLES.ADMIN;
  const canRequest = Boolean(currentUserRole) && !isAdmin;
  const canEdit = currentUserRole === ROLES.OWNER || currentUserRole === ROLES.MANAGER;
  const canClear = currentUserRole === ROLES.OWNER;

  const displayLabel = useMemo(() => {
    const label = data?.label || 'UNRATED';
    return LEVEL_LABELS[label] || label.replaceAll('_', ' ');
  }, [data?.label]);

  const syncDraft = (next: RelationshipClosenessResponse | null) => {
    setDraftStars(next?.stars ?? 0);
    setDraftNote(next?.note ?? '');
  };

  const loadCloseness = async () => {
    if (!companyProfileId || !canRequest) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await companyRelationshipClosenessApi.get(companyProfileId);
      const next = response.data ?? buildUnrated(companyProfileId);
      setData(next);
      syncDraft(next);
    } catch (error) {
      setData(null);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể tải đánh giá quan hệ.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEditing(false);
    setMessage(null);
    if (!canRequest) {
      setData(null);
      return;
    }

    void loadCloseness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfileId, canRequest]);

  const startEdit = () => {
    syncDraft(data ?? buildUnrated(companyProfileId));
    setMessage(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    syncDraft(data);
    setMessage(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;

    if (draftStars < 1 || draftStars > 5) {
      setMessage({ type: 'error', text: 'Vui lòng chọn mức đánh giá từ 1 đến 5 sao.' });
      return;
    }

    if (draftNote.length > 1000) {
      setMessage({ type: 'error', text: 'Ghi chú không được vượt quá 1000 ký tự.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await companyRelationshipClosenessApi.update(companyProfileId, {
        stars: draftStars,
        note: draftNote.trim() || null,
      });
      const next = response.data;
      setData(next);
      syncDraft(next);
      setEditing(false);
      setMessage({ type: 'ok', text: 'Đã lưu đánh giá độ thân thiết.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể lưu đánh giá quan hệ.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!canClear || !data?.stars) return;
    const confirmed = window.confirm('Xóa đánh giá độ thân thiết hiện tại?');
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    try {
      await companyRelationshipClosenessApi.clear(companyProfileId);
      const unrated = buildUnrated(companyProfileId);
      setData(unrated);
      syncDraft(unrated);
      setEditing(false);
      setMessage({ type: 'ok', text: 'Đã xóa đánh giá độ thân thiết.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể xóa đánh giá quan hệ.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!currentUserRole || isAdmin) {
    const lockedText = !currentUserRole
      ? 'Đang xác định quyền người dùng trước khi tải dữ liệu relationship closeness.'
      : 'System Admin không được truy cập dữ liệu relationship closeness theo rule backend.';

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.iconBox}>
              <Lock size={15} />
            </span>
            <div>
              <h2 className={styles.title}>Độ thân thiết quan hệ</h2>
              <p className={styles.subtitle}>Dữ liệu nội bộ giữa Owner Organization và công ty này</p>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.locked}>
            <Lock size={15} />
            <span>{lockedText}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-busy={loading || saving}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.iconBox}>
            <Star size={15} />
          </span>
          <div>
            <h2 className={styles.title}>Độ thân thiết quan hệ</h2>
            <p className={styles.subtitle}>Manual 1-5 sao với Owner Organization</p>
          </div>
        </div>
        <span className={styles.badge}>{loading ? 'Đang tải' : displayLabel}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.scoreRow}>
          <div className={styles.starGroup} aria-label="Relationship closeness stars">
            {[1, 2, 3, 4, 5].map((value) => {
              const activeStars = editing ? draftStars : data?.stars ?? 0;
              const filled = value <= activeStars;
              return (
                <button
                  key={value}
                  type="button"
                  className={[
                    styles.starButton,
                    filled ? styles.starFilled : '',
                    editing && canEdit ? styles.starButtonEditable : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => editing && canEdit && setDraftStars(value)}
                  disabled={!editing || !canEdit || saving}
                  title={`${value}/5`}
                  aria-label={`${value}/5 sao`}
                >
                  <Star size={16} fill={filled ? 'currentColor' : 'none'} />
                </button>
              );
            })}
          </div>

          <div className={styles.scoreMeta}>
            <div className={styles.levelText}>
              {describeStars(editing ? draftStars : data?.stars)} · {displayLabel}
            </div>
            <div className={styles.timestamp}>
              {formatTime(data?.updatedAt || data?.ratedAt) ? `Cập nhật: ${formatTime(data?.updatedAt || data?.ratedAt)}` : 'Chưa có lịch sử cập nhật'}
            </div>
          </div>
        </div>

        {editing ? (
          <div className={styles.editor}>
            <textarea
              className={styles.textarea}
              value={draftNote}
              maxLength={1000}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Ghi chú lý do đánh giá, ví dụ: mức độ hợp tác, tần suất tương tác, kết quả làm việc..."
              disabled={saving}
            />
            <div className={styles.charCount}>{draftNote.length}/1000</div>
          </div>
        ) : (
          <div className={`${styles.noteBox} ${data?.note ? '' : styles.noteMuted}`}>
            {data?.note || 'Chưa có ghi chú đánh giá quan hệ.'}
          </div>
        )}

        {message && (
          <div className={`${styles.message} ${message.type === 'ok' ? styles.messageOk : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => void loadCloseness()}
            disabled={loading || saving}
            title="Tải lại"
          >
            <RefreshCw size={13} />
            Tải lại
          </button>

          {editing ? (
            <>
              <button type="button" className={styles.button} onClick={cancelEdit} disabled={saving}>
                <X size={13} />
                Hủy
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => void handleSave()}
                disabled={saving || draftStars < 1 || draftNote.length > 1000}
              >
                <Save size={13} />
                {saving ? 'Đang lưu' : 'Lưu'}
              </button>
            </>
          ) : (
            <>
              {canClear && data?.stars ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.dangerButton}`}
                  onClick={() => void handleClear()}
                  disabled={saving}
                >
                  <Trash2 size={13} />
                  Xóa
                </button>
              ) : null}

              {canEdit ? (
                <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={startEdit} disabled={loading || saving}>
                  <Edit3 size={13} />
                  {data?.stars ? 'Cập nhật' : 'Đánh giá'}
                </button>
              ) : (
                <span className={styles.locked}>
                  <Lock size={14} />
                  Staff chỉ có quyền xem trong phạm vi project.
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
