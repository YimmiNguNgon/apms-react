export type RelationshipAssessmentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'FINALIZED'
  | 'CANCELLED';

export type RelationshipAssessmentType = 'MANAGER_ASSESSMENT' | 'OWNER_ADJUSTMENT';

export type RelationshipAssessmentRank = 'A' | 'B' | 'C' | 'D';

export type ScoringPolicyVersion =
  | 'RELATIONSHIP_CLOSENESS_V1'
  | 'RELATIONSHIP_CLOSENESS_V2'
  | 'RELATIONSHIP_CLOSENESS_V3'
  | 'RELATIONSHIP_CLOSENESS_V4'
  | 'RELATIONSHIP_CLOSENESS_V5';

export interface CommercialEvidence {
  approvedContractCount: number;
  upcomingContractCount: number;
  firstCooperationDate?: string | null;
  latestContractDate?: string | null;
  relationshipDurationDays?: number | null;
  relationshipDurationMonths?: number | null;
  contractRecencyDays?: number | null;
  contractRecencyMonths?: number | null;
  totalContractValueVnd?: number | null;
  valueByCurrency?: Record<string, number>;
  contractCurrencies?: string | null;
  contractValueStatus: 'SCORABLE' | 'UNSCORABLE_NON_VND' | 'NO_CONTRACTS';
  contractValueScore?: number | null;
  contractCountScore?: number | null;
  relationshipDurationScore?: number | null;
  contractRecencyScore?: number | null;
  commercialScore?: number | null;
  scorableBase: number;
  normalizationApplied: boolean;
  scoringPolicyVersion: string;
  hasValidHistoricalDates: boolean;
  commercialSuggestionStatus?: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'REFERENCE_ONLY';
  commercialAvailablePoints?: number | null;
}

export interface RelationshipAssessmentResponse {
  id: number;
  companyProfileId: string;
  ownerCompanyProfileId: string;
  versionNumber: number;
  majorVersion?: number;
  minorRevision?: number;
  formattedVersion?: string;
  status: RelationshipAssessmentStatus;
  scoringPolicyVersion: string;

  // Commercial Evidence Snapshot
  commercialScore?: number | null;
  commercialSuggestedScore?: number | null;
  commercialAwardedScore?: number | null;
  commercialAdjustmentReason?: string | null;
  commercialEvidenceNote?: string | null;
  contractValueScore?: number | null;
  contractCountScore?: number | null;
  relationshipDurationScore?: number | null;
  contractRecencyScore?: number | null;
  approvedContractCount: number;
  totalContractValueVnd?: number | null;
  contractCurrencies?: string | null;
  currencyBreakdown?: string | null;
  contractValueStatus: 'SCORABLE' | 'UNSCORABLE_NON_VND' | 'NO_CONTRACTS';
  firstCooperationDate?: string | null;
  latestContractDate?: string | null;
  upcomingContractCount: number;
  commercialSuggestionStatus?: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'REFERENCE_ONLY';
  commercialAvailablePoints?: number | null;

  // Normalization
  scorableBase: number;
  normalizationApplied: boolean;

  // Manager Assessment
  cooperationScore?: number | null;
  cooperationEvidenceNote?: string | null;
  strategicScore?: number | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkScore?: number | null;
  relationshipNetworkNote?: string | null;
  engagementScore?: number | null;
  engagementEvidenceNote?: string | null;
  qualitativeScore?: number | null;
  qualitativeEvidenceNote?: string | null;
  trustScore?: number | null;
  trustEvidenceNote?: string | null;
  managerNote?: string | null;
  managerRawScorableScore?: number | null;
  managerTotalScore?: number | null;
  managerNormalizedScore?: number | null;
  managerRank?: RelationshipAssessmentRank | null;
  managerRankDescription?: string | null;
  managerAccountId?: number | null;
  managerSubmittedAt?: string | null;

  // Changes Requested
  changesRequestedReason?: string | null;
  changesRequestedByAccountId?: number | null;
  changesRequestedAt?: string | null;

