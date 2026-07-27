import { api } from "../services/api";
import type {
  CreateProjectTaskRequest,
  CreateProjectTaskSubmissionRequest,
  PageResult,
  ProjectTaskResponse,
  ProjectTaskSubmissionResponse,
  ProjectTaskWorkbenchResponse,
  ReviewTaskSubmissionRequest,
  TaskStatus,
} from "../types/domain";

export const taskApi = {
  getProjectTasks: async (projectId: number, params?: { assignedToUserId?: number }) => {
    return api.get<PageResult<ProjectTaskResponse>>(
      `/projects/${projectId}/tasks`,
      {
        params: {
          page: 0,
          size: 100,
          ...(params?.assignedToUserId ? { assignedToUserId: params.assignedToUserId } : {}),
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

  reviewSubmission: async (projectId: number, taskId: number, submissionId: number, data: ReviewTaskSubmissionRequest) => {
    return api.post<ProjectTaskSubmissionResponse>(
      `/projects/${projectId}/tasks/${taskId}/submissions/${submissionId}/review`,
      data
    );
  },
};
