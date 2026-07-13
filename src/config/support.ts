/**
 * Developer support / donation configuration.
 *
 * `DONATION_URL` drives the "개발자 응원하기" card in Settings:
 *   - empty string  → card shows a quiet "준비 중" (coming soon) state
 *   - a valid URL   → button opens it in the system browser
 *
 * App Store note: Apple requires tips/donations to the app's developer to go
 * through In-App Purchase (a consumable "tip jar"). An external web link is
 * fine for Android/web and is acceptable while the iOS build is not yet live,
 * but before shipping to the App Store switch this over to IAP to avoid a
 * 3.1.1 rejection. When that happens, keep `DONATION_URL` empty on iOS and
 * gate the IAP flow behind `SUPPORT_ENABLED`.
 */
export const DONATION_URL = "";

/** Master switch so the card can be hidden entirely if desired. */
export const SUPPORT_ENABLED = true;

export const isDonationConfigured = (): boolean => DONATION_URL.trim().length > 0;
