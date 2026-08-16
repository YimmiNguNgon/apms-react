import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { CandidateResponse, PageResult, ProjectResponse } from '../types/domain';

type QueueCandidate = CandidateResponse & {
  identity?: { legalName?: string; tradeName?: string };
  validation?: { errors?: Array<{ message?: string } | string> };
};

const candidateName = (candidate: QueueCandidate) =>
  String(candidate.identity?.tradeName || candidate.identity?.legalName || candidate.companyName || candidate.id);

const confidence = (candidate: QueueCandidate) =>
  typeof candidate.relationshipConfidenceScore === 'number'
    ? Math.round(candidate.relationshipConfidenceScore)
    : null;

const getCreatedAtFromMongoId = (id: string) => {
  if (!id || id.length !== 24) return null;
  const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
  return new Date(timestamp);
};

export const ValidationQueue: React.FC = () => {
  const { t } = useTranslation('common');
  const [records, setRecords] = useState<QueueCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      setLoading(true);
      setError(null);

      try {
        const projectId = localStorage.getItem('apms-active-project');
        const projects = projectId
          ? [{ id: Number(projectId) } as ProjectResponse]
          : (await api.get<PageResult<ProjectResponse>>('/projects', { params: { page: 0, size: 100 } })).data.content;

        const responses = await Promise.all(
          (projects || []).map((project) =>
            api.get<PageResult<QueueCandidate>>(`/projects/${project.id}/candidates`, {
              params: { page: 0, size: 100 },
            }).catch(() => null),
          ),
        );

        if (!cancelled) {
          const allRecords = responses.flatMap((response) => response?.data.content ?? []);
          // Sắp xếp candidate theo thời gian tạo mới nhất
          allRecords.sort((a, b) => {
            const dateA = getCreatedAtFromMongoId(a.id)?.getTime() || 0;
            const dateB = getCreatedAtFromMongoId(b.id)?.getTime() || 0;
            return dateB - dateA;
          });
          setRecords(allRecords);
        }
      } catch (loadError) {
        if (!cancelled) {
          setRecords([]);
          setError(loadError instanceof Error ? loadError.message : t('queues.loading'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadQueue();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="page active" id="page-validate">
      <div className="page-header">
        <h1>{t('queues.validationTitle')}</h1>
        <span className="badge badge-yellow" style={{ fontSize: 14, padding: '4px 12px' }}>
          {loading ? t('generic.loading') : t('queues.records', { count: records.length })}
        </span>
      </div>

      {error && <div className="workspace-inline-error">{error}</div>}
      {loading ? <div className="workspace-inline-note">{t('queues.loading')}</div> : null}

      {!loading && !error && records.length === 0 ? (
        <div className="workspace-empty">{t('queues.empty')}</div>
      ) : null}

      <div className="company-list">
        {records.map((record) => {
          const score = confidence(record);
          const errors = record.validation?.errors ?? [];
          const createdAt = getCreatedAtFromMongoId(record.id);
          const isNew = createdAt && (Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000);

          return (
            <div key={record.id} className="company-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {candidateName(record)}
                    {isNew && <span style={{ fontSize: '10px', backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>New</span>}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    <p>{t('queues.status')}: <strong style={{ color: 'var(--text)' }}>{record.status}</strong></p>
                    <p>Created: <strong>{createdAt ? createdAt.toLocaleString() : 'Unknown'}</strong></p>
                  </div>
                </div>
                {score !== null && <span className={`confidence ${score >= 85 ? 'high' : score >= 70 ? 'medium' : 'low'}`}>AI: {score}%</span>}
              </div>
              {errors.length > 0 ? (
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 14 }}>
                  {errors.map((item, index) => <div key={index}>{typeof item === 'string' ? item : String((item as { message?: unknown }).message ?? 'Validation issue')}</div>)}
                </div>
              ) : <div className="workspace-empty">{t('queues.noIssues')}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
};
