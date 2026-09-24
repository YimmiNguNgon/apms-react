import { api } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { UserProfileResponse, UserSearchResponse, UpdateMyProfileRequest } from "../types/domain";

export const accountApi = {
    searchAccountsByEmail: async (email = "", role?: string) => {
        const response = await api.get("/users/search", {
            params: {
                email: email.trim(),
                ...(role ? { role } : {}),
            },
        });
        return response as unknown as ApiResponse<UserSearchResponse[]>;
    },
    getAllAccounts: async () => accountApi.searchAccountsByEmail(""),
    getMyProfile: async () => {
        return api.get<UserProfileResponse>("/users/me");
    },
    updateMyProfile: async (data: UpdateMyProfileRequest) => {
        return api.patch<UserProfileResponse>("/users/me/profile", data);
    },
};
