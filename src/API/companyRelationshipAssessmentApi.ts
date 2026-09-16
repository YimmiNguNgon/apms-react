import { api } from '../services/api';
import type {
  RelationshipOverviewResponse,
  RelationshipAssessmentResponse,
  CommercialEvidence,
  CreateRelationshipAssessmentRequest,
  UpdateRelationshipAssessmentRequest,
  FinalizeRelationshipAssessmentRequest,
  RequestChangesAssessmentRequest,
  OwnerAdjustmentUpdateRequest,
} from '../types/relationshipAssessment';

export const companyRelationshipAssessmentApi = {
  getOverview: (companyProfileId: string) =>
    api.get<RelationshipOverviewResponse>(
      `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-assessments/overview`
    ),

  getHistory: (companyProfileId: string) =>
    api.get<RelationshipAssessmentResponse[]>(
      `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-assessments/history`
    ),

  getCommercialEvidence: (companyProfileId: string) =>
    api.get<CommercialEvidence>(
      `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-assessments/commercial-evidence`
    ),

  createDraft: (companyProfileId: string, data?: CreateRelationshipAssessmentRequest) =>
    api.post<RelationshipAssessmentResponse>(
      `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-assessments`,
      data || {}
    ),

  getById: (assessmentId: number) =>
    api.get<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}`
    ),

  updateDraft: (assessmentId: number, data: UpdateRelationshipAssessmentRequest) =>
    api.put<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}`,
      data
    ),

  submit: (assessmentId: number) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/submit`,
      {}
    ),

  complete: (assessmentId: number, data?: UpdateRelationshipAssessmentRequest) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/complete`,
      data || {}
    ),

  requestChanges: (assessmentId: number, data: RequestChangesAssessmentRequest) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/request-changes`,
      data
    ),

  finalize: (assessmentId: number, data: FinalizeRelationshipAssessmentRequest) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/finalize`,
      data
    ),

  newVersion: (companyProfileId: string) =>
    api.post<RelationshipAssessmentResponse>(
      `/company-profiles/${encodeURIComponent(companyProfileId)}/relationship-assessments/new-version`,
      {}
    ),

  createOwnerAdjustment: (sourceAssessmentId: number) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${sourceAssessmentId}/owner-adjustment`,
      {}
    ),

  updateOwnerAdjustment: (assessmentId: number, data: OwnerAdjustmentUpdateRequest) =>
    api.put<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/owner-adjustment`,
      data
    ),

  completeOwnerAdjustment: (assessmentId: number, data?: OwnerAdjustmentUpdateRequest) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/complete-owner-adjustment`,
      data || {}
    ),

  cancelOwnerAdjustment: (assessmentId: number) =>
    api.post<RelationshipAssessmentResponse>(
      `/relationship-assessments/${assessmentId}/cancel-owner-adjustment`,
      {}
    ),
};