  // Owner Final Assessment & Overrides
  ownerCommercialScore?: number | null;
  ownerCommercialNote?: string | null;
  ownerCooperationScore?: number | null;
  ownerCooperationNote?: string | null;
  ownerStrategicScore?: number | null;
  ownerStrategicNote?: string | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementScore?: number | null;
  ownerEngagementNote?: string | null;
  ownerQualitativeScore?: number | null;
  ownerQualitativeNote?: string | null;
  ownerTrustScore?: number | null;
  ownerNote?: string | null;
  ownerAdjustmentReason?: string | null;
  ownerRawScorableScore?: number | null;
  ownerFinalTotalScore?: number | null;
  ownerNormalizedScore?: number | null;
  ownerFinalRank?: RelationshipAssessmentRank | null;
  ownerFinalRankDescription?: string | null;
  ownerAccountId?: number | null;
  finalizedAt?: string | null;

  // Draft Completion State
  completedCriteriaCount?: number | null;
  totalCriteriaCount?: number | null;
  draftSubtotalScore?: number | null;
  isComplete?: boolean | null;

  // Official Snapshot Summary
  officialScore?: number | null;
  officialRank?: RelationshipAssessmentRank | null;
  officialRankDescription?: string | null;
  isOfficialFinalized: boolean;

  // Assessment Type & Owner Adjustment Metadata
  assessmentType?: RelationshipAssessmentType | null;
  sourceAssessmentId?: number | null;
  sourceVersionNumber?: number | null;
  sourceFormattedVersion?: string | null;
  isOwnerAdjustment?: boolean;
  createdByAccountId?: number | null;

