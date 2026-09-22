import type {
  ContractType,
  ContractStatus,
  CommonContractData,
  CooperationAgreementData,
  PartnershipAgreementData,
  JointVentureAgreementData,
  BusinessCooperationContractData,
  ContractParty,
  ContractValue,
} from './contractResearch';

export interface CompanyProfileContractDto {
  id: string;
  companyProfileId: string;
  title?: string | null;
  contractType: ContractType;
  derivedContractStatus: ContractStatus;
  documentDate?: string | null;
  commonData?: CommonContractData | null;
  cooperationAgreementData?: CooperationAgreementData | null;
  partnershipAgreementData?: PartnershipAgreementData | null;
  jointVentureAgreementData?: JointVentureAgreementData | null;
  businessCooperationContractData?: BusinessCooperationContractData | null;

  sourceType?: string;
  sourceResearchId?: string | null;
  sourceContractEntryId?: string | null;
  sourceDocumentId?: string | null;
  sourceDocumentName?: string | null;
  documentId?: string | null;
  documentName?: string | null;
  projectId?: number | null;
  taskId?: number | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  lastModifiedBy?: number | null;
}

export interface UpdateCompanyProfileContractRequest {
  id: string;
  title?: string;
  documentDate?: string | null;
  contractNumber?: string;
  signingDate?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  term?: string;
  contractValue?: ContractValue;
  governingLaw?: string;
  purpose?: string;
  parties?: ContractParty[];
  cooperationAgreementData?: CooperationAgreementData;
  partnershipAgreementData?: PartnershipAgreementData;
  jointVentureAgreementData?: JointVentureAgreementData;
  businessCooperationContractData?: BusinessCooperationContractData;
}

export interface BatchUpdateCompanyContractsRequest {
  contracts: UpdateCompanyProfileContractRequest[];
}
