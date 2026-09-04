import { api } from "../services/api";
import type {
  FinancialResearchResponse,
  CreateFinancialMetricRequest,
  UpdateFinancialMetricRequest,
  ProjectTaskSubmissionResponse,
  CreateFinancialReportRequest,
} from "../types/domain";

export const financialResearchApi = {
  getResearch: (projectId: number, taskId: number) =>
    api.get<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research`
    ),

  addReport: (projectId: number, taskId: number, data: CreateFinancialReportRequest) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports`,
      data
    ),

  removeReport: (projectId: number, taskId: number, reportId: string) =>
    api.delete<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}`
    ),

  extractReport: (projectId: number, taskId: number, reportId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/extract`
    ),

  reExtractReport: (projectId: number, taskId: number, reportId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/re-extract`
    ),

  cancelExtractReport: (projectId: number, taskId: number, reportId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/cancel-extract`
    ),

  addMetric: (projectId: number, taskId: number, data: CreateFinancialMetricRequest) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics`,
      data
    ),

  updateMetric: (projectId: number, taskId: number, metricId: string, data: UpdateFinancialMetricRequest) =>
    api.put<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics/${metricId}`,
      data
    ),

  removeMetric: (projectId: number, taskId: number, metricId: string) =>
    api.delete<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics/${metricId}`
    ),

  verifyMetric: (projectId: number, taskId: number, metricId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics/${metricId}/verify`
    ),

  unverifyMetric: (projectId: number, taskId: number, metricId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics/${metricId}/unverify`
    ),

  verifyAllMetrics: (projectId: number, taskId: number, reportId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/verify-all`
    ),

  reviewReport: (projectId: number, taskId: number, reportId: string, status: 'APPROVED' | 'CHANGES_REQUESTED', reason?: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/review`,
      { status, reason }
    ),

  submitResearch: (projectId: number, taskId: number, researchId: string, selectedReportIds: string[], note?: string | null) =>
    api.post<ProjectTaskSubmissionResponse>(
      `/projects/${projectId}/tasks/${taskId}/submissions`,
      {
        submissionType: "FINANCIAL_RESEARCH",
        targetEntityType: "FinancialResearch",
        targetEntityId: researchId,
        targetItemIds: selectedReportIds,
        note: note || "Financial research submitted for manager review.",
      }
    ),

  recallSubmission: (projectId: number, taskId: number) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/recall-submission`
    ),

  getApprovedFinancials: (companyProfileId: string) =>
    api.get<FinancialResearchResponse[]>(
      `/company-profiles/${companyProfileId}/financials/research`
    ),
};
