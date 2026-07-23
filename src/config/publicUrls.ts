/**
 * Public web URLs for Quote (product) and Tealdot (company).
 *
 * Single source of truth — update store consoles (ASC / Play) and Supabase
 * Auth Site URL when these change. Static HTML twin: docs/js/site-urls.js
 */

/** Company / brand site (blog, about — may be separate hosting later). */
export const COMPANY_ORIGIN = "https://tealdot.dev";

/** Quote product landing, privacy, support (GitHub Pages → quote.tealdot.dev). */
export const QUOTE_ORIGIN = "https://quote.tealdot.dev";

export const QUOTE_LANDING_URL = `${QUOTE_ORIGIN}/`;

export const QUOTE_PRIVACY_URL = `${QUOTE_ORIGIN}/privacy.html`;

export const QUOTE_SUPPORT_URL = `${QUOTE_ORIGIN}/#contact`;

/** Planned custom SMTP sender (Supabase → Authentication → SMTP). */
export const AUTH_EMAIL_FROM = "noreply@tealdot.dev";

/** Legacy GitHub Pages (redirect / update store metadata if still listed). */
export const LEGACY_QUOTE_GITHUB_PAGES = "https://gomyong.github.io/QuoteApp";