  // Permissions
  canEditDraft: boolean;
  canSubmit: boolean;
  canComplete?: boolean;
  canRequestChanges: boolean;
  canFinalize: boolean;
  canCreateNewVersion: boolean;
  canAdjust?: boolean;
  canCancelAdjustment?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OwnerAdjustmentUpdateRequest {
  ownerCommercialScore?: number | null;
  ownerCooperationScore?: number | null;
  ownerStrategicScore?: number | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementScore?: number | null;
  ownerQualitativeScore?: number | null;
  ownerAdjustmentReason?: string | null;
  ownerNote?: string | null;
}

export interface RelationshipAssessmentDraftResponse {
  draftId: number;
  companyProfileId: string;
  actorAccountId: number;
  actorRole: string;
  draftType: RelationshipAssessmentType;
  baseOfficialAssessmentId?: number | null;
  baseMajorVersion?: number | null;
  baseMinorRevision?: number | null;
  baseFormattedVersion?: string | null;
  latestOfficialAssessmentId?: number | null;
  latestOfficialMajorVersion?: number | null;
  latestOfficialMinorRevision?: number | null;
  latestOfficialFormattedVersion?: string | null;
  isStale?: boolean;
  isBaseUpdated?: boolean;
  completedCriteriaCount?: number;
  changedCriterionCount?: number;
  commercialScore?: number | null;
  cooperationScore?: number | null;
  strategicScore?: number | null;
  relationshipNetworkScore?: number | null;
  engagementScore?: number | null;
  qualitativeScore?: number | null;
  ownerCommercialScore?: number | null;
  ownerCooperationScore?: number | null;
  ownerStrategicScore?: number | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerEngagementScore?: number | null;
  ownerQualitativeScore?: number | null;
  commercialEvidenceNote?: string | null;
  cooperationEvidenceNote?: string | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkNote?: string | null;
  engagementEvidenceNote?: string | null;
  qualitativeEvidenceNote?: string | null;
  managerNote?: string | null;
  ownerCommercialNote?: string | null;
  ownerCooperationNote?: string | null;
  ownerStrategicNote?: string | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementNote?: string | null;
  ownerQualitativeNote?: string | null;
  ownerNote?: string | null;
  ownerAdjustmentReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRelationshipAssessmentDraftRequest {
  baseOfficialAssessmentId?: number | null;
  baseMajorVersion?: number | null;
  baseMinorRevision?: number | null;
  commercialScore?: number | null;
  cooperationScore?: number | null;
  strategicScore?: number | null;
  relationshipNetworkScore?: number | null;
  engagementScore?: number | null;
  qualitativeScore?: number | null;
  ownerCommercialScore?: number | null;
  ownerCooperationScore?: number | null;
  ownerStrategicScore?: number | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerEngagementScore?: number | null;
  ownerQualitativeScore?: number | null;
  commercialEvidenceNote?: string | null;
  cooperationEvidenceNote?: string | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkNote?: string | null;
  engagementEvidenceNote?: string | null;
  qualitativeEvidenceNote?: string | null;
  managerNote?: string | null;
  ownerCommercialNote?: string | null;
  ownerCooperationNote?: string | null;
  ownerStrategicNote?: string | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementNote?: string | null;
  ownerQualitativeNote?: string | null;
  ownerNote?: string | null;
  ownerAdjustmentReason?: string | null;
}

export interface RelationshipTrendInfo {
  prevVersion: number | null;
  prevFormattedVersion: string;
  prevScore: number;
  prevRank: string;
  currentVersion: number | null;
  currentFormattedVersion: string;
  currentScore: number;
  currentRank: string;
  diff: number;
}

export interface RelationshipOverviewResponse {
  activeAssessment: RelationshipAssessmentResponse | null;
  officialFinalizedAssessment: RelationshipAssessmentResponse | null;
  previousOfficialAssessment?: RelationshipAssessmentResponse | null;
  trendInfo?: RelationshipTrendInfo | null;
  liveCommercialEvidence: CommercialEvidence | null;
  hasActiveAssessment: boolean;
  canCreateAssessment: boolean;
  myDraft?: RelationshipAssessmentDraftResponse | null;
}

export interface CreateRelationshipAssessmentRequest {
  commercialAwardedScore?: number | null;
  commercialAdjustmentReason?: string | null;
  commercialEvidenceNote?: string | null;
  cooperationScore?: number | null;
  cooperationEvidenceNote?: string | null;
  strategicScore?: number | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkScore?: number | null;
  relationshipNetworkNote?: string | null;
  engagementScore?: number | null;
  engagementEvidenceNote?: string | null;
  qualitativeScore?: number | null;
  qualitativeEvidenceNote?: string | null;
  trustScore?: number | null;
  trustEvidenceNote?: string | null;
  managerNote?: string | null;
}

export interface UpdateRelationshipAssessmentRequest {
  commercialAwardedScore?: number | null;
  commercialAdjustmentReason?: string | null;
  commercialEvidenceNote?: string | null;
  cooperationScore?: number | null;
  cooperationEvidenceNote?: string | null;
  strategicScore?: number | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkScore?: number | null;
  relationshipNetworkNote?: string | null;
  engagementScore?: number | null;
  engagementEvidenceNote?: string | null;
  qualitativeScore?: number | null;
  qualitativeEvidenceNote?: string | null;
  trustScore?: number | null;
  trustEvidenceNote?: string | null;
  managerNote?: string | null;
  fullSnapshot?: boolean;
  isFullSnapshot?: boolean;
}

export interface FinalizeRelationshipAssessmentRequest {
  ownerCommercialScore?: number | null;
  ownerCooperationScore?: number | null;
  ownerStrategicScore?: number | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementScore?: number | null;
  ownerQualitativeScore?: number | null;
  ownerTrustScore?: number | null;
  ownerNote?: string | null;
  ownerAdjustmentReason?: string | null;
}

export interface RequestChangesAssessmentRequest {
  reason: string;
}

export interface CompleteRelationshipAssessmentRequest {
  sourceAssessmentId?: number | null;
  baseMajorVersion?: number | null;
  commercialAwardedScore?: number | null;
  commercialAdjustmentReason?: string | null;
  commercialEvidenceNote?: string | null;
  cooperationScore?: number | null;
  cooperationEvidenceNote?: string | null;
  strategicScore?: number | null;
  strategicEvidenceNote?: string | null;
  relationshipNetworkScore?: number | null;
  relationshipNetworkNote?: string | null;
  engagementScore?: number | null;
  engagementEvidenceNote?: string | null;
  qualitativeScore?: number | null;
  qualitativeEvidenceNote?: string | null;
  trustScore?: number | null;
  trustEvidenceNote?: string | null;
  managerNote?: string | null;
}

export interface CompleteOwnerAdjustmentRequest {
  sourceAssessmentId: number;
  baseMajorVersion?: number | null;
  baseMinorRevision?: number | null;
  ownerCommercialScore?: number | null;
  ownerCommercialNote?: string | null;
  ownerCooperationScore?: number | null;
  ownerCooperationNote?: string | null;
  ownerStrategicScore?: number | null;
  ownerStrategicNote?: string | null;
  ownerRelationshipNetworkScore?: number | null;
  ownerRelationshipNetworkNote?: string | null;
  ownerEngagementScore?: number | null;
  ownerEngagementNote?: string | null;
  ownerQualitativeScore?: number | null;
  ownerQualitativeNote?: string | null;
  ownerTrustScore?: number | null;
  ownerAdjustmentReason?: string | null;
  ownerNote?: string | null;
}
