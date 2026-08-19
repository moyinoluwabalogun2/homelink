import { api, clearAccessToken } from "@/lib/api";

export const accountService = {
  async requestEmailVerification(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/email-verification/request",
    );
    return response.data;
  },

  async confirmEmailVerification(token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/email-verification/confirm",
      { token },
    );
    return response.data;
  },

  async exportData(currentPassword: string): Promise<Record<string, unknown>> {
    const response = await api.post<Record<string, unknown>>(
      "/account/export",
      { current_password: currentPassword },
    );
    return response.data;
  },

  async deleteAccount(currentPassword: string): Promise<void> {
    await api.delete("/account", {
      data: {
        current_password: currentPassword,
        confirm_delete: true,
      },
    });
    clearAccessToken();
  },
};