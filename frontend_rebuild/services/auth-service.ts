import {
  api,
  clearAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/api";

import type {
  AuthResponse,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  User,
} from "@/types/auth";

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/auth/register",
      payload,
    );

    setAccessToken(response.data.access_token);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/auth/login",
      payload,
    );

    setAccessToken(response.data.access_token);
    return response.data;
  },

  async restoreSession(): Promise<AuthResponse> {
    return refreshAccessToken();
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>("/users/me");
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAccessToken();
    }
  },

  async logoutAll(): Promise<MessageResponse> {
    try {
      const response = await api.post<MessageResponse>(
        "/auth/logout-all",
      );
      return response.data;
    } finally {
      clearAccessToken();
    }
  },

  async forgotPassword(email: string): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>(
      "/auth/forgot-password",
      { email },
    );
    return response.data;
  },

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>(
      "/auth/reset-password",
      {
        token,
        new_password: newPassword,
      },
    );
    return response.data;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    try {
      const response = await api.post<MessageResponse>(
        "/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
      );
      return response.data;
    } finally {
      clearAccessToken();
    }
  },
};