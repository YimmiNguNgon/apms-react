import type { PageResponse } from '../services/api';

export type Role =
  | 'ROLE_ADMIN'
  | 'ROLE_BUSINESS_OWNER'
  | 'ROLE_DIRECTOR'
  | 'ROLE_MANAGER'
  | 'ROLE_KEY_MEMBER'
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

export interface ProfileResponse {
  id: string;
  companyId: string;
  identity?: CompanyProfileIdentity;
  business?: CompanyProfileBusiness;
  companySize?: CompanyProfileSize;
  contact?: CompanyProfileContact;
  insights?: CompanyProfileInsights;
  reviewStatus?: string;
  tags?: string[];
  metadata?: CompanyProfileMetadata;
  version?: number;
}

export interface CompanyProfileIdentity {
  legalName?: string;
  tradeName?: string;
  taxCode?: string;
  registrationNumber?: string;
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
export type SubmissionType = 'COMPANY_CANDIDATE' | 'PROFILE_UPDATE_PROPOSAL' | 'DOCUMENT_COLLECTION' | 'COMPANY_REPORT' | 'ROLE_EVALUATION' | 'OTHER';

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
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED';
export type TaskType = 'DOCUMENT_COLLECTION' | 'COMPANY_DATA_PREPARATION' | 'ROLE_EVALUATION' | 'GENERAL_TASK';

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
  projectId?: number | null;
  candidateId?: string | null;
  partnerFitScore?: number | null;
  competitionLevel?: number | null;
  riskLevel?: number | null;
  relationshipStrength?: number | null;
  totalScore: number;
  factorsJson?: string | null;
  ruleVersion?: number | null;
  generatedBy?: string | null;
  createdAt?: string | null;
}

export interface ScoreRuleDto {
  id?: number;
  name: string;
  description?: string;
  weight?: number;
  active?: boolean;
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
  keymember: boolean;
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
