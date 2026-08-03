import { api, apiFetch } from '../services/api';
import type {
  RoleEvaluationDraftResponse,
  RoleEvaluationPreviewResponse,
  RoleEvaluationReadinessResponse,
  RoleEvaluationVersionResponse,
  RoleScoreRuleSetResponse,
  RoleScoreSnapshotResponse,
  ScoreRole,
} from '../types/domain';

export const roleEvaluationApi = {
  getRuleSets: (role?: ScoreRole, active = true) =>
    api.get<RoleScoreRuleSetResponse[]>('/role-score-rule-sets', {
      params: {
        role,
        active,
      },
    }),

  getApprovedVersions: (role?: ScoreRole) =>
    api.get<RoleEvaluationVersionResponse[]>('/role-evaluation-versions', {
      params: { role },
    }),

  getTaskDrafts: (projectId: number, taskId: number) =>
    api.get<RoleEvaluationDraftResponse[]>(`/projects/${projectId}/tasks/${taskId}/role-evaluations`),

  createDraft: (projectId: number, taskId: number, note?: string) =>
    api.post<RoleEvaluationDraftResponse>(`/projects/${projectId}/tasks/${taskId}/role-evaluations`, {
      note: note || null,
    }),

  getDraft: (evaluationId: string) =>
    api.get<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}`),

  addEvidence: (
    evaluationId: string,
    data: {
      criterionKey: string;
      sourceType: string;
      rawDocumentId?: string | null;
      evidenceCategory?: string | null;
      reliability?: 'HIGH' | 'MEDIUM' | 'LOW';
      note?: string | null;
    }
  ) =>
    api.post<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/evidence`, data),

  removeEvidence: (evaluationId: string, evidenceId: string) =>
    api.delete<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/evidence/${encodeURIComponent(evidenceId)}`),

  updateCriterion: (
    evaluationId: string,
    criterionKey: string,
    data: {
      rawScore?: number | null;
      explanation?: string | null;
      evidenceIds?: string[];
      inputMethod?: string;
    }
  ) =>
    api.patch<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/criteria/${criterionKey}`, data),

  generateSuggestions: (evaluationId: string) =>
    api.post<{ draft: RoleEvaluationDraftResponse; outcomes: Record<string, string> }>(
      `/role-evaluations/${evaluationId}/suggestions/generate`,
      {}
    ),

  generateSuggestion: (evaluationId: string, criterionKey: string) =>
    api.post<{ draft: RoleEvaluationDraftResponse; outcome: string }>(
      `/role-evaluations/${evaluationId}/criteria/${criterionKey}/suggest`,
      {}
    ),

  acceptSuggestion: (evaluationId: string, criterionKey: string) =>
    api.post<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/criteria/${criterionKey}/suggest/accept`, {}),

  editSuggestion: (evaluationId: string, criterionKey: string, data: { rawScore?: number | null; overrideReason: string }) =>
    api.post<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/criteria/${criterionKey}/suggest/edit`, data),

  rejectSuggestion: (evaluationId: string, criterionKey: string, reviewComment?: string) =>
    api.post<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/criteria/${criterionKey}/suggest/reject`, {
      reviewComment: reviewComment || null,
    }),

  markNeedsMoreData: (evaluationId: string, criterionKey: string, reviewComment?: string, missingData: string[] = []) =>
    api.post<RoleEvaluationDraftResponse>(`/role-evaluations/${evaluationId}/criteria/${criterionKey}/suggest/needs-more-data`, {
      reviewComment: reviewComment || null,
      missingData,
    }),

  getReadiness: (evaluationId: string) =>
    api.get<RoleEvaluationReadinessResponse>(`/role-evaluations/${evaluationId}/readiness`),

  calculatePreview: (evaluationId: string) =>
    api.post<RoleEvaluationPreviewResponse>(`/role-evaluations/${evaluationId}/calculate-preview`, {}),

  submit: (evaluationId: string, note?: string) =>
    apiFetch<void>(`/role-evaluations/${evaluationId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null }),
    }),

  review: (
    evaluationId: string,
    data: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'; comment?: string; acknowledgeStaleVersions?: boolean },
    idempotencyKey: string
  ) =>
    apiFetch<unknown>(`/role-evaluations/${evaluationId}/review`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  getOfficialScores: (companyProfileId: string, role?: ScoreRole) =>
    api.get<RoleScoreSnapshotResponse[]>(`/profiles/${companyProfileId}/role-scores`, {
      params: { role },
    }),
};
