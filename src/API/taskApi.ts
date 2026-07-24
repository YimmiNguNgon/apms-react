import { API_BASE_URL } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { CreateProjectTaskRequest, PageResult, ProjectTaskResponse, TaskStatus } from "../types/domain";

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("apms-token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const projectTasksUrl = (projectId: number) => `${API_BASE_URL}/projects/${projectId}/tasks`;

const readPayload = async <T>(response: Response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Task request failed");
  }
  return payload as ApiResponse<T>;
};

export const taskApi = {
  getProjectTasks: async (projectId: number) => {
    const url = new URL(projectTasksUrl(projectId));
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "100");
    const response = await fetch(url.toString(), {
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<PageResult<ProjectTaskResponse>>(response);
  },

  createProjectTask: async (projectId: number, taskData: CreateProjectTaskRequest) => {
    const response = await fetch(projectTasksUrl(projectId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(taskData),
    });

    return readPayload<ProjectTaskResponse>(response);
  },

  updateTaskStatus: async (projectId: number, taskId: number, status: TaskStatus) => {
    const response = await fetch(`${projectTasksUrl(projectId)}/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });

    return readPayload<ProjectTaskResponse>(response);
  },
};
