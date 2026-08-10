import { api } from '../services/api';

export interface TotpStatusResponse {
    enrolled: boolean;
    enabled: boolean;
    locked: boolean;
    lockedUntil?: string;
}

export interface TotpEnrollmentStartResponse {
    enrollmentId: string;
    qrCodeDataUrl: string;
    manualEntryKey: string;
    issuer: string;
    accountName: string;
    expiresAt: string;
}

export interface TotpEnrollmentConfirmRequest {
    enrollmentId: string;
    code: string;
}

export interface StepUpStatusResponse {
    required: boolean;
    verified: boolean;
    expiresAt?: string;
    scope: string;
    resourceId: string;
}

export interface TotpStepUpVerifyRequest {
    code: string;
    scope: string;
    resourceId: string;
}

export interface StepUpVerifyResponse {
    stepUpToken: string;
    expiresInSeconds: number;
}

const totpApi = {
    getStatus: () => 
        api.get<TotpStatusResponse>('/security/totp/status'),
        
    startEnrollment: () => 
        api.post<TotpEnrollmentStartResponse>('/security/totp/enrollment'),
        
    confirmEnrollment: (data: TotpEnrollmentConfirmRequest) => 
        api.post<void>('/security/totp/enrollment/confirm', data),

    getStepUpStatus: (scope: string, resourceId: string) => 
        api.get<StepUpStatusResponse>(`/security/step-up/status`, { params: { scope, resourceId } }),

    verifyStepUp: (data: TotpStepUpVerifyRequest) => 
        api.post<StepUpVerifyResponse>('/security/step-up/totp/verify', data),
};

export default totpApi;
