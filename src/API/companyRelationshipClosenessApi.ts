import { api } from '../services/api';

export interface RelationshipClosenessResponse {
  targetCompanyProfileId: string;
  stars: number | null;
  label: string;
  note: string | null;
  ratedByAccountId: number | null;
  ratedAt: string | null;
  updatedAt: string | null;
}

export interface UpdateRelationshipClosenessRequest {
  stars: number;
  note?: string | null;
}

const endpoint = (companyProfileId: string) =>
  `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-closeness`;

export const companyRelationshipClosenessApi = {
  get: (companyProfileId: string) =>
    api.get<RelationshipClosenessResponse>(endpoint(companyProfileId)),

  update: (companyProfileId: string, data: UpdateRelationshipClosenessRequest) =>
    api.put<RelationshipClosenessResponse>(endpoint(companyProfileId), data),

  clear: (companyProfileId: string) =>
    api.delete<void>(endpoint(companyProfileId)),
};
