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
  CONTACT_ONLY: 'Contact only',
  WEAK: 'Weak relationship',
  ESTABLISHED: 'Established',
  CLOSE: 'Close',
  STRATEGIC: 'Strategic',
  UNRATED: 'Unrated',
};

const describeStars = (stars?: number | null) => {
  switch (stars) {
    case 1: return '1 - Disconnected';
    case 2: return '2 - Low';
    case 3: return '3 - Moderate';
    case 4: return '4 - Strong';
    case 5: return '5 - Strategic';
    default: return 'Unrated';
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
    setDraftStars(next?.stars ?? 0);
    setDraftNote(next?.note ?? '');
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
      setMessage({ type: 'error', text: 'Vui lòng chọn mức đánh giá từ 1 đến 5 sao.' });
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
    : (data?.stars ? 'Update' : 'Rate');

  if (!currentUserRole || isAdmin) {
    const lockedText = !currentUserRole
      ? 'Determining user permissions before loading relationship closeness data.'
      : 'System Admin cannot access relationship closeness data per backend rules.';

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.iconBox}>
              <Lock size={15} />
            </span>
            <div>
              <h2 className={styles.title}>Relationship Affinity</h2>
              <p className={styles.subtitle}>Internal data between Owner Organization and this company</p>
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
            <h2 className={styles.title}>Relationship Affinity</h2>
            <p className={styles.subtitle}>Manual 1-5 stars with Owner Organization</p>
          </div>
        </div>
        <span className={styles.badge}>{loading ? 'Loading' : displayLabel}</span>
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
              {formatTime(effectiveTime) ? `Updated: ${formatTime(effectiveTime)}` : 'No update history'}
            </div>
          </div>
        </div>

        {managerLockedByOwner ? (
          <div className={styles.finalNotice}>
            <Lock size={14} />
            <span>Owner has provided the final rating. Manager can only view, no further updates allowed.</span>
          </div>
        ) : null}

        {(data?.managerStars || data?.ownerStars) ? (
          <div className={styles.ratingTrail}>
            {data?.managerStars ? (
              <div className={styles.trailItem}>
                <span className={styles.trailLabel}>Manager</span>
                <span>{describeStars(data.managerStars)}{formatTime(data.managerRatedAt) ? ` · ${formatTime(data.managerRatedAt)}` : ''}</span>
              </div>
            ) : null}
            {data?.ownerStars ? (
              <div className={styles.trailItem}>
                <span className={styles.trailLabel}>Final Owner</span>
                <span>{describeStars(data.ownerStars)}{formatTime(data.ownerRatedAt) ? ` · ${formatTime(data.ownerRatedAt)}` : ''}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {editing ? (
          <div className={styles.editor}>
            <textarea
              className={styles.textarea}
              value={draftNote}
              maxLength={1000}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Note reasons for rating, e.g.: level of cooperation, interaction frequency, work results..."
              disabled={saving}
            />
            <div className={styles.charCount}>{draftNote.length}/1000</div>
          </div>
        ) : (
          <div className={`${styles.noteBox} ${data?.note ? '' : styles.noteMuted}`}>
            {data?.note || 'No relationship rating notes.'}
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
            title="Reload"
          >
            <RefreshCw size={13} />
            Reload
          </button>

          {editing ? (
            <>
              <button type="button" className={styles.button} onClick={cancelEdit} disabled={saving}>
                <X size={13} />
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => void handleSave()}
                disabled={saving || draftStars < 1 || draftNote.length > 1000}
              >
                <Save size={13} />
                {saving ? 'Saving' : 'Save'}
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
                  Delete
                </button>
              ) : null}

              {canEdit ? (
                <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={startEdit} disabled={loading || saving}>
                  <Edit3 size={13} />
                  {editButtonText}
                </button>
              ) : (
                <span className={styles.locked}>
                  <Lock size={14} />
                  {managerLockedByOwner ? 'Owner has made the final rating.' : 'Staff only has view access within project.'}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
