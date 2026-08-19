"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Activity,
  Bell,
  Bookmark,
  Building2,
  CheckSquare,
  ChevronRight,
  CreditCard,
  FileCheck2,
  Flag,
  Home,
  Inbox,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  User,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import HomeLinkLogo from "@/components/brand/HomeLinkLogo";

import CreditBadge from "@/components/dashboard/CreditBadge";

import { useAuth } from "@/context/AuthContext";

import { dashboardService } from "@/services/dashboard-service";

import {
  isMessageCreatedEvent,
  liveEventsService,
} from "@/services/live-events-service";

import {
  CREDITS_CHANGED_EVENT,
} from "@/services/payment-service";

import {
  initials,
  titleCase,
} from "@/lib/formatters";

import type {
  UserRole,
} from "@/types/auth";

import styles from "./DashboardShell.module.css";


export const NOTIFICATIONS_CHANGED_EVENT =
  "homelink:notifications-changed";

export const MESSAGE_READ_EVENT =
  "homelink:message-read";


interface NavigationItem {
  label: string;
  href: string;
  icon: typeof Home;
}


interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}


const memberItems:
  NavigationItem[] = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: Home,
    },

    {
      label: "Saved",
      href: "/dashboard/saved",
      icon: Bookmark,
    },

    {
      label: "Messages",
      href: "/dashboard/inquiries",
      icon: MessageSquare,
    },

    {
      label: "My listings",
      href: "/dashboard/listings",
      icon: List,
    },

    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
    },

    {
      label: "Credits & payments",
      href: "/dashboard/credits",
      icon: CreditCard,
    },
  ];


const agentItems:
  NavigationItem[] = [
    {
      label: "Agent overview",
      href: "/dashboard/agent",
      icon: LayoutDashboard,
    },

    {
      label: "Incoming leads",
      href: "/dashboard/leads",
      icon: Inbox,
    },

    {
      label: "Post rental",
      href: "/post-listing/rental",
      icon: Home,
    },

    {
      label: "Post property",
      href: "/post-listing/property",
      icon: Building2,
    },
  ];


const adminItems:
  NavigationItem[] = [
    {
      label: "Admin overview",
      href: "/admin",
      icon: LayoutDashboard,
    },

    {
      label: "Pending listings",
      href: "/admin/listings",
      icon: CheckSquare,
    },

    {
      label: "Agent applications",
      href: "/admin/agents",
      icon: FileCheck2,
    },

    {
      label: "Reports",
      href: "/admin/reports",
      icon: Flag,
    },

    {
      label: "Users",
      href: "/admin/users",
      icon: Users,
    },

    {
      label: "Audit logs",
      href: "/admin/audit",
      icon: Activity,
    },

    {
      label: "System",
      href: "/admin/system",
      icon: Settings,
    },
  ];


const accountItems:
  NavigationItem[] = [
    {
      label: "Agent verification",
      href: "/dashboard/agent-application",
      icon: FileCheck2,
    },

    {
      label: "Account",
      href: "/dashboard/account",
      icon: User,
    },
  ];


function getNavigationGroups(
  role:
    | UserRole
    | undefined,
): NavigationGroup[] {
  if (
    role === "admin"
  ) {
    return [
      {
        label:
          "Administration",

        items:
          adminItems,
      },

      {
        label:
          "Account",

        items: [
          {
            label:
              "Member dashboard",

            href:
              "/dashboard",

            icon: Store,
          },

          {
            label:
              "Account",

            href:
              "/dashboard/account",

            icon: User,
          },
        ],
      },
    ];
  }


  const groups:
    NavigationGroup[] = [
      {
        label:
          "Workspace",

        items:
          memberItems,
      },
    ];


  if (
    role === "agent"
  ) {
    groups.push({
      label:
        "Agent tools",

      items:
        agentItems,
    });
  }


  groups.push({
    label:
      "Profile",

    items:
      role === "agent"
        ? accountItems.filter(
            (
              item,
            ) =>
              item.href !==
              "/dashboard/agent-application",
          )
        : accountItems,
  });


  return groups;
}


