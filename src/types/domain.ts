import type { PageResponse } from '../services/api';

export type Role =
  | 'ROLE_ADMIN'
  | 'ROLE_BUSINESS_OWNER'
  | 'ROLE_MANAGER'
  | 'ROLE_STAFF';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type ProjectType =
  | 'RESEARCH_NEW_COMPANY'
  | 'UPDATE_EXISTING_COMPANY';
export type CandidateStatus = 'DRAFT' | 'PENDING_REVIEW' | 'REVISION_REQUIRED' | 'REJECTED' | 'CORRECTED' | 'APPROVED';
export type ImportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type InputType = 'FILE_UPLOAD' | 'MANUAL_INPUT';
export type RelationshipType =
  | 'PARTNER_WITH'
  | 'COMPETITOR_OF'
  | 'SUPPLIER_OF'
  | 'CUSTOMER_OF'
  | 'POTENTIAL_PARTNER_OF';

export interface RelationshipTypeOption {
  value: RelationshipType;
  label: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  id: number;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  id: number;
  email: string;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  roles: string[];
}

export interface DashboardSummaryDto {
  totalCompanyProfiles: number;
  totalProjects: number;
  totalCandidates: number;
  approvedCandidates: number;
  pendingReviewCandidates: number;
  partnerCount: number;
  competitorCount: number;
  supplierCount: number;
  potentialPartnerCount: number;
  verifiedCompanyCount: number;
  totalIndustries: number;
  totalUsers?: number;
  systemHealth?: number;
  securityAlerts?: number;
  activitiesToday?: number;
}

export interface GraphRelationship {
  sourceCompanyId: string;
  targetCompanyId: string;
  relationshipType: RelationshipType;
  confidenceScore?: number;
}

export interface GraphCompanyDto {
  companyId: string;
  name: string;
  industry?: string;
  relationshipType?: string;
  relationships?: GraphRelationship[];
}

export interface ProfileFinancialInfo {
  revenue?: number;
  revenueCurrency?: string;
  revenueGrowth?: number;
  debtRatio?: number;
  profitMargin?: number;
  fundingStage?: string;
  profitability?: string;
  charterCapital?: number;
}

export interface ProfileFinancialsInfo {
  charterCapital?: number;
  [key: string]: unknown;
}

export interface CompanyProfileFinancialReport {
  reportType?: string;
  periodType?: string;
  reportYear?: number;
  reportPeriod?: string;
  itemsJson?: string;
  sourceUrl?: string;
}

export interface ProfileResponse {
  id: string;
  companyId: string;
  relationshipType?: string;
  identity?: CompanyProfileIdentity;
  business?: CompanyProfileBusiness;
  companySize?: CompanyProfileSize;
  contact?: CompanyProfileContact;
  insights?: CompanyProfileInsights;
  financial?: ProfileFinancialInfo;
  financials?: ProfileFinancialsInfo;
  market?: Record<string, unknown>;
  innovation?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  compliance?: Record<string, unknown>;
  companyMembers?: Array<{
    name?: string;
    fullName?: string;
    position?: string;
    role?: string;
    phone?: string;
    email?: string;
    imageUrl?: string | null;
    sourceUrl?: string | null;
    notes?: string | null;
    researchedAt?: string | null;
    researchedBy?: number | null;
  }>;
  financialReports?: CompanyProfileFinancialReport[];
  reviewStatus?: string;
  tags?: string[];
  stockTicker?: string;
  stockExchange?: string;
  metadata?: CompanyProfileMetadata;
  version?: number;
  responsibleManagerId?: number;
}

export interface CompanyProfileMember {
  fullName?: string;
  position?: string;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  researchedAt?: string | null;
  researchedBy?: number | null;
  taskId?: number | null;
}

export interface CompanyProfileIdentity {
  legalName?: string;
  tradeName?: string;
  taxCode?: string;
  registrationNumber?: string;
  stockTicker?: string;
  stockExchange?: string;
  foundedDate?: string;
}

export interface CompanyProfileBusiness {
  industries?: string[];
  businessModel?: string;
  products?: Array<{ name?: string; category?: string; description?: string }>;
  markets?: string[];
  targetCustomers?: string[];
}

