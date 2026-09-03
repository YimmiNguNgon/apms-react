import { api } from '../services/api';
import type {
  ContractResearchResponse,
  CreateContractEntryRequest,
  UpdateContractEntryRequest,
  UpdateScalarFieldRequest,
  UpdateArrayItemRequest,
  ContractType,
  ContractEntryReviewStatus,
  ContractEntry,
} from '../types/contractResearch';

export const contractResearchApi = {
  getResearch: (projectId: number, taskId: number): Promise<ContractResearchResponse> =>
    api.get<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research`
    ).then((res) => res.data),

  createContract: (projectId: number, taskId: number, data: CreateContractEntryRequest): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts`,
      data
    ).then((res) => res.data),

  updateContract: (projectId: number, taskId: number, contractId: string, data: UpdateContractEntryRequest): Promise<ContractResearchResponse> =>
    api.put<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}`,
      data
    ).then((res) => res.data),

  deleteContract: (projectId: number, taskId: number, contractId: string): Promise<ContractResearchResponse> =>
    api.delete<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}`
    ).then((res) => res.data),

  extractContract: (projectId: number, taskId: number, contractId: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/extract`
    ).then((res) => res.data),

  reExtractContract: (projectId: number, taskId: number, contractId: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/re-extract`
    ).then((res) => res.data),

  cancelExtract: (projectId: number, taskId: number, contractId: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/cancel-extract`
    ).then((res) => res.data),

  resolveType: (projectId: number, taskId: number, contractId: string, confirmedContractType: ContractType): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/resolve-type`,
      { confirmedContractType }
    ).then((res) => res.data),

  confirmCompany: (projectId: number, taskId: number, contractId: string, confirmed: boolean): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/confirm-company`,
      { confirmed }
    ).then((res) => res.data),

  updateScalarField: (
    projectId: number,
    taskId: number,
    contractId: string,
    fieldPath: string,
    data: UpdateScalarFieldRequest
  ): Promise<ContractResearchResponse> =>
    api.put<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/fields/${fieldPath}`,
      data
    ).then((res) => res.data),

  verifyScalarField: (projectId: number, taskId: number, contractId: string, fieldPath: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/fields/${fieldPath}/verify`
    ).then((res) => res.data),

  updateArrayItem: (
    projectId: number,
    taskId: number,
    contractId: string,
    fieldPath: string,
    itemId: string,
    data: UpdateArrayItemRequest
  ): Promise<ContractResearchResponse> =>
    api.put<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/fields/${fieldPath}/items/${itemId}`,
      data
    ).then((res) => res.data),

  verifyArrayItem: (projectId: number, taskId: number, contractId: string, fieldPath: string, itemId: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/contracts/${contractId}/fields/${fieldPath}/items/${itemId}/verify`
    ).then((res) => res.data),

  submitResearch: (projectId: number, taskId: number, contractEntryIds: string[], note?: string): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/submit`,
      {
        contractEntryIds,
        note: note || 'Contract research submitted for manager review.',
      }
    ).then((res) => res.data),

  recallSubmission: (projectId: number, taskId: number): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/recall-submission`
    ).then((res) => res.data),

  reviewContract: (
    projectId: number,
    taskId: number,
    submissionId: number,
    contractId: string,
    status: ContractEntryReviewStatus,
    reason?: string
  ): Promise<ContractResearchResponse> =>
    api.post<ContractResearchResponse>(
      `/projects/${projectId}/tasks/${taskId}/contract-research/submissions/${submissionId}/contracts/${contractId}/review`,
      { status, reason }
    ).then((res) => res.data),

  getApprovedContracts: (companyProfileId: string): Promise<ContractEntry[]> =>
    api.get<ContractEntry[]>(
      `/company-profiles/${companyProfileId}/contracts/research`
    ).then((res) => res.data),
};
