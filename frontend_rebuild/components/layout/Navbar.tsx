"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { toast } from "sonner";

import HomeLinkLogo from
  "@/components/brand/HomeLinkLogo";


import {
  useAuth,
} from "@/context/AuthContext";

import styles from "./Navbar.module.css";


const navigation = [
  {
    label: "Rentals",
    href: "/rentals",
  },
  {
    label: "Buy property",
    href: "/buy-property",
  },
  {
    label: "Marketplace",
    href: "/marketplace",
  },
  {
    label: "Agents",
    href: "/agents",
  },
] as const;


export default function Navbar() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    user,
    status,
    logout,
  } = useAuth();


  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    scrolled,
    setScrolled,
  ] = useState(false);


  const isHome =
    pathname === "/";


  /* =========================================================
     CLOSE MOBILE MENU ON ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);


  /* =========================================================
     NAVBAR SCROLL STATE
  ========================================================= */

  useEffect(() => {
    const updateScrollState = () => {
      setScrolled(
        window.scrollY > 28,
      );
    };

    updateScrollState();

    window.addEventListener(
      "scroll",
      updateScrollState,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        updateScrollState,
      );
    };
  }, []);


  /* =========================================================
     MOBILE BODY LOCK
  ========================================================= */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [menuOpen]);


  const isActive = (
    href: string,
  ): boolean =>
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    );


  const handleLogout =
    async () => {
      await logout().catch(
        () => undefined,
      );

      toast.success(
        "You have been signed out.",
      );

      router.push("/");
    };


  const authenticated =
    status ===
      "authenticated" &&
    Boolean(user);


  const headerClassName = [
    styles.header,

    isHome
      ? styles.homeHeader
      : styles.innerHeader,

    scrolled
      ? styles.scrolled
      : "",

    menuOpen
      ? styles.menuIsOpen
      : "",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <header
      className={
        headerClassName
      }
    >
      <nav
        className={
          styles.navbar
        }
        aria-label="Main navigation"
      >
        {/* ================================================
            BRAND
        ================================================= */}

        <div
          className={
            styles.logoArea
          }
        >
          <HomeLinkLogo
            href="/"
            size="medium"
            priority
            className={
              styles.brandLogo
            }
          />
        </div>


        {/* ================================================
            DESKTOP NAV
        ================================================= */}

        <div
          className={
            styles.desktopNavigation
          }
        >
          {navigation.map(
            (item) => {
              const active =
                isActive(
                  item.href,
                );

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={[
                    styles.navLink,

                    active
                      ? styles.activeNavLink
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  <span
                    className={
                      styles.navIndicator
                    }
                    aria-hidden="true"
                  />
                </Link>
              );
            },
          )}
        </div>


        {/* ================================================
            RIGHT ACTIONS
        ================================================= */}

        <div
          className={
            styles.actions
          }
        >
         


          {status ===
          "loading" ? (
            <span
              className={
                styles.authSkeleton
              }
              aria-hidden="true"
            />
          ) : authenticated ? (
            <>
              <Link
                href="/dashboard"
                className={
                  styles.dashboardAction
                }
              >
                <LayoutDashboard
                  aria-hidden="true"
                />

                <span>
                  Dashboard
                </span>
              </Link>

              <button
                type="button"
                className={
                  styles.signOutButton
                }
                onClick={
                  handleLogout
                }
              >
                <LogOut
                  aria-hidden="true"
                />

                <span>
                  Sign out
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={
                styles.signInLink
              }
            >
              Sign in
            </Link>
          )}


          <Link
            href="/post-listing"
            className={
              styles.primaryAction
            }
          >
            <Plus
              aria-hidden="true"
            />

            <span>
              Post listing
            </span>
          </Link>


          <button
            type="button"
            className={
              styles.menuButton
            }
            onClick={() =>
              setMenuOpen(
                (current) =>
                  !current,
              )
            }
            aria-label={
              menuOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={
              menuOpen
            }
            aria-controls="mobile-navigation"
          >
            {menuOpen ? (
              <X
                aria-hidden="true"
              />
            ) : (
              <Menu
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>


      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      {menuOpen ? (
        <>
          <button
            type="button"
            className={
              styles.backdrop
            }
            onClick={() =>
              setMenuOpen(false)
            }
            aria-label="Close navigation menu"
          />


          <aside
            id="mobile-navigation"
            className={
              styles.mobilePanel
            }
          >
            <div
              className={
                styles.mobileTop
              }
            >
              <HomeLinkLogo
                href="/"
                size="medium"
                className={
                  styles.mobileLogo
                }
              />

              <button
                type="button"
                className={
                  styles.mobileClose
                }
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="Close navigation menu"
              >
                <X
                  aria-hidden="true"
                />
              </button>
            </div>


            <div
              className={
                styles.mobileIntro
              }
            >
              <span>
                Around OOU
              </span>

              <h2>
                Where do you
                want to go?
              </h2>
            </div>


            <div
              className={
                styles.mobileNavigation
              }
            >
              {navigation.map(
                (
                  item,
                  index,
                ) => {
                  const active =
                    isActive(
                      item.href,
                    );

                  return (
                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className={[
                        styles.mobileLink,

                        active
                          ? styles.activeMobileLink
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        animationDelay:
                          `${
                            index * 45
                          }ms`,
                      }}
                    >
                      <span
                        className={
                          styles.mobileLinkNumber
                        }
                      >
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <strong>
                        {item.label}
                      </strong>

                      <ChevronRight
                        aria-hidden="true"
                      />
                    </Link>
                  );
                },
              )}
            </div>


            <div
              className={
                styles.mobileActions
              }
            >
              {authenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className={
                      styles.mobileSecondaryAction
                    }
                  >
                    <LayoutDashboard
                      aria-hidden="true"
                    />

                    Dashboard
                  </Link>

                  <button
                    type="button"
                    className={
                      styles.mobileSignOutButton
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
                </>
              ) : (
                <Link
                  href="/login"
                  className={
                    styles.mobileSecondaryAction
                  }
                >
                  Sign in
                </Link>
              )}


              <Link
                href="/post-listing"
                className={
                  styles.mobilePrimaryAction
                }
              >
                <Plus
                  aria-hidden="true"
                />

                Post a listing
              </Link>
            </div>


            <div
              className={
                styles.mobileFooter
              }
            >
              <span
                className={
                  styles.trustIcon
                }
              >
                <ShieldCheck
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Search with more context.
                </strong>

                <p>
                  Review listing details,
                  media and publisher
                  information before
                  making contact.
                </p>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </header>
  );
}