export interface CompanyProfileSize {
  employeeTier?: string;
  employeeCount?: number;
  revenueTier?: string;
}

export interface CompanyProfileAddress {
  type?: string;
  fullAddress?: string;
  city?: string;
  country?: string;
}

export interface CompanyProfileContact {
  website?: string;
  emails?: string[];
  phones?: string[];
  addresses?: CompanyProfileAddress[];
}

export interface CompanyProfileInsights {
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
}

export interface CompanyProfileMetadata {
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export interface ProfileSourcesResponse {
  companyId: string;
  projectIds: string[];
  importJobIds: string[];
  rawDocumentIds: string[];
  candidateIds: string[];
}

export interface ProjectMemberResponse {
  id: number;
  accountId: number;
  email?: string | null;
  fullName?: string | null;
  memberRole: 'MANAGER' | 'STAFF';
  joinedAt: string | null;
}

export interface ProjectResponse {
  id: number;
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId: string | null;
  targetCompanyName: string;
  targetRelationshipType?: RelationshipType | null;
  description: string | null;
  status: ProjectStatus;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  plannedEndDate?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  isOverdue?: boolean;
  members: ProjectMemberResponse[];
}

export interface CreateProjectRequest {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId?: string | null;
  targetCompanyName: string;
  targetRelationshipType?: RelationshipType | null;
  description?: string | null;
  plannedEndDate: string;
}

export interface DuplicateCompanyCheckResponse {
  duplicate: boolean;
  matchingProjects: MatchingProject[];
}

export interface MatchingProject {
  id: number;
  projectName: string;
  targetCompanyName: string;
  status: string;
  projectType: string;
}

export interface MultiDocumentExtractionRequest {
  rawDocumentIds: string[];
}

export interface UpdateProjectRequest {
  projectName?: string;
  description?: string | null;
  status?: ProjectStatus | null;
}

export interface UpdateProjectStatusRequest {
  status: ProjectStatus;
  note?: string | null;
  force?: boolean;
}

export interface AddMemberRequest {
  accountId?: number | null;
  email?: string | null;
  memberRole: 'MANAGER' | 'STAFF';
}

export interface FinancialInfo {
  revenue?: number;
  revenueCurrency?: string;
  revenueGrowth?: number;
  debtRatio?: number;
  profitMargin?: number;
  fundingStage?: string;
  profitability?: string;
}

export interface InnovationInfo {
  patents?: number;
  rdInvestmentPercent?: number;
  techStack?: string[];
  techMaturityLevel?: number;
  productInnovationRate?: number;
  technologyCapabilities?: string[];
}

export interface MarketInfo {
  marketShare?: number;
  brandRank?: number;
  clientCount?: number;
  mainMarkets?: string[];
}

export interface RiskInfo {
  legalRisk?: string;
  financialRisk?: string;
  reputationRisk?: string;
  securityRisk?: string;
  conflictOfInterestRisk?: string;
  supplyInterruptionRisk?: string;
  dependencyRisk?: string;
  overallRiskLevel?: string;
}

export interface ComplianceInfo {
  status?: string;
  qualityCertifications?: string[];
  securityCertifications?: string[];
  antiCorruptionPolicy?: string;
  laborCompliance?: string;
  environmentalPolicy?: string;
}

export interface CandidateResponse {
  id: string;
  projectId: string;
  taskId?: number;
  importJobId?: string;
  rawDocumentId?: string;
  sourceDocumentIds?: string[];
  candidateOrder?: number;
  revisionNumber?: number;
  documentVersion?: number;
  status: CandidateStatus;
  extractionSource?: { extractionMethod: string; providerName?: string };
  suggestedRelationshipType?: RelationshipType;
  relationshipConfidenceScore?: number;
  relationshipTypeOverride?: RelationshipType;
  
  fieldResults?: Record<string, AiFieldResult>;
  fieldEvidence?: Record<string, CandidateFieldEvidence[]>;
  fieldApprovals?: FieldApprovalRecord[] | Record<string, FieldApprovalRecord>;
  qualityStatus?: string;
  qualityMetrics?: Record<string, unknown>;
  identity?: { legalName?: string; [key: string]: any };
  financial?: FinancialInfo;
  market?: MarketInfo;
  innovation?: InnovationInfo;
  risk?: RiskInfo;
  compliance?: ComplianceInfo;

