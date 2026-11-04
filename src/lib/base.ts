/** Site root with no trailing slash: "" on Lovable, "/sahmati" on GitHub Pages. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Absolute URL for an app path, e.g. appUrl("/c/abc") -> https://host/sahmati/c/abc. */
export const appUrl = (path: string) => `${window.location.origin}${BASE}${path}`;
