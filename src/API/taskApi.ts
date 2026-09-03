import { api, type ApiResponse } from "../services/api";
import type {
  CreateProjectTaskRequest,
  CreateProjectTaskSubmissionRequest,
  PageResult,
  ProjectTaskResponse,
  ProjectTaskSubmissionResponse,
  ProjectTaskActivityResponse,
  ProjectTaskWorkbenchResponse,
  ReviewTaskSubmissionRequest,
  TaskStatus,
} from "../types/domain";

export const taskApi = {
  getProjectTasks: async (projectId: number, params?: { assignedToUserId?: number; status?: TaskStatus | 'AVAILABLE' }) => {
    return api.get<PageResult<ProjectTaskResponse>>(
      `/projects/${projectId}/tasks`,
      {
        params: {
          page: 0,
          size: 100,
          ...(params?.assignedToUserId ? { assignedToUserId: params.assignedToUserId } : {}),
          ...(params?.status ? { status: params.status } : {}),
        },
      }
    );
  },

  createProjectTask: async (projectId: number, taskData: CreateProjectTaskRequest) => {
    return api.post<ProjectTaskResponse>(
      `/projects/${projectId}/tasks`,
      taskData
    );
  },

  updateTaskStatus: async (projectId: number, taskId: number, status: TaskStatus) => {
    return api.patch<ProjectTaskResponse>(
      `/projects/${projectId}/tasks/${taskId}`,
      { status }
    );
  },

  claimProjectTask: async (projectId: number, taskId: number) => {
    return api.post<ProjectTaskResponse>(
      `/projects/${projectId}/tasks/${taskId}/claim`
    );
  },

  releaseProjectTask: async (projectId: number, taskId: number) => {
    return api.post<ProjectTaskResponse>(
      `/projects/${projectId}/tasks/${taskId}/release`
    );
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteProjectTask: async (_projectId: number, _taskId: number) => {
    throw new Error("Task deletion is not supported by the backend. Tasks can be moved to CANCELLED status instead.");
  },

  getTaskWorkbench: async (projectId: number, taskId: number) => {
    return api.get<ProjectTaskWorkbenchResponse>(
      `/projects/${projectId}/tasks/${taskId}/workbench`
    );
  },

  submitTask: async (projectId: number, taskId: number, data: CreateProjectTaskSubmissionRequest) => {
    return api.post<ProjectTaskSubmissionResponse>(
      `/projects/${projectId}/tasks/${taskId}/submissions`,
      data
    );
  },

  getTaskActivity: (projectId: number | string, taskId: number | string) => {
    return api.get<ProjectTaskActivityResponse[]>(
      `/projects/${projectId}/tasks/${taskId}/activity`
    );
  },

  submitPartnerContractCollection: async (
    projectId: number,
    taskId: number,
    data: { rawDocumentIds: string[]; note?: string | null }
  ) => {
    return api.post<ProjectTaskSubmissionResponse>(
      `/projects/${projectId}/tasks/${taskId}/partner-contracts/submissions`,
      data
    );
  },

  deletePartnerContractDocument: async (projectId: number, taskId: number, rawDocumentId: string) => {
    return api.delete<void>(
      `/projects/${projectId}/tasks/${taskId}/partner-contracts/documents/${encodeURIComponent(rawDocumentId)}`
    );
  },

  reviewSubmission: async (projectId: number, taskId: number, submissionId: number, data: ReviewTaskSubmissionRequest) => {
    return api.post<ProjectTaskSubmissionResponse>(
      `/projects/${projectId}/tasks/${taskId}/submissions/${submissionId}/review`,
      data
    );
  },

  getSubmissions: async (projectId: number, taskId: number, params?: { page?: number; size?: number }) => {
    return api.get<PageResult<ProjectTaskSubmissionResponse>>(
      `/projects/${projectId}/tasks/${taskId}/submissions`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      }
    );
  },

  cancelSubmission: async (projectId: number, taskId: number, submissionId?: number) => {
    const url = submissionId
      ? `/projects/${projectId}/tasks/${taskId}/submissions/${submissionId}/cancel`
      : `/projects/${projectId}/tasks/${taskId}/submissions/cancel`;
    return api.post<ApiResponse<void>>(url);
  },
};
