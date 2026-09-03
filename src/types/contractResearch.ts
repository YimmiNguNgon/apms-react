export type ContractType =
  | 'COOPERATION_AGREEMENT'
  | 'PARTNERSHIP_AGREEMENT'
  | 'JOINT_VENTURE_AGREEMENT'
  | 'BUSINESS_COOPERATION_CONTRACT'
  | 'UNKNOWN';

export type ContractTypeSelection =
  | 'AUTO_DETECT'
  | 'COOPERATION_AGREEMENT'
  | 'PARTNERSHIP_AGREEMENT'
  | 'JOINT_VENTURE_AGREEMENT'
  | 'BUSINESS_COOPERATION_CONTRACT';

export type ContractResearchStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
export type ContractEntryReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';
export type ContractExtractionStatus = 'NOT_EXTRACTED' | 'PROCESSING' | 'AWAITING_TYPE_CONFIRMATION' | 'COMPLETED' | 'FAILED';
export type ContractExtractionStage =
  | 'QUEUED'
  | 'PARSING_DOCUMENT'
  | 'CLASSIFYING_CONTRACT'
  | 'EXTRACTING_FIELDS'
  | 'VALIDATING_RESULTS'
  | 'SAVING_RESULTS';

export type ContractStatus = 'NOT_EFFECTIVE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'UNKNOWN';
export type CompanyMatchStatus = 'MATCH' | 'POSSIBLE_MATCH' | 'MISMATCH' | 'UNKNOWN';
export type TypeValidationStatus = 'MATCH' | 'MISMATCH' | 'CONFIRMED';
export type ContractFieldQualityStatus = 'VALID' | 'NEEDS_REVIEW';
export type ContractFieldVerificationStatus = 'UNVERIFIED' | 'VERIFIED';
export type ContractFieldInputMethod = 'AI_EXTRACTED' | 'MANUAL';

