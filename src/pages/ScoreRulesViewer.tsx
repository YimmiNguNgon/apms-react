import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  Info,
  LineChart,
  Search,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';
import { roleEvaluationApi } from '../API/roleEvaluationApi';
import type { RoleEvaluationVersionResponse, RoleScoreRuleSetResponse, ScoreRole } from '../types/domain';
import { API_BASE_URL } from '../services/api';
import { SCORE_RULES } from '../constants/scoreRules';
import { roleEvaluationRoleLabel } from '../utils/roleEvaluationStatus';
import styles from './ScoreRulesViewer.module.css';

type ScoreBand = 'strong' | 'watch' | 'risk';

const roleOptions: Array<{ value: 'ALL' | ScoreRole; label: string }> = [
  { value: 'ALL', label: 'All roles' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'POTENTIAL_PARTNER', label: 'Potential partner' },
  { value: 'COMPETITOR', label: 'Competitor' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
];

const clampScore = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const scoreBand = (value: number | null): ScoreBand => {
  if (value === null) return 'watch';
  if (value >= 70) return 'strong';
  if (value >= 45) return 'watch';
  return 'risk';
};

const scoreLabel = (band: ScoreBand) => {
  if (band === 'strong') return 'Strong';
  if (band === 'risk') return 'Needs review';
  return 'Watch';
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const labelFromKey = (key: string) =>
  key
    .replace(/Score$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

const criterionScore = (evaluation: RoleEvaluationVersionResponse, key: string) =>
  clampScore(evaluation.criteria?.[key]?.rawScore);

const evidenceCount = (evaluation: RoleEvaluationVersionResponse) =>
  Object.values(evaluation.criteria || {}).reduce((sum, criterion) => sum + Math.max(criterion.evidenceReferenceIds?.length || 0, criterion.evidence?.length || 0), 0);

const criteriaCount = (evaluation: RoleEvaluationVersionResponse) =>
  Object.keys(evaluation.criteria || {}).length;

const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const ScoreRing: React.FC<{ value: number | null; label: string }> = ({ value, label }) => {
  const safe = value ?? 0;
  const band = scoreBand(value);
  return (
    <div className={`${styles.scoreRing} ${styles[band]}`} style={{ '--score': `${safe * 3.6}deg` } as React.CSSProperties}>
      <div>
        <strong>{value ?? 'N/A'}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

export const ScoreRulesViewer: React.FC = () => {
  const [evaluations, setEvaluations] = useState<RoleEvaluationVersionResponse[]>([]);
  const [ruleSets, setRuleSets] = useState<RoleScoreRuleSetResponse[]>([]);
  const [selectedRole, setSelectedRole] = useState<'ALL' | ScoreRole>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      roleEvaluationApi.getApprovedVersions(),
      roleEvaluationApi.getRuleSets(undefined),
    ])
      .then(([versionResult, ruleResult]) => {
        if (!mounted) return;

        const rows = versionResult.status === 'fulfilled' && Array.isArray(versionResult.value.data)
          ? versionResult.value.data
          : [];
        setEvaluations(rows);
        setSelectedId(rows[0]?.id ?? null);

        setRuleSets(ruleResult.status === 'fulfilled' && Array.isArray(ruleResult.value.data)
          ? ruleResult.value.data
          : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvaluations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return evaluations.filter((evaluation) => {
      const matchRole = selectedRole === 'ALL' || evaluation.evaluatedRole === selectedRole;
      const haystack = [
        evaluation.targetCompanyName,
        evaluation.targetCompanyId,
        evaluation.targetCompanyProfileId,
        evaluation.evaluatedRole,
        evaluation.projectId,
        evaluation.taskId,
        ...(evaluation.industries || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return matchRole && (!needle || haystack.includes(needle));
    });
  }, [evaluations, search, selectedRole]);

  const selectedEvaluation = useMemo(
    () => filteredEvaluations.find((evaluation) => evaluation.id === selectedId) ?? filteredEvaluations[0] ?? null,
    [filteredEvaluations, selectedId],
  );

  const metrics = useMemo(() => {
    const values = evaluations.map((item) => clampScore(item.overallScore)).filter((value): value is number => value !== null);
    const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    const strong = values.filter((value) => value >= 70).length;
    const watch = values.filter((value) => value >= 45 && value < 70).length;
    const risk = values.filter((value) => value < 45).length;
    return { average, strong, watch, risk, total: evaluations.length };
  }, [evaluations]);

  const selectedCriteria = useMemo(() => {
    if (!selectedEvaluation?.criteria) return [];
    return Object.entries(selectedEvaluation.criteria).map(([key, criterion]) => ({
      key,
      label: labelFromKey(criterion.criterionKey || key),
      score: clampScore(criterion.rawScore),
      rationale: criterion.finalRationale || 'No rationale saved.',
      evidenceCount: Math.max(criterion.evidenceReferenceIds?.length || 0, criterion.evidence?.length || 0),
      inputMethod: criterion.inputMethod || 'Manual review',
      sufficiency: criterion.dataSufficiencyStatus || selectedEvaluation.completenessStatus || 'N/A',
    }));
  }, [selectedEvaluation]);

  const selectedRules = useMemo(() => {
    if (!selectedEvaluation) return [];
    const activeRuleSet = ruleSets.find((ruleSet) => ruleSet.evaluatedRole === selectedEvaluation.evaluatedRole);
    if (activeRuleSet?.criteria?.length) return activeRuleSet.criteria;
    return SCORE_RULES[selectedEvaluation.evaluatedRole]?.criteria?.map((criterion) => ({
      criterionKey: criterion.key,
      criterionName: criterion.label,
      weight: criterion.weight,
      direction: criterion.inverse ? 'COST' : 'BENEFIT',
      required: true,
    })) || [];
  }, [ruleSets, selectedEvaluation]);

  const openDocument = (projectId?: number | string | null, rawDocumentId?: string | null, download = false) => {
    if (!projectId || !rawDocumentId) return;
    const url = `${API_BASE_URL}/projects/${projectId}/documents/${encodeURIComponent(rawDocumentId)}/download?download=${download}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openEvaluationDetail = (evaluation: RoleEvaluationVersionResponse) => {
    setSelectedId(evaluation.id);
    setDetailOpen(true);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Approved role evaluations</span>
          <h1>Score Workspace</h1>
          <p>Xem lại các công ty đã được Staff chấm điểm và Manager approve. Đây là nơi lưu lịch sử điểm chính thức theo từng role, criteria, evidence và nhận xét duyệt.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.secondaryButton} type="button"><ShieldCheck size={16} />Approved only</button>
          <button className={styles.primaryButton} type="button"><BarChart3 size={16} />Score review</button>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <Gauge size={20} />
          <span>Average score</span>
          <strong>{metrics.average ?? 'N/A'}</strong>
          <p>Across approved evaluations</p>
        </article>
        <article className={styles.kpiCard}>
          <CheckCircle2 size={20} />
          <span>Approved companies</span>
          <strong>{metrics.total}</strong>
          <p>Role evaluation versions</p>
        </article>
        <article className={styles.kpiCard}>
          <Target size={20} />
          <span>Strong fit</span>
          <strong>{metrics.strong}</strong>
          <p>Score 70 or above</p>
        </article>
        <article className={styles.kpiCard}>
          <LineChart size={20} />
          <span>Watch / risk</span>
          <strong>{metrics.watch + metrics.risk}</strong>
          <p>Need follow-up review</p>
        </article>
      </section>

      <section className={styles.workspace}>
        <main className={styles.mainPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Company score list</span>
              <h2>Approved evaluations</h2>
            </div>
            <div className={styles.scoreFilters}>
              <label className={styles.searchBox}>
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, project, role..." />
              </label>
              <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as 'ALL' | ScoreRole)}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.distribution}>
            <div><span>Strong</span><strong>{metrics.strong}</strong><i style={{ width: `${Math.min(100, metrics.strong * 18)}%` }} /></div>
            <div><span>Watch</span><strong>{metrics.watch}</strong><i style={{ width: `${Math.min(100, metrics.watch * 18)}%` }} /></div>
            <div><span>Risk</span><strong>{metrics.risk}</strong><i style={{ width: `${Math.min(100, metrics.risk * 18)}%` }} /></div>
          </div>

          {loading ? (
            <div className={styles.emptyState}>Loading approved evaluations...</div>
          ) : filteredEvaluations.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardCheck size={32} />
              <strong>No approved evaluations yet</strong>
              <span>Approve a Role Evaluation task first. The official result will appear here.</span>
            </div>
          ) : (
            <div className={styles.scoreList}>
              {filteredEvaluations.map((evaluation) => {
                const overall = clampScore(evaluation.overallScore);
                const band = scoreBand(overall);
                return (
                  <button
                    key={evaluation.id}
                    type="button"
                    className={`${styles.scoreRow} ${selectedEvaluation?.id === evaluation.id ? styles.scoreRowActive : ''}`}
                    onClick={() => openEvaluationDetail(evaluation)}
                  >
                    <ScoreRing value={overall} label="score" />
                    <div className={styles.scoreRowBody}>
                      <div>
                        <strong>{evaluation.targetCompanyName || evaluation.targetCompanyProfileId}</strong>
                        <span>{roleEvaluationRoleLabel(evaluation.evaluatedRole)} | Project #{evaluation.projectId ?? 'N/A'} | v{evaluation.versionNumber ?? 'N/A'}</span>
                      </div>
                      <div className={styles.scoreBars}>
                        <span><i style={{ width: `${Math.min(100, criteriaCount(evaluation) * 16)}%` }} />Criteria {criteriaCount(evaluation)}</span>
                        <span><i style={{ width: `${Math.min(100, evidenceCount(evaluation) * 10)}%` }} />Evidence {evidenceCount(evaluation)}</span>
                        <span><i style={{ width: `${overall ?? 0}%` }} />Overall {overall ?? 'N/A'}</span>
                      </div>
                    </div>
                    <div className={`${styles.scoreStatus} ${styles[band]}`}>
                      <strong>{scoreLabel(band)}</strong>
                      <span>{formatDate(evaluation.approvedAt || evaluation.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <aside className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Official result</span>
              <h2>Evaluation detail</h2>
            </div>
            <Info size={18} />
          </div>

          {selectedEvaluation ? (
            <>
              <div className={styles.detailHero}>
                <ScoreRing value={clampScore(selectedEvaluation.overallScore)} label="score" />
                <div>
                  <strong>{selectedEvaluation.targetCompanyName || selectedEvaluation.targetCompanyProfileId}</strong>
                  <span>{roleEvaluationRoleLabel(selectedEvaluation.evaluatedRole)} | Approved {formatDate(selectedEvaluation.approvedAt)}</span>
                  <p>{selectedEvaluation.reviewComment || 'No manager comment.'}</p>
                </div>
              </div>

              <div className={styles.detailMeta}>
                <div><span>Profile ID</span><strong>{selectedEvaluation.targetCompanyProfileId}</strong></div>
                <div><span>Project / Task</span><strong>#{selectedEvaluation.projectId ?? 'N/A'} / #{selectedEvaluation.taskId ?? 'N/A'}</strong></div>
                <div><span>Completeness</span><strong>{selectedEvaluation.completenessStatus || 'N/A'}</strong></div>
                <div><span>Evidence</span><strong>{evidenceCount(selectedEvaluation)} linked source(s)</strong></div>
              </div>

              <div className={styles.factorBox}>
                <h3>Criteria scorecard</h3>
                {selectedCriteria.map((criterion) => (
                  <article key={criterion.key} className={styles.versionCriterion}>
                    <div>
                      <span>{criterion.key}</span>
                      <strong>{criterion.label}</strong>
                    </div>
                    <b>{criterion.score ?? 'N/A'}</b>
                    <p>{criterion.rationale}</p>
                    <footer>
                      <span>{criterion.evidenceCount} evidence</span>
                      <span>{criterion.inputMethod}</span>
                      <span>{String(criterion.sufficiency)}</span>
                    </footer>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>Select an approved evaluation to inspect detail.</div>
          )}
        </aside>
      </section>

      <section className={styles.rulesPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Scoring model</span>
            <h2>{selectedEvaluation ? `${roleEvaluationRoleLabel(selectedEvaluation.evaluatedRole)} criteria` : 'Role criteria'}</h2>
            <p>Rules below explain the criteria used when Staff created the score and Manager approved the final version.</p>
          </div>
        </div>

        <div className={styles.criteriaGrid}>
          {selectedRules.map((rule, index) => (
            <article key={`${rule.criterionKey ?? index}`} className={styles.criterionCard}>
              <div>
                <span>{rule.direction || 'BENEFIT'}</span>
                <strong>{rule.criterionName || labelFromKey(rule.criterionKey || `Criterion ${index + 1}`)}</strong>
              </div>
              <div className={styles.weightLine}>
                <i style={{ width: `${Math.min(100, Number(rule.weight ?? 0))}%` }} />
              </div>
              <p>{rule.required ? 'Required criterion' : 'Optional criterion'}</p>
              <footer>
                <span>{rule.weight ?? 0}% weight</span>
                <em>Active</em>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workflowStrip}>
        <div><FileText size={18} /><strong>Evidence</strong><span>Staff selected source documents</span></div>
        <div><Gauge size={18} /><strong>Score</strong><span>Staff score by criterion</span></div>
        <div><ShieldCheck size={18} /><strong>Approval</strong><span>Manager approved official version</span></div>
      </section>

      {detailOpen && selectedEvaluation && (
        <div className={styles.detailOverlay} role="dialog" aria-modal="true">
          <section className={styles.fullDetailPanel}>
            <header className={styles.fullDetailHeader}>
              <div>
                <span className={styles.eyebrow}>Approved score detail</span>
                <h2>{selectedEvaluation.targetCompanyName || selectedEvaluation.targetCompanyProfileId}</h2>
                <p>{roleEvaluationRoleLabel(selectedEvaluation.evaluatedRole)} | Project #{selectedEvaluation.projectId ?? 'N/A'} | Task #{selectedEvaluation.taskId ?? 'N/A'} | Version {selectedEvaluation.versionNumber ?? 'N/A'}</p>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setDetailOpen(false)} aria-label="Close detail">
                <X size={18} />
              </button>
            </header>

            <div className={styles.fullDetailSummary}>
              <ScoreRing value={clampScore(selectedEvaluation.overallScore)} label="score" />
              <article><span>Approved at</span><strong>{formatDate(selectedEvaluation.approvedAt)}</strong></article>
              <article><span>Completeness</span><strong>{selectedEvaluation.completenessStatus || 'N/A'}</strong></article>
              <article><span>Evidence</span><strong>{evidenceCount(selectedEvaluation)} source(s)</strong></article>
              <article><span>Manager note</span><strong>{selectedEvaluation.reviewComment || 'No manager comment.'}</strong></article>
            </div>

            <div className={styles.fullCriteriaList}>
              {Object.entries(selectedEvaluation.criteria || {}).map(([key, criterion]) => {
                const score = clampScore(criterion.rawScore);
                const evidenceItems = criterion.evidence || [];
                return (
                  <article className={styles.fullCriterionCard} key={key}>
                    <div className={styles.fullCriterionHead}>
                      <div>
                        <span>{key}</span>
                        <strong>{labelFromKey(criterion.criterionKey || key)}</strong>
                      </div>
                      <b>{score ?? 'N/A'}</b>
                    </div>
                    <p>{criterion.finalRationale || 'No rationale saved.'}</p>
                    <div className={styles.fullCriterionMeta}>
                      <span>{criterion.inputMethod || 'Manual review'}</span>
                      <span>{criterion.dataSufficiencyStatus || selectedEvaluation.completenessStatus || 'N/A'}</span>
                      <span>{evidenceItems.length} evidence</span>
                    </div>

                    <div className={styles.evidenceDetailList}>
                      <h4>Evidence and attached documents</h4>
                      {evidenceItems.length === 0 ? (
                        <div className={styles.emptyEvidence}>No evidence detail stored for this criterion.</div>
                      ) : evidenceItems.map((evidence) => (
                        <div className={styles.evidenceDetailCard} key={evidence.evidenceId || evidence.rawDocumentId || `${key}-${evidence.note}`}>
                          <FileText size={18} />
                          <div>
                            <strong>{evidence.fileName || evidence.note || evidence.rawDocumentId || 'Evidence source'}</strong>
                            <span>{evidence.sourceType || 'Evidence'} | {evidence.reliability || 'Reliability N/A'} | {formatBytes(evidence.sizeBytes)}</span>
                            <p>{evidence.note || evidence.evidenceCategory || evidence.mimeType || 'No evidence note.'}</p>
                          </div>
                          <div className={styles.evidenceActions}>
                            <button type="button" onClick={() => openDocument(evidence.projectId || selectedEvaluation.projectId, evidence.rawDocumentId, false)} disabled={!evidence.rawDocumentId}>
                              Open
                            </button>
                            <button type="button" onClick={() => openDocument(evidence.projectId || selectedEvaluation.projectId, evidence.rawDocumentId, true)} disabled={!evidence.rawDocumentId}>
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
