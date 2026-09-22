import { api } from '../services/api';
import type {
  CompanyProfileContractDto,
  UpdateCompanyProfileContractRequest,
  BatchUpdateCompanyContractsRequest,
} from '../types/companyProfileContract';

export const companyProfileContractApi = {
  getCompanyContracts: async (
    companyProfileId: string,
    projectId?: number | null
  ): Promise<CompanyProfileContractDto[]> => {
    const params: Record<string, any> = {};
    if (projectId) {
      params.projectId = projectId;
    }
    const res = await api.get<CompanyProfileContractDto[]>(
      `/company-profiles/${companyProfileId}/contracts`,
      { params }
    );
    return res.data || [];
  },

  updateCompanyContract: async (
    companyProfileId: string,
    contractId: string,
    data: UpdateCompanyProfileContractRequest
  ): Promise<CompanyProfileContractDto> => {
    const res = await api.put<CompanyProfileContractDto>(
      `/company-profiles/${companyProfileId}/contracts/${contractId}`,
      data
    );
    return res.data;
  },

  batchUpdateCompanyContracts: async (
    companyProfileId: string,
    data: BatchUpdateCompanyContractsRequest
  ): Promise<CompanyProfileContractDto[]> => {
    const res = await api.put<CompanyProfileContractDto[]>(
      `/company-profiles/${companyProfileId}/contracts`,
      data
    );
    return res.data || [];
  },

  backfillCompanyContracts: async (companyProfileId: string): Promise<number> => {
    const res = await api.post<number>(
      `/company-profiles/${companyProfileId}/contracts/backfill`
    );
    return res.data ?? 0;
  },
};
