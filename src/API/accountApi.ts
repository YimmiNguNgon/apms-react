import { api } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { UserSearchResponse } from "../types/domain";

export const accountApi = {
    searchAccountsByEmail: async (email = "") => {
        const response = await api.get("/users/search", {
            params: { email: email.trim() },
        });
        return response as unknown as ApiResponse<UserSearchResponse[]>;
    },
    getAllAccounts: async () => accountApi.searchAccountsByEmail(""),
};
