import Link from "next/link";

import {
  ArrowUpRight,
  LifeBuoy,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import HomeLinkLogo from
  "@/components/brand/HomeLinkLogo";

import styles from "./Footer.module.css";


const footerGroups = [
  {
    title: "Explore",
    links: [
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
        label: "Approved agents",
        href: "/agents",
      },
    ],
  },

  {
    title: "Your account",
    links: [
      {
        label: "Sign in",
        href: "/login",
      },
      {
        label: "Create account",
        href: "/register",
      },
      {
        label: "Post a listing",
        href: "/post-listing",
      },
      {
        label: "Dashboard",
        href: "/dashboard",
      },
    ],
  },

  {
    title: "Support",
    links: [
      {
        label: "Safety centre",
        href: "/safety",
      },
      {
        label: "Rental safety",
        href: "/safety/rentals",
      },
      {
        label: "Help & support",
        href: "/support",
      },
      {
        label: "Approved profiles",
        href: "/agents",
      },
    ],
  },

  {
    title: "Legal",
    links: [
      {
        label: "Privacy notice",
        href: "/privacy",
      },
      {
        label: "Terms of service",
        href: "/terms",
      },
      {
        label: "Cookie notice",
        href: "/cookie-policy",
      },
    ],
  },
] as const;


export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* =====================================================
          MAIN FOOTER
      ====================================================== */}

      <div className={styles.inner}>
        <div className={styles.footerIntro}>
          <div className={styles.brandArea}>
            <HomeLinkLogo
              href="/"
              size="large"
              className={styles.logo}
            />

            <p>
              A simpler way to discover
              rentals, property and useful
              student deals around OOU.
            </p>
          </div>


          <div className={styles.footerStatement}>
            <span>
              Built around OOU
            </span>

            <h2>
              Closer to where
              life happens.
            </h2>
          </div>
        </div>


        {/* =================================================
            LOCATION STRIP
        ================================================== */}

        <div className={styles.locationStrip}>
          <div className={styles.locationIcon}>
            <MapPin aria-hidden="true" />
          </div>

          <div>
            <span>
              HomeLink currently serves
            </span>

            <strong>
              OOU campuses and nearby communities
            </strong>
          </div>
        </div>


        {/* =================================================
            LINKS
        ================================================== */}

        <div className={styles.footerNavigation}>
          <div className={styles.navigationLabel}>
            <span>
              Navigate
            </span>

            <p>
              Find what you need
              around HomeLink.
            </p>
          </div>


          <div className={styles.linkGrid}>
            {footerGroups.map((group) => (
              <div
                key={group.title}
                className={styles.linkGroup}
              >
                <h3>
                  {group.title}
                </h3>

                <div>
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                    >
                      <span>
                        {link.label}
                      </span>

                      <ArrowUpRight
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* =====================================================
          BOTTOM
      ====================================================== */}

      <div className={styles.bottomArea}>
        <div className={styles.bottomInner}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} HomeLink.
            All rights reserved.
          </span>


          <div className={styles.bottomActions}>
            <Link
              href="/safety"
              className={styles.safetyLink}
            >
              <ShieldCheck aria-hidden="true" />

              Safer discovery
            </Link>

            <Link
              href="/support"
              className={styles.supportLink}
            >
              <LifeBuoy aria-hidden="true" />

              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}