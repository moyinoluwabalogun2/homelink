"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
} from "lucide-react";

import { toast } from "sonner";

import DecisionDialog from "@/components/admin/DecisionDialog";
import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";

import { useAuth } from "@/context/AuthContext";

import { getApiErrorMessage } from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import { adminService } from "@/services/admin-service";

import type {
  AccountStatus,
  UserRole,
} from "@/types/auth";

import type {
  AdminUser,
  AdminUserFilters,
} from "@/types/admin";

import styles from "./page.module.css";


interface UserDecision {
  user: AdminUser;
  kind: "status" | "role";
  value: AccountStatus | UserRole;
}


const roles: UserRole[] = [
  "user",
  "agent",
  "admin",
];

const statuses: AccountStatus[] = [
  "active",
  "suspended",
  "deactivated",
];


export default function AdminUsersPage() {
  const { user: currentAdmin } =
    useAuth();

  const [items, setItems] =
    useState<AdminUser[]>([]);

  /*
   * These are draft filters.
   *
   * Changing them does NOT automatically call the API.
   */
  const [query, setQuery] =
    useState("");

  const [role, setRole] =
    useState<UserRole | "">("");

  const [status, setStatus] =
    useState<AccountStatus | "">("");

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [decision, setDecision] =
    useState<UserDecision | null>(null);

  const [error, setError] =
    useState("");

  const requestIdRef =
    useRef(0);

  const appliedFiltersRef =
    useRef<AdminUserFilters>({
      limit: 50,
    });


  /* =========================================================
     LOAD
  ========================================================= */

  const load = useCallback(
    async (
      filters:
        AdminUserFilters,
    ) => {
      const requestId =
        ++requestIdRef.current;

      setLoading(true);
      setError("");

      try {
        const users =
          await adminService.listUsers(
            filters,
          );

        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }

        setItems(users);
      } catch (reason) {
        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }

        setError(
          getApiErrorMessage(
            reason,
            "Users could not be loaded.",
          ),
        );
      } finally {
        if (
          requestId ===
          requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [],
  );


  useEffect(() => {
    void load(
      appliedFiltersRef.current,
    );
  }, [load]);


  /* =========================================================
     FILTERS
  ========================================================= */

  const applyFilters = () => {
    const filters:
      AdminUserFilters = {
        q:
          query.trim() ||
          undefined,

        role:
          role ||
          undefined,

        status:
          status ||
          undefined,

        limit: 50,
      };

    appliedFiltersRef.current =
      filters;

    void load(
      filters,
    );
  };


  const clearFilters = () => {
    setQuery("");
    setRole("");
    setStatus("");

    const filters:
      AdminUserFilters = {
        limit: 50,
      };

    appliedFiltersRef.current =
      filters;

    void load(
      filters,
    );
  };


  /* =========================================================
     LOCAL FILTER CONSISTENCY
  ========================================================= */

  const matchesAppliedFilters = (
    user: AdminUser,
  ): boolean => {
    const filters =
      appliedFiltersRef.current;

    if (
      filters.role &&
      user.role !== filters.role
    ) {
      return false;
    }

    if (
      filters.status &&
      user.status !== filters.status
    ) {
      return false;
    }

    return true;
  };


  /* =========================================================
     SAVE DECISION
  ========================================================= */

  const saveDecision =
    async (
      reason: string,
    ) => {
      if (
        !decision ||
        workingId
      ) {
        return;
      }

      setWorkingId(
        decision.user.id,
      );

      try {
        const updated =
          decision.kind ===
          "status"
            ? await adminService.updateUserStatus(
                decision.user.id,
                decision.value as AccountStatus,
                reason,
              )
            : await adminService.updateUserRole(
                decision.user.id,
                decision.value as UserRole,
                reason,
              );

        /*
         * No refetch after mutation.
         *
         * Update this row locally. If the mutation means the user
         * no longer matches the currently applied role/status
         * filter, remove the row from the current result set.
         */
        setItems(
          (current) =>
            current.flatMap(
              (item) => {
                if (
                  item.id !==
                  updated.id
                ) {
                  return [
                    item,
                  ];
                }

                if (
                  !matchesAppliedFilters(
                    updated,
                  )
                ) {
                  return [];
                }

                return [
                  updated,
                ];
              },
            ),
        );

        toast.success(
          `User ${decision.kind} updated to ${titleCase(
            decision.value,
          )}.`,
        );

        setDecision(null);
      } catch (failure) {
        toast.error(
          getApiErrorMessage(
            failure,
          ),
        );
      } finally {
        setWorkingId(null);
      }
    };


  /* =========================================================
     DIALOG COPY
  ========================================================= */

  const dialogTitle =
    decision
      ? `Change ${decision.user.full_name}'s ${decision.kind}?`
      : "Update user";

  const dialogDescription =
    decision
      ? (
          `This will set the account ${decision.kind} to `
          + `${titleCase(decision.value)}. `
          + "The user's existing session may be invalidated."
        )
      : (
          "Record the reason for this administrative change."
        );


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className={shared.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Users aria-hidden="true" />
            User administration
          </span>

          <h1>
            Accounts and access.
          </h1>

          <p>
            Search HomeLink members,
            inspect account verification
            and manage roles or platform
            access with auditable
            administrative reasons.
          </p>
        </div>


        <div className={styles.resultCount}>
          <span>
            Results
          </span>

          <strong>
            {loading
              ? "—"
              : items.length}
          </strong>
        </div>
      </header>


      {/* =====================================================
          FILTER BAR
      ====================================================== */}

      <section className={styles.toolbar}>
        <div className={styles.searchField}>
          <Search aria-hidden="true" />

          <input
            value={query}
            onChange={(event) => {
              setQuery(
                event.target.value,
              );
            }}
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                applyFilters();
              }
            }}
            placeholder="Search name, email or phone"
            aria-label="Search users"
          />
        </div>


        <select
          value={role}
          onChange={(event) => {
            setRole(
              event.target
                .value as
                UserRole | "",
            );
          }}
          aria-label="Filter by role"
        >
          <option value="">
            All roles
          </option>

          {roles.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {titleCase(item)}
              </option>
            ),
          )}
        </select>


        <select
          value={status}
          onChange={(event) => {
            setStatus(
              event.target
                .value as
                AccountStatus | "",
            );
          }}
          aria-label="Filter by status"
        >
          <option value="">
            All statuses
          </option>

          {statuses.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {titleCase(item)}
              </option>
            ),
          )}
        </select>


        <button
          type="button"
          className={styles.applyButton}
          disabled={loading}
          onClick={applyFilters}
        >
          <Search aria-hidden="true" />
          Apply filters
        </button>


        <button
          type="button"
          className={styles.refreshButton}
          disabled={loading}
          onClick={() => {
            void load(
              appliedFiltersRef.current,
            );
          }}
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
      </section>


      {(query ||
        role ||
        status) ? (
        <button
          type="button"
          className={styles.clearButton}
          disabled={loading}
          onClick={clearFilters}
        >
          Clear filters
        </button>
      ) : null}


      {error ? (
        <div className={shared.error}>
          {error}
        </div>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div className={styles.userList}>
          {Array.from(
            {
              length: 4,
            },
            (_, index) => (
              <div
                key={index}
                className={styles.skeleton}
              />
            ),
          )}
        </div>
      ) : null}


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!loading &&
      items.length === 0 ? (
        <section className={styles.empty}>
          <span>
            <Users aria-hidden="true" />
          </span>

          <h2>
            No matching users.
          </h2>

          <p>
            Change the filters or
            search terms and try again.
          </p>
        </section>
      ) : null}


      {/* =====================================================
          USERS
      ====================================================== */}

      {!loading &&
      items.length > 0 ? (
        <div className={styles.userList}>
          {items.map(
            (user, index) => {
              const isSelf =
                user.id ===
                currentAdmin?.id;

              const busy =
                workingId ===
                user.id;

              return (
                <article
                  key={user.id}
                  className={styles.userCard}
                >
                  <div className={styles.index}>
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </div>


                  <div className={styles.userBody}>
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.nameLine}>
                          <h2>
                            {user.full_name}
                          </h2>

                          {isSelf ? (
                            <span className={styles.youBadge}>
                              You
                            </span>
                          ) : null}
                        </div>

                        <span>
                          Joined{" "}
                          {formatDate(
                            user.created_at,
                          )}
                        </span>
                      </div>

                      <StatusBadge
                        status={user.status}
                      />
                    </div>


                    <div className={styles.contactRow}>
                      <span>
                        <Mail aria-hidden="true" />
                        {user.email}
                      </span>

                      <span>
                        <Phone aria-hidden="true" />
                        {user.phone}
                      </span>
                    </div>


                    <div className={styles.accountFacts}>
                      <div>
                        <span>
                          Role
                        </span>

                        <strong>
                          {titleCase(
                            user.role,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Email verification
                        </span>

                        <strong
                          className={
                            user.is_email_verified
                              ? styles.verified
                              : styles.unverified
                          }
                        >
                          {user.is_email_verified
                            ? (
                                <>
                                  <CheckCircle2
                                    aria-hidden="true"
                                  />
                                  Verified
                                </>
                              )
                            : "Unverified"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Account status
                        </span>

                        <strong>
                          {titleCase(
                            user.status,
                          )}
                        </strong>
                      </div>
                    </div>


                    <div className={styles.controls}>
                      <label>
                        <span>
                          Account role
                        </span>

                        <select
                          value={user.role}
                          disabled={
                            isSelf ||
                            busy ||
                            Boolean(
                              workingId,
                            )
                          }
                          onChange={(event) => {
                            const nextRole =
                              event.target
                                .value as UserRole;

                            if (
                              nextRole ===
                              user.role
                            ) {
                              return;
                            }

                            setDecision({
                              user,
                              kind: "role",
                              value: nextRole,
                            });
                          }}
                          aria-label={
                            `Change ${user.full_name}'s role`
                          }
                        >
                          {roles.map(
                            (item) => (
                              <option
                                key={item}
                                value={item}
                              >
                                {titleCase(
                                  item,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>


                      <div className={styles.statusActions}>
                        {user.status !==
                        "active" ? (
                          <button
                            type="button"
                            className={styles.activateButton}
                            disabled={
                              isSelf ||
                              Boolean(
                                workingId,
                              )
                            }
                            onClick={() => {
                              setDecision({
                                user,
                                kind: "status",
                                value: "active",
                              });
                            }}
                          >
                            <ShieldCheck aria-hidden="true" />
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.suspendButton}
                            disabled={
                              isSelf ||
                              Boolean(
                                workingId,
                              )
                            }
                            onClick={() => {
                              setDecision({
                                user,
                                kind: "status",
                                value:
                                  "suspended",
                              });
                            }}
                          >
                            <ShieldOff aria-hidden="true" />
                            Suspend
                          </button>
                        )}


                        {user.status !==
                        "deactivated" ? (
                          <button
                            type="button"
                            className={styles.deactivateButton}
                            disabled={
                              isSelf ||
                              Boolean(
                                workingId,
                              )
                            }
                            onClick={() => {
                              setDecision({
                                user,
                                kind: "status",
                                value:
                                  "deactivated",
                              });
                            }}
                          >
                            <UserCog aria-hidden="true" />
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </div>


                    {isSelf ? (
                      <p className={styles.selfNote}>
                        Your own administrator
                        role and account status
                        cannot be changed from
                        this screen.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : null}


      <DecisionDialog
        open={Boolean(decision)}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel="Confirm change"
        placeholder="Explain why this access change is required…"
        minimumLength={5}
        tone={
          decision?.value ===
            "deactivated" ||
          decision?.value ===
            "suspended"
            ? "danger"
            : "primary"
        }
        submitting={Boolean(
          decision &&
          workingId ===
            decision.user.id,
        )}
        onCancel={() => {
          setDecision(null);
        }}
        onConfirm={saveDecision}
      />
    </div>
  );
}