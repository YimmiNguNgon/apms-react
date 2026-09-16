import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Lock, Save, Star, Trash2, X } from 'lucide-react';
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
  CONTACT_ONLY: 'Contact only',
  WEAK: 'Weak relationship',
  ESTABLISHED: 'Established',
  CLOSE: 'Close',
  STRATEGIC: 'Strategic',
  UNRATED: 'Chưa có đánh giá',
};

const describeStars = (stars?: number | null) => {
  switch (stars) {
    case 1: return '1 / 5 · Contact Only';
    case 2: return '2 / 5 · Weak';
    case 3: return '3 / 5 · Established';
    case 4: return '4 / 5 · Close';
    case 5: return '5 / 5 · Strategic';
    default: return 'Chưa có đánh giá';
  }
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildUnrated = (
  companyProfileId: string,
  permissions?: { canUpdate?: boolean; canDelete?: boolean },
): RelationshipClosenessResponse => ({
  targetCompanyProfileId: companyProfileId,
  stars: null,
  label: 'UNRATED',
  note: null,
  ratedByAccountId: null,
  ratedByRole: null,
  ratedAt: null,
  updatedAt: null,
  ownerFinalized: false,
  managerStars: null,
  managerNote: null,
  managerRatedByAccountId: null,
  managerRatedAt: null,
  ownerStars: null,
  ownerNote: null,
  ownerRatedByAccountId: null,
  ownerRatedAt: null,
  canUpdate: Boolean(permissions?.canUpdate),
  canDelete: Boolean(permissions?.canDelete),
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
  const canEditByRole = currentUserRole === ROLES.OWNER || currentUserRole === ROLES.MANAGER;
  const canClearByRole = currentUserRole === ROLES.OWNER;
  const ownerFinalized = Boolean(data?.ownerFinalized);
  const managerLockedByOwner = currentUserRole === ROLES.MANAGER && ownerFinalized;
  const canEdit = Boolean(data ? data.canUpdate : canEditByRole) && !managerLockedByOwner;
  const canClear = Boolean(data ? data.canDelete : canClearByRole);
  const effectiveTime = ownerFinalized ? data?.ownerRatedAt : data?.updatedAt || data?.ratedAt;

  const displayLabel = useMemo(() => {
    const label = data?.label || 'UNRATED';
    return LEVEL_LABELS[label] || label.replaceAll('_', ' ');
  }, [data?.label]);

  const syncDraft = (next: RelationshipClosenessResponse | null) => {
    setDraftStars(next?.stars || 0);
    setDraftNote(next?.note || '');
  };

  const loadCloseness = async () => {
    if (!companyProfileId || !canRequest) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await companyRelationshipClosenessApi.get(companyProfileId);
      const next = response.data ?? buildUnrated(companyProfileId, { canUpdate: canEditByRole, canDelete: canClearByRole });
      setData(next);
      syncDraft(next);
    } catch (error) {
      setData(null);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load relationship rating.',
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
    if (!canEdit) return;
    syncDraft(data ?? buildUnrated(companyProfileId, { canUpdate: canEditByRole, canDelete: canClearByRole }));
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
      setMessage({ type: 'error', text: 'Please select a rating between 1 and 5 stars.' });
      return;
    }

    if (draftNote.length > 1000) {
      setMessage({ type: 'error', text: 'Note cannot exceed 1000 characters.' });
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
      setMessage({ type: 'ok', text: 'Relationship rating saved.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save relationship rating.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!canClear || !data?.stars) return;
    const confirmed = window.confirm('Delete the current relationship rating?');
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    try {
      await companyRelationshipClosenessApi.clear(companyProfileId);
      const unrated = buildUnrated(companyProfileId, { canUpdate: canEditByRole, canDelete: canClearByRole });
      setData(unrated);
      syncDraft(unrated);
      setEditing(false);
      setMessage({ type: 'ok', text: 'Relationship rating deleted.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not delete relationship rating.',
      });
    } finally {
      setSaving(false);
    }
  };

  const editButtonText = currentUserRole === ROLES.OWNER
    ? (data?.ownerFinalized ? 'Update final rating' : 'Final rating')
    : (data?.stars ? 'Update' : 'Đánh giá');

  if (!currentUserRole || isAdmin) {
    const lockedText = !currentUserRole
      ? 'Đang xác định quyền...'
      : 'Admin hệ thống không truy cập dữ liệu quan hệ.';

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Star size={13} style={{ color: '#94A3B8' }} />
            <div>
              <h2 className={styles.title}>Relationship Closeness</h2>
              <p className={styles.subtitle}>Manual 1-5 stars with Owner Organization</p>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.locked}>
            <Lock size={12} />
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
          <Star size={13} fill="#F59E0B" color="#F59E0B" />
          <div>
            <h2 className={styles.title}>Relationship Closeness</h2>
            <p className={styles.subtitle}>Manual 1-5 stars with Owner Organization</p>
          </div>
        </div>
        <span className={styles.badge}>{loading ? 'Loading...' : describeStars(data?.stars)}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Current Relationship Rating</div>
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
                    title={`${value} sao`}
                    aria-label={`${value} sao`}
                  >
                    <Star size={16} fill={filled ? 'currentColor' : 'none'} />
                  </button>
                );
              })}
            </div>

            <div className={styles.scoreMeta}>
              <span className={styles.levelText}>
                {describeStars(editing ? draftStars : data?.stars)}
              </span>
              {data?.stars && formatTime(effectiveTime) ? (
                <span className={styles.timestamp}>
                  · {formatTime(effectiveTime)}
                </span>
              ) : null}
            </div>
          </div>

          {managerLockedByOwner ? (
            <div className={styles.finalNotice}>
              <Lock size={14} />
              <span>Owner has finalized this rating. Manager view only.</span>
            </div>
          ) : null}
        </div>

        {(data?.managerStars || data?.ownerStars) ? (
          <div className={styles.sectionDivider}>
            <div className={styles.sectionTitle}>Assessment History</div>
            <div className={styles.ratingTrail}>
              {data?.managerStars ? (
                <div className={styles.trailItem}>
                  <span className={styles.trailLabel}>Manager Assessment</span>
                  <span className={styles.trailValue}>
                    {describeStars(data.managerStars)}
                    {formatTime(data.managerRatedAt) ? ` · ${formatTime(data.managerRatedAt)}` : ''}
                  </span>
                </div>
              ) : null}
              {data?.ownerStars ? (
                <div className={styles.trailItem}>
                  <span className={styles.trailLabel}>Owner Final Assessment</span>
                  <span className={styles.trailValue}>
                    {describeStars(data.ownerStars)}
                    {formatTime(data.ownerRatedAt) ? ` · ${formatTime(data.ownerRatedAt)}` : ''}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={styles.sectionDivider}>
          <div className={styles.sectionTitle}>Notes & Context</div>
          {editing ? (
            <div className={styles.editor}>
              <textarea
                className={styles.textarea}
                value={draftNote}
                maxLength={1000}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="Enter note regarding relationship, collaboration history, or key context..."
                disabled={saving}
              />
              <div className={styles.charCount}>{draftNote.length}/1000</div>
            </div>
          ) : (
            <div className={`${styles.noteBox} ${data?.note ? '' : styles.noteMuted}`}>
              {data?.note || 'No notes recorded for this relationship rating.'}
            </div>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'ok' ? styles.messageOk : styles.messageError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.actions}>
          {editing ? (
            <>
              <button type="button" className={styles.button} onClick={cancelEdit} disabled={saving}>
                <X size={12} />
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => void handleSave()}
                disabled={saving || draftStars < 1 || draftNote.length > 1000}
              >
                <Save size={12} />
                {saving ? 'Saving...' : 'Save'}
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
                  title="Delete rating"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              ) : null}

              {canEdit ? (
                <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={startEdit} disabled={loading || saving}>
                  <Edit3 size={12} />
                  {editButtonText}
                </button>
              ) : (
                <span className={styles.locked}>
                  <Lock size={12} />
                  {managerLockedByOwner ? 'Owner finalized.' : 'Staff view only.'}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