  [key: string]: unknown;
}

export type FieldReviewStatus = 'PENDING' | 'PENDING_REVIEW' | 'EDITED' | 'ACCEPTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'NEEDS_REVIEW' | 'REVISION_REQUIRED' | 'CONFIRMED' | 'ADDED' | 'REMOVED' | 'STALE';

export type FieldApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED' | 'STALE';

export interface FieldApprovalRecord {
  fieldPath?: string;
  status?: FieldApprovalStatus;
  reviewedRevision?: number;
  reviewedByAccountId?: number;
  reviewedAt?: string;
  comment?: string;
  previousStatus?: FieldApprovalStatus;
  previousComment?: string;
  changedInRevision?: number;
  staleReason?: string;
  pendingValue?: unknown;
  pendingEvidenceIds?: string[];
}

export interface CandidateFieldEvidence {
  rawDocumentId?: string;
  documentId?: string;
  sourceDocumentId?: string;
  fileName?: string;
  documentName?: string;
  documentType?: string;
  page?: number;
  pageNumber?: number;
  section?: string;
  sourceUrl?: string;
  url?: string;
  uploadedBy?: string;
  evidenceText?: string;
  text?: string;
  snippet?: string;
  extractedText?: string;
  confidence?: number;
  confidenceScore?: number;
  relevance?: string;
  [key: string]: unknown;
}

export interface AiFieldResult {
  fieldName?: string;
  value?: unknown;
  confidence?: number;
  evidenceText?: string;
  sourceDocumentIds?: string[];
  pageNumber?: number;
  evidence?: CandidateFieldEvidence[];
  validationStatus?: string;
  staffReviewStatus?: FieldReviewStatus;
  managerReviewStatus?: FieldReviewStatus;
  staffReviewComment?: string;
  managerReviewComment?: string;
  staffReviewedAt?: string;
  staffReviewedByUserId?: number;
  managerReviewedAt?: string;
  managerReviewedByUserId?: number;
  previousManagerReviewStatus?: string;
  previousManagerReviewComment?: string;
  previousSubmittedValue?: unknown;
  previousReviewedRevision?: number;
  changedInRevision?: number;
  reviewedValue?: unknown;
  staffReviewedValue?: unknown;
  reviewStatus?: FieldReviewStatus | string; // Synthetic status used by frontend
}

export interface ApproveCandidateRequest {
  relationshipTypeOverride?: RelationshipType;
}

export interface RejectCandidateRequest {
  rejectionReason: string;
}

export interface UpdateCandidateRequest {
  [key: string]: unknown;
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'REVISION_REQUESTED' | 'CHANGES_REQUESTED';
export type SubmissionType = 'COMPANY_CANDIDATE' | 'PROFILE_UPDATE_PROPOSAL' | 'DOCUMENT_COLLECTION' | 'PARTNER_CONTRACT_COLLECTION' | 'COMPANY_REPORT' | 'ROLE_EVALUATION' | 'COMPANY_MEMBER_RESEARCH' | 'COMPANY_NEWS_RESEARCH' | 'OTHER';

export interface WorkbenchDocumentResponse extends ImportJobResponse {
  latestExtractionId?: string | null;
  extractionQualityStatus?: string | null;
  evidenceCoverageRate?: number | null;
  completenessRate?: number | null;
  warningFields?: number | null;
  failedFields?: number | null;
  canGenerateDraft?: boolean;
}

export interface CandidateDraftSummary {
  candidateId: string;
  candidateName?: string | null;
  candidateIndustry?: string | null;
  status: CandidateStatus;
  taskId?: number | null;
  extractionIds?: string[];
  sourceDocumentIds?: string[];
  createdAt?: string | null;
  hasConflicts?: boolean | null;
  conflictCount?: number | null;
  isUnderReview?: boolean | null;
  isApproved?: boolean | null;
  linkedSubmissionId?: number | null;
}

export interface ProjectTaskSubmissionResponse {
  id: number;
  projectTaskId: number;
  projectId: number;
  submittedByUserId?: number | null;
  submissionType: SubmissionType;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  status: SubmissionStatus;
  note?: string | null;
  submittedAt?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CandidateWorkflowResponse {
  candidateId: string;
  candidateStatus: CandidateStatus;
  taskId: number;
  taskStatus: TaskStatus;
  submissionId?: number | null;
  submissionStatus?: SubmissionStatus | null;
  reviewRound?: number | null;
  candidateDetail?: CandidateResponse | null;
}

export interface ProjectTaskWorkbenchResponse {
  projectId: number;
  taskId: number;
  taskTitle: string;
  taskType: TaskType;
  taskStatus: TaskStatus;
  projectType: ProjectType;
  projectStatus: ProjectStatus;
  targetCompanyName?: string | null;
  targetCompanyProfileId?: string | null;
  targetRelationshipType?: RelationshipType | null;
  availableActions?: string[];
  documents?: WorkbenchDocumentResponse[];
  candidateDrafts?: CandidateDraftSummary[];
  profileUpdateProposalDrafts?: unknown[];
  submissions?: ProjectTaskSubmissionResponse[];
}

export interface CreateProjectTaskSubmissionRequest {
  submissionType: SubmissionType;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  note?: string | null;
}

export type ReviewDecision = 'APPROVE' | 'REJECT' | 'REQUEST_REVISION';

export interface ReviewTaskSubmissionRequest {
  decision: ReviewDecision;
  comment?: string | null;
}

export interface AiExtractionResult {
  id?: string;
  extractionId?: string;
  importJobId?: number;
  [key: string]: unknown;
}

export type AiExtractionJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AiExtractionJobStage = 'PREPARING' | 'EXTRACTING' | 'MERGING' | 'CREATING_CANDIDATE' | 'DONE' | 'COMPLETED' | 'FAILED';

export interface AiExtractionJobResponse {
  jobId: string;
  status: AiExtractionJobStatus;
  stage: AiExtractionJobStage | null;
  progress: number | null;
  totalDocuments: number;
  processedDocuments: number;
  candidateId: number | null;
  errorMessage: string | null;
}

export interface MergeCandidateResponse {
  candidateId: string;
  identity?: Record<string, unknown>;
  business?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  insights?: Record<string, unknown>;
  fieldEvidence?: unknown[];
  hasConflicts?: boolean;
  conflictCount?: number;
  sourceDocumentIds?: string[];
  importJobIds?: string[];
  extractionIds?: string[];
}

export interface ImportJobResponse {
  id: number;
  projectId: number;
  rawDocumentId?: string | null;
  inputType: InputType;
  sourceType?: string;
  fileName?: string;
  status: ImportJobStatus;
  uploadedBy?: number | null;
  uploadedByName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  taskId?: string | null;
  uploadedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED';
export type TaskType = 'DOCUMENT_COLLECTION' | 'COMPANY_DATA_PREPARATION' | 'PARTNER_CONTRACT_COLLECTION' | 'ROLE_EVALUATION' | 'COMPANY_MEMBER_RESEARCH' | 'COMPANY_NEWS_RESEARCH' | 'GENERAL_TASK';

export type NewsDraftStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DELETED';

export interface CompanyNewsResearchDraft {
  id: string;
  projectId: number;
  taskId: number;
  targetCompanyProfileId?: string | null;
  title: string;
  summary?: string | null;
  content?: string | null;
  imageStorageKey?: string | null;
  externalImageUrl?: string | null;
  sourceName?: string | null;
  sourceUrl: string;
  author?: string | null;
  publishedAt?: string | null;
  capturedAt?: string | null;
  tags?: string[] | null;
  staffNotes?: string | null;
  reviewStatus: NewsDraftStatus;
  createdByAccountId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateNewsResearchDraftRequest {
  title: string;
  sourceUrl: string;
  publishedAt: string;
  summary?: string | null;
  content?: string | null;
  imageStorageKey?: string | null;
  externalImageUrl?: string | null;
  sourceName?: string | null;
  author?: string | null;
  tags?: string[] | null;
  staffNotes?: string | null;
}

export interface UpdateNewsResearchDraftRequest {
  title?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  summary?: string | null;
  content?: string | null;
  imageStorageKey?: string | null;
  externalImageUrl?: string | null;
  sourceName?: string | null;
  author?: string | null;
  tags?: string[] | null;
  staffNotes?: string | null;
}

export interface SubmitCompanyNewsResearchRequest {
  newsDraftIds: string[];
}

export interface StepUpChallengeResponse {
  challengeId?: number | null;
  maskedPhone?: string | null;
  expiresInSeconds?: number | null;
  status: string;
}

export interface StepUpVerifyResponse {
  stepUpToken: string;
  expiresInSeconds: number;
}

export interface CompanyIntelligenceArticleResponse {
  id: string;
  companyProfileId: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  hasImage: boolean;
  externalImageUrl?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  capturedAt?: string | null;
  tags?: string[] | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CompanyMemberResearchItem {
  fullName: string;
  position: string;
  imageUrl?: string | null;
  sourceUrl: string;
  notes?: string | null;
}

export interface CompanyMemberResearchDraftResponse {
  id?: string | null;
  projectId: number;
  taskId: number;
  companyProfileId?: string | null;
  createdByAccountId?: number | null;
  submissionId?: number | null;
  members: CompanyMemberResearchItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ProjectTaskResponse {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  createdByUserId?: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  taskType: TaskType;
  targetCompanyProfileId?: string | null;
  availableActions?: string[];
}

export interface ProjectTaskDraftResponse {
  id: number;
  taskId: number;
  attachedCompanyProfileId?: string | null;
  note?: string | null;
  status?: TaskStatus | null;
  updatedAt?: string | null;
}

export interface CreateProjectTaskRequest {
  title: string;
  description?: string | null;
  assignedToUserId: number;
  priority: TaskPriority;
  dueDate?: string | null;
  taskType: TaskType;
  targetCompanyProfileId?: string | null;
}

export interface ManualInputRequest {
  inputText: string;
  companyNameHint?: string;
}

export interface ScoreSnapshotDto {
  scoreSnapshotId: number;
  companyId: string;
  companyName?: string | null;
  targetCompanyProfileId?: string | null;
  projectId?: number | null;
  candidateId?: string | null;
  partnerFitScore?: number | null;
  competitionLevel?: number | null;
  riskLevel?: number | null;
  relationshipStrength?: number | null;
  totalScore?: number | null;
  overallScore?: number | null;
  factorsJson?: string | null;
  ruleVersion?: number | null;
  generatedBy?: string | null;
  evaluatedRole?: string | null;
  createdAt?: string | null;
}

export interface ScoreRuleDto {
  id?: number;
  name: string;
  description?: string;
  weight?: number;
  active?: boolean;
}

export type ScoreRole = 'COMPETITOR' | 'PARTNER' | 'POTENTIAL_PARTNER' | 'CUSTOMER' | 'SUPPLIER';
export type RoleEvaluationStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVAL_PROCESSING'
  | 'APPROVED'
  | 'FINAL'
  | 'APPROVAL_FAILED'
  | 'REJECTED';
export type SystemRoleName = 'SYSTEM_ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_DEVELOPMENT_MANAGER' | 'BUSINESS_DEVELOPMENT_STAFF' | 'RESEARCH_STAFF';
export type EvaluationCompletenessStatus = 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
export type CriterionInputMethod = 'AUTOMATIC_PROPOSAL' | 'MANUAL_REVIEWED' | 'MANUAL_OVERRIDE' | 'AI_ASSISTED' | 'AI_ASSISTED_EDITED';
export type CriterionSuggestionReviewStatus = 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED' | 'NEEDS_MORE_DATA';

export interface RoleScoreCriterionRule {
  criterionKey: string;
  criterionName?: string | null;
  weight?: number | string | null;
  direction?: string | null;
  required?: boolean | null;
  displayOrder?: number | null;
}

export interface RoleScoreRuleSetResponse {
  id: number;
  evaluatedRole: ScoreRole;
  ruleSetVersion?: string | null;
  weightingMethod?: string | null;
  weightSource?: string | null;
  weightVersion?: string | null;
  active?: boolean | null;
  criteria?: RoleScoreCriterionRule[];
}

export interface RoleCriterionInput {
  criterionKey?: string | null;
  rawScore?: number | string | null;
  inputMethod?: CriterionInputMethod | null;
  explanation?: string | null;
  evidenceIds?: string[];
  preparedAt?: string | null;
  managerConfirmed?: boolean | null;
  overrideReason?: string | null;
}

export interface RoleAutomaticSuggestion {
  criterionKey?: string | null;
  suggestedRawScore?: number | string | null;
  suggestionRationale?: string | null;
  explanation?: string | null;
  confidence?: number | string | null;
  evidenceCoverage?: number | string | null;
  reviewStatus?: CriterionSuggestionReviewStatus | null;
  validationStatus?: string | null;
  missingData?: string[];
  validationWarnings?: string[];
  calculationWarnings?: string[];
  evidenceIds?: string[];
  sourceFieldPaths?: string[];
  generatedAt?: string | null;
  modelProvider?: string | null;
  modelVersion?: string | null;
}

export interface RoleEvidenceRecord {
  evidenceId: string;
  criterionKey?: string | null;
  sourceType?: string | null;
  rawDocumentId?: string | null;
  companyId?: string | null;
  profileDocumentId?: string | null;
  profileVersion?: number | null;
  externalUrl?: string | null;
  evidenceDate?: string | null;
  extractedFieldPath?: string | null;
  evidenceCategory?: string | null;
  reliability?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  preparedAt?: string | null;
  note?: string | null;
}

export interface RoleEvaluationDraftResponse {
  id: string;
  projectId: number;
  taskId: number;
  targetCompanyId?: string | null;
  targetProfileDocumentId?: string | null;
  targetProfileVersion?: number | null;
  referenceCompanyId?: string | null;
  referenceProfileDocumentId?: string | null;
  referenceProfileVersion?: number | null;
  evaluatedRole: ScoreRole;
  ruleSetVersion?: string | null;
  weightVersion?: string | null;
  status: RoleEvaluationStatus;
  criterionInputs?: Record<string, RoleCriterionInput>;
  automaticSuggestions?: Record<string, RoleAutomaticSuggestion>;
  criterionEvidence?: Record<string, RoleEvidenceRecord[]>;
  staleTargetProfile?: boolean | null;
  staleReferenceProfile?: boolean | null;
  staleRuleSet?: boolean | null;
  active?: boolean | null;
  approvedSnapshotId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  evaluatorRole?: SystemRoleName | null;
  ownerFinalized?: boolean | null;
  ownerFinalEvaluationExists?: boolean | null;
  canEdit?: boolean | null;
  canSubmit?: boolean | null;
  canReview?: boolean | null;
  canReevaluate?: boolean | null;
}

export interface RoleCriterionReadinessResult {
  criterionKey: string;
  sufficiencyStatus?: string | null;
  missingCategories?: string[];
  reasons?: string[];
  evidenceReferenceIds?: string[];
}

export interface RoleEvaluationReadinessResponse {
  evaluationId: string;
  aggregateCompletenessStatus?: EvaluationCompletenessStatus | null;
  criterionResults?: Record<string, RoleCriterionReadinessResult>;
  missingSourceCategories?: string[];
  blockingReasons?: string[];
  warnings?: string[];
  staffMaySubmit?: boolean;
  evaluatedAt?: string | null;
  sourceSnapshotHash?: string | null;
}

export interface RoleEvaluationPreviewResponse {
  label?: 'PREVIEW';
  criterionScores?: Record<string, number | string>;
  normalizedCriterionScores?: Record<string, number | string>;
  completenessStatus?: EvaluationCompletenessStatus | null;
  missingCriteria?: string[];
  previewOverallScore?: number | string | null;
  warnings?: string[];
}

export interface RoleScoreSnapshotResponse {
  id: number;
  targetCompanyProfileId: string;
  targetProfileVersion?: number | null;
  referenceCompanyProfileId?: string | null;
  referenceProfileVersion?: number | null;
  evaluatedRole: ScoreRole;
  criterionScores?: Record<string, number | string>;
  normalizedCriterionScores?: Record<string, number | string>;
  weightsUsed?: Record<string, number | string>;
  overallScore?: number | string | null;
  completenessStatus?: EvaluationCompletenessStatus | null;
  missingCriteria?: string[];
  scoreRuleSetVersion?: string | null;
  weightVersion?: string | null;
  weightingMethod?: string | null;
  weightSource?: string | null;
  calculatedAt?: string | null;
  evaluatorRole?: SystemRoleName | null;
  authoritative?: boolean | null;
}

export interface RoleEvaluationVersionCriterionResponse {
  criterionKey: string;
  rawScore?: number | string | null;
  finalRationale?: string | null;
  inputMethod?: string | null;
  evidenceReferenceIds?: string[];
  evidence?: RoleEvaluationVersionEvidenceResponse[];
  dataSufficiencyStatus?: string | null;
  missingDataExplanation?: string | null;
  suggestionReviewStatus?: string | null;
  staffEdited?: boolean | null;
  managerFeedback?: string | null;
  aiConfidence?: number | string | null;
}

export interface RoleEvaluationVersionEvidenceResponse {
  evidenceId?: string | null;
  criterionKey?: string | null;
  sourceType?: string | null;
  rawDocumentId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  projectId?: string | null;
  taskId?: string | null;
  evidenceCategory?: string | null;
  reliability?: string | null;
  note?: string | null;
  externalUrl?: string | null;
}

export interface RoleEvaluationVersionResponse {
  id: string;
  evaluationId: string;
  projectId?: number | null;
  taskId?: number | null;
  targetCompanyProfileId: string;
  targetCompanyId?: string | null;
  targetCompanyName?: string | null;
  industries?: string[];
  evaluatedRole: ScoreRole;
  versionNumber?: number | null;
  status?: RoleEvaluationStatus | null;
  completenessStatus?: EvaluationCompletenessStatus | null;
  overallScore?: number | string | null;
  criteria?: Record<string, RoleEvaluationVersionCriterionResponse>;
  submittedByAccountId?: number | null;
  submittedAt?: string | null;
  approvedByAccountId?: number | null;
  approvedAt?: string | null;
  reviewComment?: string | null;
  evaluatorRole?: SystemRoleName | null;
  authoritative?: boolean | null;
  createdAt?: string | null;
}

export interface AccountDto {
  id: number;
  email: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  roleName: string;
  roles: Role[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountAdminResponse {
  id: number;
  email: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleName: string;
  roles: string[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserSearchResponse {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  enabled: boolean;
  createdAt: string | null;
}

export interface CreateAccountRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
}

export interface UpdateAccountRequest {
  name?: string;
  email?: string;
  username?: string;
  role?: Role;
  active?: boolean;
  password?: string;
}

export interface RoleDto {
  id: string;
  key: Role | string;
  name: string;
  displayName?: string;
  description?: string;
  userCount?: number;
  permissionCount?: number;
}

export interface PermissionDto {
  id: string | number;
  name: string;
  module: string;
  description?: string;
  // Legacy fields kept for backward compatibility
  action?: string;
  admin?: boolean;
  director?: boolean;
  manager?: boolean;
  staff?: boolean;
}

export interface CandidateAnalysisDto {
  id: string;
  insights?: any;
  financial?: FinancialInfo;
  market?: MarketInfo;
  innovation?: InnovationInfo;
  risk?: RiskInfo;
  compliance?: ComplianceInfo;
  validation?: any;
  normalization?: any;
  deduplication?: any;
}

export interface AuditLogDto {
  id: number;
  timestamp: string;
  actorAccountId?: number | null;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
}

export type PageResult<T> = PageResponse<T>;

export interface CompanyDocumentResponse {
  id: string;
  companyProfileId: string;
  sourceDocumentId: string;
  sourceProjectId?: string | null;
  sourceProjectName?: string | null;
  sourceTaskId?: string | null;
  sourceSubmissionId?: string | null;
  sourceCandidateId?: string | null;
  displayName?: string | null;
  originalFileName?: string | null;
  documentType?: string | null;
  description?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  status?: string | null;
  uploadedBy?: { id: string; name: string } | null;
  uploadedAt?: string | null;
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  previewAvailable: boolean;
  downloadAvailable: boolean;
}

export interface OwnerCompanyIntelligenceResponse {
  company: {
    id: string;
    name: string;
    legalName: string;
    ticker: string;
    website: string;
    headquarters: string;
    industries: string[];
    markets: string[];
    businessModel: string;
    employeeCount: number;
  };
  relationship: {
    type: string;
    businessImpact: string;
    strategicRelevance: string;
    impactTrend: string;
    evidence: Array<{
      sourceName: string;
      sourceType: string;
      sourceUrl: string | null;
      publishedAt: string | null;
      retrievedAt: string | null;
      reliability: string;
    }>;
  };
  executiveBrief: {
    summary: string | null;
    whyItMatters: string[];
    confidence: number | null;
  };
  aiSummary: {
    available: boolean;
    content: string | null;
    status: 'AVAILABLE' | 'NO_DATA';
  };
  news: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    source: string;
    sourceUrl: string;
    publishedAt: string;
    sentiment: string;
    topics: string[];
    businessImpact: string;
    aiSummary: string;
  }>;
  timeline: Array<{
    id: string;
    date: string | null;
    eventType: string;
    summary: string;
    impact: string;
    source: string;
    sourceUrl: string | null;
  }>;
  marketExpansion: Array<{
    market: string;
    eventType: string;
    description: string;
    businessImpact: string;
    source: string;
    sourceUrl: string | null;
    date: string | null;
  }>;
  hiring: Array<{
    title: string;
    trend: string | null;
    description: string;
    source: string;
    sourceUrl: string | null;
    date: string | null;
  }>;
  financial: Array<{
    name: string;
    value: number;
    currency: string;
    period: string | null;
  }>;
  leadership: Array<{
    name: string;
    position: string;
    sourceUrl: string | null;
    researchedAt: string | null;
  }>;
  products: Array<{
    name: string;
    category: string;
    description: string;
  }>;
  evidence: Array<{
    sourceName: string;
    sourceType: string;
    sourceUrl: string | null;
    publishedAt: string | null;
    retrievedAt: string | null;
    reliability: string;
  }>;
  metadata: {
    lastUpdated: string | null;
    dataQuality: string | null;
  };
}

export type MonitoringFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY';
export type MonitoringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type MonitoringReviewResult = 'NO_CHANGE' | 'UPDATE_PROPOSED' | 'RELATIONSHIP_CHANGE_PROPOSED';

export interface CompanyMonitoringAssignmentRequest {
  companyProfileId: string;
  assignedStaffId: number;
  frequency: MonitoringFrequency;
}

export interface CompanyMonitoringUpdateRequest {
  assignedStaffId: number;
  frequency: MonitoringFrequency;
}

export interface CompanyMonitoringReviewRequest {
  result: MonitoringReviewResult;
  updateProposalId?: string;
  note?: string;
}

export interface CompanyMonitoringAssignmentResponse {
  id: number;
  companyProfileId: string;
  companyName: string;
  assignedStaffId: number;
  assignedStaffName: string;
  assignedStaffEmail: string;
  assignedByManagerId: number;
  frequency: MonitoringFrequency;
  assignmentStatus: MonitoringStatus;
  displayStatus: 'UP_TO_DATE' | 'DUE' | 'OVERDUE' | 'PAUSED';
  latestProposalStatus?: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  latestProposalId?: string;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMonitoringReviewResponse {
  id: number;
  monitoringAssignmentId: number;
  companyProfileId: string;
  reviewedById: number;
  reviewedByName: string;
  reviewedAt: string;
  result: MonitoringReviewResult;
  updateProposalId: string | null;
  note: string | null;
}

export interface RelationshipChangeProposalRequest {
  newRelationshipType: string;
  reason?: string;
  effectiveAt?: string;
}

export interface RelationshipChangeReviewRequest {
  rejectReason?: string;
}

export interface RelationshipChangeProposalResponse {
  id: number;
  companyProfileId: string;
  monitoringAssignmentId: number;
  oldRelationshipType: string;
  newRelationshipType: string;
  reason?: string;
  effectiveAt?: string;
  proposedByAccountId: number;
  proposedByAccountName: string;
  proposedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByAccountId?: number;
  reviewedByAccountName?: string;
  reviewedAt?: string;
  rejectReason?: string;
}

export interface RelationshipHistoryResponse {
  id: number;
  companyProfileId: string;
  oldRelationshipType: string;
  newRelationshipType: string;
  reason?: string;
  effectiveAt?: string;
  changedAt: string;
  proposedByAccountId: number;
  proposedByAccountName: string;
  approvedByAccountId: number;
  approvedByAccountName: string;
}
