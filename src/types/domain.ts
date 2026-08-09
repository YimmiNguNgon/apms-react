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
export type CandidateStatus = 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'CORRECTED' | 'APPROVED';
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

export interface ProfileResponse {
  id: string;
  companyId: string;
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
  reviewStatus?: string;
  tags?: string[];
  stockTicker?: string;
  stockExchange?: string;
  metadata?: CompanyProfileMetadata;
  version?: number;
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
  members: ProjectMemberResponse[];
}

export interface CreateProjectRequest {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId?: string | null;
  targetCompanyName: string;
  targetRelationshipType?: RelationshipType | null;
  description?: string | null;
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

export interface CandidateResponse {
  id: string;
  projectId: string;
  importJobId: string;
  rawDocumentId: string;
  candidateOrder?: number;
  revisionNumber?: number;
  status: CandidateStatus;
  suggestedRelationshipType?: RelationshipType;
  relationshipConfidenceScore?: number;
  relationshipTypeOverride?: RelationshipType;
  [key: string]: unknown;
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

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED';
export type SubmissionType = 'COMPANY_CANDIDATE' | 'PROFILE_UPDATE_PROPOSAL' | 'DOCUMENT_COLLECTION' | 'COMPANY_REPORT' | 'ROLE_EVALUATION' | 'COMPANY_MEMBER_RESEARCH' | 'OTHER';

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
export type TaskType = 'DOCUMENT_COLLECTION' | 'COMPANY_DATA_PREPARATION' | 'ROLE_EVALUATION' | 'COMPANY_MEMBER_RESEARCH' | 'GENERAL_TASK';

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
  | 'APPROVAL_FAILED'
  | 'REJECTED';
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
  id: string;
  module: string;
  action: string;
  admin: boolean;
  director: boolean;
  manager: boolean;
  staff: boolean;
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
