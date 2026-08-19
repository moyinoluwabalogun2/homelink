import Image from "next/image";
import Link from "next/link";

import styles from "./HomeLinkLogo.module.css";


type LogoSize =
  | "small"
  | "medium"
  | "large";


interface HomeLinkLogoProps {
  href?: string | null;
  subtitle?: string;
  showText?: boolean;
  size?: LogoSize;
  priority?: boolean;
  className?: string;
}


export default function HomeLinkLogo({
  href = "/",
  size = "medium",
  priority = false,
  className = "",
}: HomeLinkLogoProps) {
  const rootClassName = [
    styles.logo,
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <Image
      src="/brand/homelink-logo.png"
      alt="HomeLink"
      width={420}
      height={150}
      priority={priority}
      className={styles.image}
    />
  );

  if (!href) {
    return (
      <span className={rootClassName}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={rootClassName}
      aria-label="HomeLink home"
    >
      {content}
    </Link>
  );
}