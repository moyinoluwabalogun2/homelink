const DEFAULT_SITE_URL =
  "https://homelinkk.netlify.app";


function normalizeSiteUrl(
  value: string | undefined,
): string {
  const candidate =
    value?.trim() ||
    DEFAULT_SITE_URL;

  try {
    const url =
      new URL(candidate);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return DEFAULT_SITE_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}


export const SITE_URL =
  normalizeSiteUrl(
    process.env
      .NEXT_PUBLIC_SITE_URL,
  );


export const SITE_NAME =
  "HomeLink";


export const SITE_DESCRIPTION =
  "Find rentals, property, trusted agents and student marketplace listings around OOU.";