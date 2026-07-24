import { API_BASE_URL } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { UserSearchResponse } from "../types/domain";

const BASE_URL = `${API_BASE_URL}/users`;
const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("apms-token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
export const accountApi = {
    searchAccountsByEmail: async (email = "") => {
        try{
            const url = new URL(`${BASE_URL}/search`);
            if (email.trim()) {
                url.searchParams.set("email", email.trim());
            }

            const response = await fetch(url.toString(), {
                headers: {
                    ...getAuthHeader(),
                },
            });
            const payload = await response.json().catch(() => null);

            if(!response.ok){
                console.error("Search accounts failed:", { status: response.status, payload, email });
                throw new Error(payload?.message || "Failed to search accounts");
            }
            return payload as ApiResponse<UserSearchResponse[]>;
        }
        catch(error){
            console.error("Error searching accounts:", error);
            throw error;
        }
    },
    getAllAccounts: async () => accountApi.searchAccountsByEmail(""),
}
