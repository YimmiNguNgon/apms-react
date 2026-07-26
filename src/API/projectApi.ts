import { api } from "../services/api";
import type { AddMemberRequest, CreateProjectRequest, PageResult, ProjectMemberResponse, ProjectResponse, UpdateProjectStatusRequest } from "../types/domain";

export const projectApi = {
  getAllProjects: async () => {
    return api.get<PageResult<ProjectResponse>>("/projects");
  },

  createProject: async (projectData: CreateProjectRequest) => {
    return api.post<ProjectResponse>("/projects", projectData);
  },

  getProjectById: async (projectId: number) => {
    return api.get<ProjectResponse>(`/projects/${projectId}`);
  },

  addMember: async (projectId: number, memberData: AddMemberRequest) => {
    return api.post<ProjectMemberResponse>(
      `/projects/${projectId}/members`,
      memberData
    );
  },

  updateProjectStatus: async (projectId: number, statusData: UpdateProjectStatusRequest) => {
    return api.patch<ProjectResponse>(
      `/projects/${projectId}/status`,
      statusData
    );
  },
};
