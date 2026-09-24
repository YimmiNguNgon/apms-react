import { api } from "../services/api";
import type {
  FinancialResearchResponse,
  CreateFinancialMetricRequest,
  UpdateFinancialMetricRequest,
  ProjectTaskSubmissionResponse,
  CreateFinancialReportRequest,
  UpdateFinancialReportRequest,
  CompanyProfileFinancialRow,
  BatchUpdateCompanyFinancialsRequest,
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

  updateReport: (projectId: number, taskId: number, reportId: string, data: UpdateFinancialReportRequest) =>
    api.put<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}`,
      data
    ),

  replaceReportFile: (projectId: number, taskId: number, reportId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.put<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/file`,
      formData
    );
  },

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

  confirmCompany: (projectId: number, taskId: number, reportId: string, confirmed: boolean) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/confirm-company`,
      { confirmed }
    ),

  addMetric: (projectId: number, taskId: number, data: CreateFinancialMetricRequest) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/metrics`,
      data
    ),

  saveManualMetricsBatch: (projectId: number, taskId: number, reportId: string, data: { metrics: CreateFinancialMetricRequest[] }) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/manual-metrics/batch`,
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

  unverifyAllMetrics: (projectId: number, taskId: number, reportId: string) =>
    api.post<FinancialResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/financial-research/reports/${reportId}/unverify-all`
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
        note: note?.trim() || null,
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

  getCanonicalFinancials: (companyProfileId: string, projectId?: number | null) => {
    const params: Record<string, any> = {};
    if (projectId) {
      params.projectId = projectId;
    }
    return api.get<CompanyProfileFinancialRow[]>(
      `/company-profiles/${companyProfileId}/financials`,
      { params }
    );
  },

  updateCanonicalFinancials: (companyProfileId: string, data: BatchUpdateCompanyFinancialsRequest) =>
    api.put<CompanyProfileFinancialRow[]>(
      `/company-profiles/${companyProfileId}/financials`,
      data
    ),

  backfillCanonicalFinancials: (companyProfileId: string) =>
    api.post<number>(
      `/company-profiles/${companyProfileId}/financials/backfill`
    ),

  createAdminMyEnterpriseFinancialReport: (params: {
    title: string;
    year: number;
    period: string;
    dataEntryMethod: 'AI_EXTRACTION' | 'MANUAL';
    file?: File | null;
  }) => {
    const formData = new FormData();
    formData.append('title', params.title);
    formData.append('year', String(params.year));
    formData.append('period', params.period);
    formData.append('dataEntryMethod', params.dataEntryMethod);
    if (params.file) {
      formData.append('file', params.file);
    }
    return api.post<CompanyProfileFinancialRow[]>(
      '/admin/my-enterprise/financials/reports',
      formData,
      { timeoutMs: 120000 }
    );
  },

  updateAdminMyEnterpriseFinancialReport: (
    reportId: string,
    params: {
      title?: string;
      year?: number;
      period?: string;
      file?: File | null;
    }
  ) => {
    const formData = new FormData();
    if (params.title !== undefined) formData.append('title', params.title);
    if (params.year !== undefined) formData.append('year', String(params.year));
    if (params.period !== undefined) formData.append('period', params.period);
    if (params.file) formData.append('file', params.file);
    return api.put<CompanyProfileFinancialRow[]>(
      `/admin/my-enterprise/financials/reports/${reportId}`,
      formData,
      { timeoutMs: 120000 }
    );
  },

  extractAdminMyEnterpriseFinancialReport: (reportId: string, signal?: AbortSignal) =>
    api.post<CompanyProfileFinancialRow[]>(
      `/admin/my-enterprise/financials/reports/${reportId}/extract`,
      undefined,
      { timeoutMs: 120000, signal }
    ),

  reExtractAdminMyEnterpriseFinancialReport: (reportId: string, signal?: AbortSignal) =>
    api.post<CompanyProfileFinancialRow[]>(
      `/admin/my-enterprise/financials/reports/${reportId}/re-extract`,
      undefined,
      { timeoutMs: 120000, signal }
    ),

  cancelAdminMyEnterpriseFinancialReport: (reportId: string) =>
    api.post<void>(
      `/admin/my-enterprise/financials/reports/${reportId}/cancel-extract`
    ),

  deleteAdminMyEnterpriseFinancialReport: (reportId: string) =>
    api.delete<void>(
      `/admin/my-enterprise/financials/reports/${reportId}`
    ),
};
