import { API_BASE_URL } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { AddMemberRequest, AiExtractionJobResponse, CreateProjectRequest, DuplicateCompanyCheckResponse, PageResult, ProjectMemberResponse, ProjectResponse, RelationshipTypeOption, UpdateProjectStatusRequest, KeyResultReferenceResponse } from "../types/domain";

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
  downloadProjectDocument: async (
    projectId: string | number,
    documentId: string,
    download = true,
  ): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/${projectId}/documents/${encodeURIComponent(documentId)}/download?download=${download}`, {
      method: 'GET',
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      const error = new Error(`Failed to download document: ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return response.blob();
  },
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
  getKeyResultReference: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reference/key-results`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Get key results reference failed:", { status: response.status, payload });
        throw new Error(payload?.message || "Failed to fetch key results reference");
      }

      return payload as ApiResponse<KeyResultReferenceResponse[]>;
    } catch (error) {
      console.error("Error fetching key results reference:", error);
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
  updateProject: async (projectId: number, updateData: import("../types/domain").UpdateProjectRequest) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(updateData),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Update project failed:", { status: response.status, payload, projectId, updateData });
        throw new Error(payload?.message || "Failed to update project");
      }

      return payload as ApiResponse<ProjectResponse>;
    } catch (error) {
      console.error("Error updating project:", error);
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
  removeMember: async (projectId: number, userId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/members/${userId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Remove member failed:", { status: response.status, payload, projectId, userId });
        throw new Error(payload?.message || "Failed to remove member");
      }

      return payload as ApiResponse<void>;
    } catch (error) {
      console.error("Error removing project member:", error);
      throw error;
    }
  },
  updateMemberRole: async (projectId: number, userId: number, projectRole: 'LEADER' | 'DEPUTY' | 'MEMBER') => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/members/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ projectRole }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update member role");
      }
      return payload as ApiResponse<ProjectMemberResponse>;
    } catch (error) {
      console.error("Error updating member role:", error);
      throw error;
    }
  },
  transferLeadership: async (projectId: number, newLeaderId: number, leaveProject: boolean = false) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/members/transfer-leadership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ newLeaderAccountId: newLeaderId, leaveProject }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to transfer leadership");
      }
      return payload as ApiResponse<void>;
    } catch (error) {
      console.error("Error transferring leadership:", error);
      throw error;
    }
  },
  leaveProject: async (projectId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/members/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to leave project");
      }
      return payload as ApiResponse<void>;
    } catch (error) {
      console.error("Error leaving project:", error);
      throw error;
    }
  },
  updateProjectStatus: async (projectId: number, request: UpdateProjectStatusRequest) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(request),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Update project status failed:", { status: response.status, payload });
        throw new Error(payload?.message || "Failed to update project status");
      }

      return payload as ApiResponse<ProjectResponse>;
    } catch (error) {
      console.error("Error updating project status:", error);
      throw error;
    }
  },
  closeProject: async (projectId: number, reason?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/${projectId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Close project failed:", { status: response.status, payload });
        throw new Error(payload?.message || "Failed to close project");
      }

      return payload as ApiResponse<ProjectResponse>;
    } catch (error) {
      console.error("Error closing project:", error);
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
  checkDuplicateTaxCode: async (taxCode: string) => {
    try {
      const params = new URLSearchParams({ taxCode });
      const response = await fetch(`${BASE_URL}/check-duplicate-tax-code?${params.toString()}`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to check duplicate tax code');
      }
      return payload as ApiResponse<import('../types/domain').DuplicateTaxCodeCheckResponse>;
    } catch (error) {
      console.error('Error checking duplicate tax code:', error);
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
        const err = new Error(payload?.message || "Failed to extract multiple documents");
        (err as any).payload = payload;
        (err as any).status = response.status;
        throw err;
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