export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    user,
    logout,
  } =
    useAuth();


  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(false);


  const [
    unreadNotifications,
    setUnreadNotifications,
  ] =
    useState(0);


  const [
    unreadMessages,
    setUnreadMessages,
  ] =
    useState(0);


  const [
    marketplaceCredits,
    setMarketplaceCredits,
  ] =
    useState<number | null>(
      null,
    );


  const [
    shellLoading,
    setShellLoading,
  ] =
    useState(true);


  /* =========================================================
     MOBILE NAV
  ========================================================= */

  useEffect(() => {
    setMobileOpen(
      false,
    );
  }, [
    pathname,
  ]);


  useEffect(() => {
    if (
      !mobileOpen
    ) {
      return;
    }

    const oldOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        oldOverflow;
    };
  }, [
    mobileOpen,
  ]);


  /* =========================================================
     DASHBOARD SUMMARY
  ========================================================= */

  const loadShellSummary =
    useCallback(
      async (
        force = false,
      ) => {
        if (
          !user ||
          user.role ===
            "admin"
        ) {
          setUnreadNotifications(
            0,
          );

          setUnreadMessages(
            0,
          );

          setMarketplaceCredits(
            null,
          );

          setShellLoading(
            false,
          );

          return;
        }

        try {
          const summary =
            await dashboardService.getSummary(
              {
                force,
              },
            );

          setUnreadNotifications(
            summary.unread_notifications,
          );

          setUnreadMessages(
            summary.unread_messages,
          );

          const marketplace =
            summary.credits.find(
              (
                balance,
              ) =>
                balance.credit_type ===
                "marketplace",
            );

          setMarketplaceCredits(
            marketplace
              ? marketplace.free_remaining +
                  marketplace.paid_remaining
              : 0,
          );
        } catch {
          setMarketplaceCredits(
            null,
          );
        } finally {
          setShellLoading(
            false,
          );
        }
      },
      [
        user,
      ],
    );


  useEffect(() => {
    setShellLoading(
      true,
    );

    void loadShellSummary();
  }, [
    loadShellSummary,
  ]);


  /* =========================================================
     CREDIT + NOTIFICATION REFRESH
  ========================================================= */

  useEffect(() => {
    const refreshCredits =
      () => {
        dashboardService.invalidateSummary();

        void loadShellSummary(
          true,
        );
      };


    const refreshNotifications =
      () => {
        dashboardService.invalidateSummary();

        void loadShellSummary(
          true,
        );
      };


    window.addEventListener(
      CREDITS_CHANGED_EVENT,
      refreshCredits,
    );

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      refreshNotifications,
    );


    return () => {
      window.removeEventListener(
        CREDITS_CHANGED_EVENT,
        refreshCredits,
      );

      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        refreshNotifications,
      );
    };
  }, [
    loadShellSummary,
  ]);


  /* =========================================================
     GLOBAL LIVE EVENTS

     DashboardShell persists across dashboard navigation.

     That means HomeLink keeps ONE shared authenticated stream
     alive while the member moves between Overview, Saved,
     Listings, Credits, Messages, etc.

     No polling.
     No summary refetch per message.
  ========================================================= */

  useEffect(() => {
    if (
      !user ||
      user.role ===
        "admin"
    ) {
      return;
    }


    const unsubscribe =
      liveEventsService.subscribe(
        (
          event,
        ) => {
          if (
            !isMessageCreatedEvent(
              event,
            )
          ) {
            return;
          }


          const data =
            event.data;


          /*
           * Every message event also corresponds to the
           * NEW_INQUIRY notification currently created by
           * the backend.
           *
           * We know exactly one unread notification was added,
           * so update locally rather than reloading summary.
           */
          setUnreadNotifications(
            (
              current,
            ) =>
              current + 1,
          );


          /*
           * The backend calculates this while it holds the
           * Inquiry row lock.
           *
           * became_unread = true:
           *   this conversation changed read -> unread.
           *
           * became_unread = false:
           *   it was already unread, so another message must
           *   NOT increase the conversation badge again.
           */
          const becameUnread =
            "became_unread" in
              data
              ? data.became_unread ===
                true
              : true;


          if (
            becameUnread
          ) {
            setUnreadMessages(
              (
                current,
              ) =>
                current + 1,
            );
          }


          /*
           * The Messages page has its own subscriber for
           * updating bubbles/inbox rows instantly.
           *
           * Do not duplicate its toast while the member is
           * already inside Messages.
           */
          const insideMessages =
            window.location.pathname.startsWith(
              "/dashboard/inquiries",
            );


          if (
            !insideMessages
          ) {
            toast.info(
              `New message about "${data.listing_title}".`,
              {
                action: {
                  label:
                    "Open",

                  onClick:
                    () => {
                      router.push(
                        `/dashboard/inquiries?thread=${encodeURIComponent(
                          data.inquiry_id,
                        )}`,
                      );
                    },
                },
              },
            );
          }
        },
      );


    return () => {
      unsubscribe();
    };
  }, [
    user?.id,
    user?.role,
    router,
  ]);


  /* =========================================================
     LOCAL MESSAGE READ UPDATE

     Opening/reading a conversation does NOT refetch dashboard
     summary. We already know exactly one unread conversation
     became read, so decrement locally.
  ========================================================= */

  useEffect(() => {
    const handleMessageRead =
      () => {
        setUnreadMessages(
          (
            current,
          ) =>
            Math.max(
              0,
              current - 1,
            ),
        );
      };


    window.addEventListener(
      MESSAGE_READ_EVENT,
      handleMessageRead,
    );


    return () => {
      window.removeEventListener(
        MESSAGE_READ_EVENT,
        handleMessageRead,
      );
    };
  }, []);


  /* =========================================================
     NAVIGATION
  ========================================================= */

  const groups =
    useMemo(
      () =>
        getNavigationGroups(
          user?.role,
        ),
      [
        user?.role,
      ],
    );


  const active = (
    href: string,
  ): boolean =>
    pathname === href ||
    (
      href !==
        "/dashboard" &&
      pathname.startsWith(
        `${href}/`,
      )
    );


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    async () => {
      dashboardService.invalidateSummary();

      await logout().catch(
        () =>
          undefined,
      );

      toast.success(
        "You have been signed out.",
      );

      router.replace(
        "/",
      );
    };


  /* =========================================================
     NAV CONTENT
  ========================================================= */

  const navContent = (
    <>
      <div
        className={
          styles.brandArea
        }
      >
        <HomeLinkLogo
          href={
            user?.role ===
            "admin"
              ? "/admin"
              : "/dashboard"
          }
          size="medium"
          subtitle={
            user?.role ===
            "admin"
              ? "Control centre"
              : "Member space"
          }
        />
      </div>


      <div
        className={
          styles.profileCard
        }
      >
        <span
          className={
            styles.avatar
          }
        >
          {initials(
            user?.full_name ??
              "HL",
          )}
        </span>

        <div>
          <strong>
            {user?.full_name ??
              "HomeLink member"}
          </strong>

          <span>
            {titleCase(
              user?.role ??
                "user",
            )}
          </span>
        </div>

        <ShieldCheck
          aria-hidden="true"
        />
      </div>


      <nav
        className={
          styles.navigation
        }
        aria-label="Dashboard navigation"
      >
        {groups.map(
          (
            group,
          ) => (
            <div
              key={
                group.label
              }
              className={
                styles.navGroup
              }
            >
              <span
                className={
                  styles.groupLabel
                }
              >
                {
                  group.label
                }
              </span>


              {group.items.map(
                (
                  item,
                ) => {
                  const Icon =
                    item.icon;


                  const badgeCount =
                    item.href ===
                    "/dashboard/notifications"
                      ? unreadNotifications
                      : item.href ===
                          "/dashboard/inquiries"
                        ? unreadMessages
                        : 0;


                  const showBadge =
                    badgeCount >
                    0;


                  return (
                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className={`${styles.navItem} ${
                        active(
                          item.href,
                        )
                          ? styles.activeNavItem
                          : ""
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                      />

                      <span>
                        {
                          item.label
                        }
                      </span>


                      <span
                        className={
                          styles.navTail
                        }
                      >
                        {showBadge ? (
                          <span
                            className={
                              styles.navBadge
                            }
                            aria-label={`${badgeCount} unread ${
                              item.href ===
                              "/dashboard/inquiries"
                                ? "messages"
                                : "notifications"
                            }`}
                          >
                            {badgeCount >
                            99
                              ? "99+"
                              : badgeCount}
                          </span>
                        ) : null}

                        <ChevronRight
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          ),
        )}
      </nav>


      <div
        className={
          styles.sidebarFooter
        }
      >
        {user?.role !==
        "admin" ? (
          <Link
            href="/post-listing"
            className={
              styles.postButton
            }
          >
            <Plus
              aria-hidden="true"
            />

            Post a listing
          </Link>
        ) : null}


        <button
          type="button"
          className={
            styles.logoutButton
          }
          onClick={
            handleLogout
          }
        >
          <LogOut
            aria-hidden="true"
          />

          Sign out
        </button>
      </div>
    </>
  );


  return (
    <div
      className={
        styles.shell
      }
    >
      <aside
        className={
          styles.sidebar
        }
      >
        {navContent}
      </aside>


      <header
        className={
          styles.mobileHeader
        }
      >
        <HomeLinkLogo
          href={
            user?.role ===
            "admin"
              ? "/admin"
              : "/dashboard"
          }
          size="small"
          showText={
            false
          }
          priority
        />


        <div
          className={
            styles.mobileActions
          }
        >
          {user?.role !==
          "admin" ? (
            <CreditBadge
              marketplaceCredits={
                marketplaceCredits
              }
              loading={
                shellLoading
              }
            />
          ) : null}


          <button
            type="button"
            className={
              styles.menuButton
            }
            onClick={() =>
              setMobileOpen(
                true,
              )
            }
            aria-label="Open dashboard navigation"
          >
            <Menu
              aria-hidden="true"
            />
          </button>
        </div>
      </header>


      {mobileOpen ? (
        <>
          <button
            type="button"
            className={
              styles.backdrop
            }
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
            aria-label="Close dashboard navigation"
          />


          <aside
            className={
              styles.mobileDrawer
            }
          >
            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={() =>
                setMobileOpen(
                  false,
                )
              }
              aria-label="Close dashboard navigation"
            >
              <X
                aria-hidden="true"
              />
            </button>

            {navContent}
          </aside>
        </>
      ) : null}


      <div
        className={
          styles.contentColumn
        }
      >
        <div
          className={
            styles.desktopTopbar
          }
        >
          <div
            className={
              styles.accountMeta
            }
          >
            <span>
              {user?.role ===
              "admin"
                ? "Administrator"
                : "HomeLink account"}
            </span>

            <strong>
              {user?.email}
            </strong>
          </div>


          <div
            className={
              styles.topbarActions
            }
          >
            {user?.role !==
            "admin" ? (
              <CreditBadge
                marketplaceCredits={
                  marketplaceCredits
                }
                loading={
                  shellLoading
                }
              />
            ) : null}
          </div>
        </div>


        <main
          className={
            styles.main
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}