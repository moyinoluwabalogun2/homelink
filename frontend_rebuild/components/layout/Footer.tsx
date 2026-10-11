import Link from "next/link";

import {
  ArrowUpRight,
  LifeBuoy,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import HomeLinkLogo from "@/components/brand/HomeLinkLogo";

import styles from "./Footer.module.css";

interface FooterLink {
  label: string;
  href: string;
  newTab?: boolean;
}

interface FooterGroup {
  title: string;
  links: FooterLink[];
}

function validCommunityUrl(
  value: string | undefined,
): string | null {
  const candidate =
    value?.trim();

  if (!candidate) {
    return null;
  }

  try {
    const url =
      new URL(candidate);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function footerGroups(
  communityUrl: string | null,
): FooterGroup[] {
  const supportLinks:
    FooterLink[] = [
    {
      label: "Safety centre",
      href: "/safety",
    },
    {
      label: "Rental safety",
      href:
        "/safety/rentals",
    },
    {
      label: "Help & support",
      href: "/support",
    },
    {
      label: "Email HomeLink",
      href:
        "mailto:homelink814@gmail.com",
    },
  ];

  if (communityUrl) {
    supportLinks.push({
      label:
        "WhatsApp community",
      href: communityUrl,
      newTab: true,
    });
  }

  return [
    {
      title: "Explore",
      links: [
        {
          label: "Rentals",
          href: "/rentals",
        },
        {
          label: "Buy property",
          href:
            "/buy-property",
        },
        {
          label: "Marketplace",
          href:
            "/marketplace",
        },
        {
          label:
            "Approved agents",
          href: "/agents",
        },
        {
      label:
        "Advertise your business",
      href: "/advertise",
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
          label:
            "Create account",
          href: "/register",
        },
        {
          label:
            "Post a listing",
          href:
            "/post-listing",
        },
        {
          label: "Dashboard",
          href: "/dashboard",
        },
      ],
    },
    {
      title: "Support",
      links: supportLinks,
    },
    {
      title: "Legal",
      links: [
        {
          label:
            "Privacy notice",
          href: "/privacy",
        },
        {
          label:
            "Terms of service",
          href: "/terms",
        },
        {
          label:
            "Cookie notice",
          href:
            "/cookie-policy",
        },
      ],
    },
  ];
}

export default function Footer() {
  const communityUrl =
    validCommunityUrl(
      process.env
        .NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL,
    );

  const groups =
    footerGroups(
      communityUrl,
    );

  return (
    <footer className={styles.footer}>
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
            {groups.map((group) => (
              <div
                key={group.title}
                className={styles.linkGroup}
              >
                <h3>
                  {group.title}
                </h3>

                <div>
                  {group.links.map((link) => {
                    const content = (
                      <>
                        <span>
                          {link.label}
                        </span>

                        <ArrowUpRight
                          aria-hidden="true"
                        />
                      </>
                    );

                    if (
                      link.newTab ||
                      link.href.startsWith(
                        "mailto:",
                      )
                    ) {
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          target={
                            link.newTab
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            link.newTab
                              ? "noopener noreferrer"
                              : undefined
                          }
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

            <a
              href="mailto:homelink814@gmail.com"
              className={styles.supportLink}
            >
              <Mail aria-hidden="true" />
              Email
            </a>

            {communityUrl ? (
              <a
                href={communityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.supportLink}
              >
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}