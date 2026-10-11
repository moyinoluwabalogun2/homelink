"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isDefinitiveAuthFailure,
} from "@/lib/api";

import {
  authService,
} from "@/services/auth-service";

import type {
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";


type AuthStatus =
  | "loading"
  | "authenticated"
  | "guest"
  | "unavailable";


interface AuthContextValue {
  user: User | null;

  status:
    AuthStatus;

  isAuthenticated:
    boolean;

  login: (
    payload:
      LoginPayload,
  ) => Promise<User>;

  register: (
    payload:
      RegisterPayload,
  ) => Promise<User>;

  logout:
    () => Promise<void>;

  logoutAll:
    () => Promise<void>;

  refreshProfile:
    () => Promise<
      User | null
    >;

  retryRestore:
    () => void;
}


const AuthContext =
  createContext<
    AuthContextValue
    | undefined
  >(
    undefined,
  );


export function AuthProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  const [
    user,
    setUser,
  ] =
    useState<
      User | null
    >(
      null,
    );

  const [
    status,
    setStatus,
  ] =
    useState<AuthStatus>(
      "loading",
    );

  const [
    restoreAttempt,
    setRestoreAttempt,
  ] =
    useState(0);


  const markGuest =
    useCallback(
      () => {
        setUser(
          null,
        );

        setStatus(
          "guest",
        );
      },
      [],
    );


  const markAuthenticated =
    useCallback(
      (
        authenticatedUser:
          User,
      ) => {
        setUser(
          authenticatedUser,
        );

        setStatus(
          "authenticated",
        );
      },
      [],
    );


  useEffect(
    () => {
      let active =
        true;


      const restore =
        async () => {
          setStatus(
            "loading",
          );

          try {
            const session =
              await authService
                .restoreSession();

            if (
              !active
            ) {
              return;
            }

            markAuthenticated(
              session.user,
            );

          } catch (
            error
          ) {
            if (
              !active
            ) {
              return;
            }

            if (
              isDefinitiveAuthFailure(
                error,
              )
            ) {
              markGuest();

              return;
            }

            setStatus(
              "unavailable",
            );
          }
        };


      const handleUnauthorized =
        () => {
          if (
            active
          ) {
            markGuest();
          }
        };


      window.addEventListener(
        "homelink:unauthorized",
        handleUnauthorized,
      );


      void restore();


      return () => {
        active =
          false;

        window.removeEventListener(
          "homelink:unauthorized",
          handleUnauthorized,
        );
      };
    },
    [
      markAuthenticated,
      markGuest,
      restoreAttempt,
    ],
  );


  const retryRestore =
    useCallback(
      () => {
        setStatus(
          "loading",
        );

        setRestoreAttempt(
          (
            current,
          ) =>
            current +
            1,
        );
      },
      [],
    );


  const login =
    useCallback(
      async (
        payload:
          LoginPayload,
      ): Promise<User> => {
        const session =
          await authService
            .login(
              payload,
            );

        markAuthenticated(
          session.user,
        );

        return session.user;
      },
      [
        markAuthenticated,
      ],
    );


  const register =
    useCallback(
      async (
        payload:
          RegisterPayload,
      ): Promise<User> => {
        const session =
          await authService
            .register(
              payload,
            );

        markAuthenticated(
          session.user,
        );

        return session.user;
      },
      [
        markAuthenticated,
      ],
    );


  const logout =
    useCallback(
      async (): Promise<void> => {
        try {
          await authService
            .logout();

        } finally {
          markGuest();
        }
      },
      [
        markGuest,
      ],
    );


  const logoutAll =
    useCallback(
      async (): Promise<void> => {
        try {
          await authService
            .logoutAll();

        } finally {
          markGuest();
        }
      },
      [
        markGuest,
      ],
    );


  const refreshProfile =
    useCallback(
      async (): Promise<
        User | null
      > => {
        try {
          const currentUser =
            await authService
              .getMe();

          markAuthenticated(
            currentUser,
          );

          return currentUser;

        } catch (
          error
        ) {
          if (
            isDefinitiveAuthFailure(
              error,
            )
          ) {
            markGuest();
          }

          return null;
        }
      },
      [
        markAuthenticated,
        markGuest,
      ],
    );


  const value =
    useMemo<
      AuthContextValue
    >(
      () => ({
        user,

        status,

        isAuthenticated:
          status ===
            "authenticated" &&
          Boolean(
            user,
          ),

        login,

        register,

        logout,

        logoutAll,

        refreshProfile,

        retryRestore,
      }),
      [
        user,
        status,
        login,
        register,
        logout,
        logoutAll,
        refreshProfile,
        retryRestore,
      ],
    );


  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth():
  AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}