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
  | "guest";


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


  /* =======================================================
     RESTORE SESSION
  ======================================================= */

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
            /*
             * Always attempt restoration.
             *
             * The access token intentionally lives only in
             * memory.
             *
             * The refresh token lives in a protected HttpOnly
             * cookie and cannot be inspected by JavaScript.
             */
            const session =
              await authService
                .restoreSession();


            if (!active) {
              return;
            }


            markAuthenticated(
              session.user,
            );

          } catch (
            error
          ) {
            if (!active) {
              return;
            }


            /*
             * 401 / 403 means the server has definitively
             * rejected the session.
             *
             * That is a real logout.
             */
            if (
              isDefinitiveAuthFailure(
                error,
              )
            ) {
              markGuest();

              return;
            }


            /*
             * A network timeout / temporary infrastructure
             * problem must not be interpreted as logout.
             *
             * Keep HomeLink in restoration state. The user is
             * not redirected to /login merely because the API
             * temporarily failed.
             */
            setStatus(
              "loading",
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
    ],
  );


  /* =======================================================
     LOGIN
  ======================================================= */

  const login =
    useCallback(
      async (
        payload:
          LoginPayload,
      ): Promise<User> => {
        const session =
          await authService.login(
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


  /* =======================================================
     REGISTER
  ======================================================= */

  const register =
    useCallback(
      async (
        payload:
          RegisterPayload,
      ): Promise<User> => {
        const session =
          await authService.register(
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


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout =
    useCallback(
      async (): Promise<void> => {
        try {
          await authService.logout();

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
          await authService.logoutAll();

        } finally {
          markGuest();
        }
      },
      [
        markGuest,
      ],
    );


  /* =======================================================
     PROFILE REFRESH
  ======================================================= */

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
          /*
           * Only invalidate the UI session when FastAPI has
           * actually rejected authentication.
           */
          if (
            isDefinitiveAuthFailure(
              error,
            )
          ) {
            markGuest();
          }


          /*
           * A temporary timeout / network failure leaves the
           * existing authenticated UI state untouched.
           */
          return null;
        }
      },
      [
        markAuthenticated,
        markGuest,
      ],
    );


  /* =======================================================
     CONTEXT
  ======================================================= */

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
      }),
      [
        user,
        status,
        login,
        register,
        logout,
        logoutAll,
        refreshProfile,
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


  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }


  return context;
}