import { API_BASE_URL } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { AddMemberRequest, AiExtractionJobResponse, CreateProjectRequest, DuplicateCompanyCheckResponse, PageResult, ProjectMemberResponse, ProjectResponse, RelationshipTypeOption, UpdateProjectStatusRequest } from "../types/domain";

const BASE_URL = `${API_BASE_URL}/projects`;
const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("apms-token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
export const projectApi = {
  getTargetRelationshipTypes: async () => {
    try {
      const response = await fetch(`${BASE_URL}/relationship-types`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Get target relationship types failed:", { status: response.status, payload });
        throw new Error(payload?.message || "Failed to fetch target relationship types");
      }

      return payload as ApiResponse<RelationshipTypeOption[]>;
    } catch (error) {
      console.error("Error fetching target relationship types:", error);
      throw error;
    }
  },
  getAllProjects: async () => {

    try{
        const response = await fetch(BASE_URL, {
            headers: {
                ...getAuthHeader(),
            },
        });
    if(!response.ok){
        throw new Error("Failed to fetch projects");
    }
    return await response.json() as ApiResponse<PageResult<ProjectResponse>>;
    }
    catch(error){
        console.error("Error fetching projects:", error);
        throw error;
    }
  },
  createProject: async (projectData: CreateProjectRequest) => {
    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(projectData),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Create project failed:", { status: response.status, payload, projectData });
        throw new Error(payload?.message || "Failed to create project");
      }

      return payload as ApiResponse<ProjectResponse>;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  },
  getProjectById: async (projectId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}`, {
        headers: {
          ...getAuthHeader(),
        },
      }); 

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Get project by ID failed:", { status: response.status, payload, projectId });
        throw new Error(payload?.message || "Failed to fetch project");
      }

      return payload as ApiResponse<ProjectResponse>;
    }
    catch (error) {
      console.error("Error fetching project by ID:", error);
      throw error;
    }
  },
  addMember: async (projectId: number, memberData: AddMemberRequest) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(memberData),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Add member failed:", { status: response.status, payload, projectId, memberData });
        throw new Error(payload?.message || "Failed to add member");
      }

      return payload as ApiResponse<ProjectMemberResponse>;
    } catch (error) {
      console.error("Error adding member:", error);
      throw error;
    }
  },
  updateProjectStatus: async (projectId: number, statusData: UpdateProjectStatusRequest) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(statusData),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Update project status failed:", { status: response.status, payload, projectId, statusData });
        throw new Error(payload?.message || "Failed to update project status");
      }

      return payload as ApiResponse<ProjectResponse>;
    } catch (error) {
      console.error("Error updating project status:", error);
      throw error;
    }
  },
  deleteProject: async (projectId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Delete project failed:", { status: response.status, payload, projectId });
        throw new Error(payload?.message || "Failed to delete project");
      }

      return payload as ApiResponse<void>;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },
  checkDuplicateCompanyName: async (companyName: string, excludeProjectId?: number) => {
    try {
      const params = new URLSearchParams({ companyName });
      if (excludeProjectId != null) params.set('excludeProjectId', String(excludeProjectId));
      const response = await fetch(`${BASE_URL}/check-duplicate-company?${params.toString()}`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to check duplicate company name');
      }
      return payload as ApiResponse<DuplicateCompanyCheckResponse>;
    } catch (error) {
      console.error('Error checking duplicate company name:', error);
      throw error;
    }
  },
  extractMultiDocuments: async (projectId: number, taskId: number, rawDocumentIds: string[]) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/tasks/${taskId}/extract-multi`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawDocumentIds }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to extract multiple documents");
      }

      return payload as ApiResponse<AiExtractionJobResponse>;
    } catch (error) {
      console.error("Error extracting multiple documents:", error);
      throw error;
    }
  },
  getExtractionJobStatus: async (projectId: number, taskId: number, jobId: string) => {
    if (!jobId) {
      throw new Error("Cannot request extraction job status without a valid jobId");
    }
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/tasks/${taskId}/extract-multi/${jobId}`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to get extraction job status");
      }

      return payload as ApiResponse<AiExtractionJobResponse>;
    } catch (error) {
      console.error("Error getting extraction job status:", error);
      throw error;
    }
  }
};