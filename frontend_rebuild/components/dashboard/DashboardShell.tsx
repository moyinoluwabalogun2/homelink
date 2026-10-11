"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  Flag,
  Home,
  Inbox,
  LayoutDashboard,
  List,
  Loader2,
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

import {
  initials,
  titleCase,
} from "@/lib/formatters";

import {
  dashboardService,
} from "@/services/dashboard-service";

import {
  isMessageCreatedEvent,
  liveEventsService,
} from "@/services/live-events-service";

import {
  CREDITS_CHANGED_EVENT,
} from "@/services/payment-service";

import type {
  UserRole,
} from "@/types/auth";

import type {
  CreditBalance,
} from "@/types/payment";

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


const memberItems: NavigationItem[] = [
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


const agentItems: NavigationItem[] = [
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


const adminItems: NavigationItem[] = [
  {
    label: "Admin overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Advertisements",
    href: "/admin/advertisements",
    icon: CircleDollarSign,
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


const accountItems: NavigationItem[] = [
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
  role: UserRole | undefined,
): NavigationGroup[] {
  if (role === "admin") {
    return [
      {
        label: "Administration",
        items: adminItems,
      },
      {
        label: "Account",
        items: [
          {
            label: "Member dashboard",
            href: "/dashboard",
            icon: Store,
          },
          {
            label: "Account",
            href: "/dashboard/account",
            icon: User,
          },
        ],
      },
    ];
  }

  const groups: NavigationGroup[] = [
    {
      label: "Workspace",
      items: memberItems,
    },
  ];

  if (role === "agent") {
    groups.push({
      label: "Agent tools",
      items: agentItems,
    });
  }

  groups.push({
    label: "Profile",

    items:
      role === "agent"
        ? accountItems.filter(
            (item) =>
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
  } = useAuth();


  const currentUserId =
    user?.id;

  const currentUserRole =
    user?.role;


  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0);

  const [
    creditBalances,
    setCreditBalances,
  ] = useState<
    CreditBalance[] | null
  >(null);

  const [
    shellLoading,
    setShellLoading,
  ] = useState(true);


  const menuButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const closeButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const summaryRequestRef =
    useRef(0);


  useEffect(() => {
    setMobileOpen(false);
  }, [
    pathname,
  ]);


  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    closeButtonRef
      .current
      ?.focus();

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setMobileOpen(false);

        menuButtonRef
          .current
          ?.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    mobileOpen,
  ]);


  const loadShellSummary =
    useCallback(
      async (
        force = false,
      ) => {
        const requestVersion =
          ++summaryRequestRef.current;

        if (
          !currentUserId ||
          currentUserRole ===
            "admin"
        ) {
          setUnreadNotifications(0);
          setUnreadMessages(0);
          setCreditBalances(null);
          setShellLoading(false);

          return;
        }

        setShellLoading(true);

        try {
          const summary =
            await dashboardService
              .getSummary({
                force,
              });

          if (
            requestVersion !==
            summaryRequestRef.current
          ) {
            return;
          }

          setUnreadNotifications(
            summary
              .unread_notifications,
          );

          setUnreadMessages(
            summary.unread_messages,
          );

          setCreditBalances(
            summary.credits,
          );
        } catch {
          if (
            requestVersion !==
            summaryRequestRef.current
          ) {
            return;
          }

          setCreditBalances(null);
        } finally {
          if (
            requestVersion ===
            summaryRequestRef.current
          ) {
            setShellLoading(false);
          }
        }
      },
      [
        currentUserId,
        currentUserRole,
      ],
    );


  useEffect(() => {
    void loadShellSummary();

    return () => {
      summaryRequestRef.current +=
        1;
    };
  }, [
    loadShellSummary,
  ]);


  useEffect(() => {
    const refreshSummary = () => {
      dashboardService
        .invalidateSummary();

      void loadShellSummary(
        true,
      );
    };

    window.addEventListener(
      CREDITS_CHANGED_EVENT,
      refreshSummary,
    );

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      refreshSummary,
    );

    return () => {
      window.removeEventListener(
        CREDITS_CHANGED_EVENT,
        refreshSummary,
      );

      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        refreshSummary,
      );
    };
  }, [
    loadShellSummary,
  ]);


  useEffect(() => {
    if (
      !currentUserId ||
      currentUserRole ===
        "admin"
    ) {
      return;
    }

    const unsubscribe =
      liveEventsService.subscribe(
        (event) => {
          if (
            !isMessageCreatedEvent(
              event,
            )
          ) {
            return;
          }

          const data =
            event.data;

          setUnreadNotifications(
            (current) =>
              current + 1,
          );

          const becameUnread =
            "became_unread" in data
              ? data.became_unread ===
                true
              : true;

          if (becameUnread) {
            setUnreadMessages(
              (current) =>
                current + 1,
            );
          }

          const insideMessages =
            window.location.pathname
              .startsWith(
                "/dashboard/inquiries",
              );

          if (!insideMessages) {
            toast.info(
              `New message about "${data.listing_title}".`,
              {
                action: {
                  label: "Open",

                  onClick: () => {
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

    return unsubscribe;
  }, [
    currentUserId,
    currentUserRole,
    router,
  ]);


  useEffect(() => {
    const handleMessageRead =
      () => {
        setUnreadMessages(
          (current) =>
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


  const groups =
    useMemo(
      () =>
        getNavigationGroups(
          currentUserRole,
        ),
      [
        currentUserRole,
      ],
    );


  const active = (
    href: string,
  ): boolean =>
    pathname === href ||
    (
      href !== "/dashboard" &&
      pathname.startsWith(
        `${href}/`,
      )
    );


  const handleLogout =
    async () => {
      if (loggingOut) {
        return;
      }

      setLoggingOut(true);

      dashboardService
        .invalidateSummary();

      try {
        await logout();
      } catch {
        /*
         * Local credentials are cleared by
         * the authentication layer even if
         * server-side revocation is down.
         */
      } finally {
        toast.success(
          "You have been signed out.",
        );

        router.replace("/");
      }
    };


  const navContent = (
    <>
      <div
        className={
          styles.brandArea
        }
      >
        <HomeLinkLogo
          href={
            currentUserRole ===
            "admin"
              ? "/admin"
              : "/dashboard"
          }
          size="medium"
          subtitle={
            currentUserRole ===
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
          className={styles.avatar}
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
              currentUserRole ??
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
        aria-label={
          "Dashboard navigation"
        }
      >
        {groups.map(
          (group) => (
            <div
              key={group.label}
              className={
                styles.navGroup
              }
            >
              <span
                className={
                  styles.groupLabel
                }
              >
                {group.label}
              </span>

              {group.items.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const isActive =
                    active(
                      item.href,
                    );

                  const badgeCount =
                    item.href ===
                    "/dashboard/notifications"
                      ? unreadNotifications
                      : item.href ===
                          "/dashboard/inquiries"
                        ? unreadMessages
                        : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={
                        isActive
                          ? "page"
                          : undefined
                      }
                      className={`
                        ${styles.navItem}
                        ${
                          isActive
                            ? styles.activeNavItem
                            : ""
                        }
                      `}
                    >
                      <Icon
                        aria-hidden="true"
                      />

                      <span>
                        {item.label}
                      </span>

                      <span
                        className={
                          styles.navTail
                        }
                      >
                        {badgeCount >
                        0 ? (
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
        {currentUserRole !==
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
          onClick={() =>
            void handleLogout()
          }
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2
              className={
                styles.spinner
              }
              aria-hidden="true"
            />
          ) : (
            <LogOut
              aria-hidden="true"
            />
          )}

          {loggingOut
            ? "Signing out…"
            : "Sign out"}
        </button>
      </div>
    </>
  );


  return (
    <div className={styles.shell}>
      <aside
        className={styles.sidebar}
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
            currentUserRole ===
            "admin"
              ? "/admin"
              : "/dashboard"
          }
          size="small"
          showText={false}
          priority
        />

        <div
          className={
            styles.mobileActions
          }
        >
          {currentUserRole !==
          "admin" ? (
            <CreditBadge
              credits={
                creditBalances
              }
              loading={
                shellLoading
              }
            />
          ) : null}

          <button
            ref={menuButtonRef}
            type="button"
            className={
              styles.menuButton
            }
            onClick={() =>
              setMobileOpen(true)
            }
            aria-label={
              "Open dashboard navigation"
            }
            aria-expanded={
              mobileOpen
            }
            aria-controls={
              "dashboard-mobile-navigation"
            }
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
            onClick={() => {
              setMobileOpen(false);

              menuButtonRef
                .current
                ?.focus();
            }}
            aria-label={
              "Close dashboard navigation"
            }
            tabIndex={-1}
          />

          <aside
            id={
              "dashboard-mobile-navigation"
            }
            className={
              styles.mobileDrawer
            }
            role="dialog"
            aria-modal="true"
            aria-label={
              "Dashboard navigation"
            }
          >
            <button
              ref={closeButtonRef}
              type="button"
              className={
                styles.closeButton
              }
              onClick={() => {
                setMobileOpen(false);

                menuButtonRef
                  .current
                  ?.focus();
              }}
              aria-label={
                "Close dashboard navigation"
              }
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
              {currentUserRole ===
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
            {currentUserRole !==
            "admin" ? (
              <CreditBadge
                credits={
                  creditBalances
                }
                loading={
                  shellLoading
                }
              />
            ) : null}
          </div>
        </div>

        <main
          className={styles.main}
        >
          {children}
        </main>
      </div>
    </div>
  );
}