export interface ExtractedContractField<T> {
  value: T | null;
  sourcePage: number | null;
  evidence: string | null;
  confidence: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ContractParty {
  id: string;
  legalName: string;
  taxCode?: string | null;
  address?: string | null;
  representative?: string | null;
  role?: string | null;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ContractValue {
  amount: number | string | null;
  currency: string;
  rawAmountText?: string | null;
}

export interface CommonContractData {
  contractTitle?: ExtractedContractField<string> | null;
  contractNumber?: ExtractedContractField<string> | null;
  signingDate?: ExtractedContractField<string> | null;
  effectiveDate?: ExtractedContractField<string> | null;
  expiryDate?: ExtractedContractField<string> | null;
  term?: ExtractedContractField<string> | null;
  parties: ContractParty[];
  purpose?: ExtractedContractField<string> | null;
  contractValue?: ExtractedContractField<ContractValue> | null;
  governingLaw?: ExtractedContractField<string> | null;
}

export interface PartyResponsibility {
  id: string;
  party: string;
  responsibility: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ResourceCommitment {
  id: string;
  party: string;
  resourceType: string;
  description: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface CooperationAgreementData {
  cooperationScope?: ExtractedContractField<string> | null;
  cooperationActivities: ExtractedContractField<string>[];
  responsibilities: PartyResponsibility[];
  resourceCommitments: ResourceCommitment[];
  informationSharing?: ExtractedContractField<string> | null;
  coordinationMechanism?: ExtractedContractField<string> | null;
  terminationConditions: ExtractedContractField<string>[];
}

export interface PartnerRole {
  id: string;
  party: string;
  role: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface MutualCommitment {
  id: string;
  party: string;
  commitment: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface PerformanceRequirement {
  id: string;
  requirement: string;
  target: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ExclusivityClause {
  isExclusive?: boolean | null;
  scope?: string | null;
}

export interface PartnershipAgreementData {
  partnershipScope?: ExtractedContractField<string> | null;
  partnerRoles: PartnerRole[];
  mutualCommitments: MutualCommitment[];
  benefitSharing?: ExtractedContractField<string> | null;
  salesOrMarketRights?: ExtractedContractField<string> | null;
  exclusivity?: ExtractedContractField<ExclusivityClause> | null;
  performanceRequirements: PerformanceRequirement[];
  relationshipGovernance?: ExtractedContractField<string> | null;
  terminationConditions: ExtractedContractField<string>[];
}

export interface CapitalContribution {
  id: string;
  party: string;
  amount: number | string | null;
  currency: string;
  contributionType: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface OwnershipPercentage {
  id: string;
  party: string;
  percentage: number | string | null;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface VotingRight {
  id: string;
  party: string;
  votingPercentage: number | string | null;
  description: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface DistributionShare {
  id: string;
  party: string;
  percentage: number | string | null;
  description: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ManagementAppointment {
  id: string;
  position: string;
  appointedBy: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface JointVentureAgreementData {
  jointVentureName?: ExtractedContractField<string> | null;
  jointVenturePurpose?: ExtractedContractField<string> | null;
  capitalContributions: CapitalContribution[];
  ownershipPercentages: OwnershipPercentage[];
  governanceStructure?: ExtractedContractField<string> | null;
  votingRights: VotingRight[];
  decisionMakingRules: ExtractedContractField<string>[];
  profitDistribution: DistributionShare[];
  lossSharing: DistributionShare[];
  managementAppointments: ManagementAppointment[];
  exitConditions: ExtractedContractField<string>[];
  transferRestrictions: ExtractedContractField<string>[];
}

export interface BccContribution {
  id: string;
  party: string;
  amount: number | string | null;
  currency: string;
  contributionType: string;
  description?: string | null;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface ContributionRatio {
  id: string;
  party: string;
  ratioPercentage: number | string | null;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface SharingArrangement {
  id: string;
  party: string;
  percentage: number | string | null;
  description: string;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface PartyRightsAndObligations {
  id: string;
  party: string;
  rights: string[];
  obligations: string[];
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod: ContractFieldInputMethod;
}

export interface BusinessCooperationContractData {
  businessScope?: ExtractedContractField<string> | null;
  contributions: BccContribution[];
  contributionRatios: ContributionRatio[];
  revenueSharing: SharingArrangement[];
  profitSharing: SharingArrangement[];
  costSharing: SharingArrangement[];
  lossSharing: SharingArrangement[];
  rightsAndObligations: PartyRightsAndObligations[];
  managementMechanism?: ExtractedContractField<string> | null;
  financialManagement?: ExtractedContractField<string> | null;
  assetOwnership?: ExtractedContractField<string> | null;
  terminationSettlement?: ExtractedContractField<string> | null;
}

export interface ContractReviewEvent {
  id: string;
  submissionId: number;
  contractEntryId: string;
  decision: ContractEntryReviewStatus;
  reason?: string | null;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
}

export interface ContractEntry {
  id: string;
  projectId?: number | null;
  taskId?: number | null;
  documentId: string;
  documentName: string;
  title: string;
  documentDate?: string | null;

  declaredContractType?: ContractType | null;
  detectedContractType?: ContractType | null;
  confirmedContractType?: ContractType | null;
  typeValidationStatus?: TypeValidationStatus | null;
  typeConfirmedBy?: number | null;
  typeConfirmedAt?: string | null;

  classificationSourcePage?: number | null;
  classificationEvidence?: string | null;
  classificationConfidence?: number | null;

  companyMatchStatus?: CompanyMatchStatus | null;
  companyMatchConfirmed?: boolean | null;
  companyMatchConfirmedBy?: number | null;
  companyMatchConfirmedAt?: string | null;

  derivedContractStatus?: ContractStatus | null;
  statusDerivedAt?: string | null;
  statusDerivationReason?: string | null;

  extractionStatus: ContractExtractionStatus;
  extractionStage?: ContractExtractionStage | null;
  extractionProgress?: number | null;
  extractionStartedAt?: string | null;
  extractionCompletedAt?: string | null;
  extractionErrorCode?: string | null;
  extractionErrorMessage?: string | null;

  reviewStatus: ContractEntryReviewStatus;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;

  reviewHistory?: ContractReviewEvent[];

  commonData?: CommonContractData | null;
  cooperationAgreementData?: CooperationAgreementData | null;
  partnershipAgreementData?: PartnershipAgreementData | null;
  jointVentureAgreementData?: JointVentureAgreementData | null;
  businessCooperationContractData?: BusinessCooperationContractData | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ContractResearchResponse {
  id: string;
  taskId: number;
  projectId: number;
  companyProfileId?: string | null;
  status: ContractResearchStatus;
  contracts: ContractEntry[];

  activeSubmissionId?: number | null;
  activeSubmittedContractIds?: string[];
  submittedAt?: string | null;
  canRecallSubmission?: boolean | null;

  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateContractEntryRequest {
  title: string;
  documentDate?: string | null;
  documentId: string;
  declaredContractType?: ContractTypeSelection | null;
}

export interface UpdateContractEntryRequest {
  title: string;
  documentDate?: string | null;
}

export interface UpdateScalarFieldRequest {
  value: unknown;
  evidence?: string | null;
  sourcePage?: number | null;
}

export interface UpdateArrayItemRequest {
  itemPayload: Record<string, unknown>;
  evidence?: string | null;
  sourcePage?: number | null;
}

export interface ResolveContractTypeRequest {
  confirmedContractType: ContractType;
}

export interface ConfirmCompanyMatchRequest {
  confirmed: boolean;
}

export interface SubmitContractResearchRequest {
  contractEntryIds: string[];
  note?: string | null;
}

export interface ReviewContractEntryRequest {
  status: ContractEntryReviewStatus;
  reason?: string | null;
}
