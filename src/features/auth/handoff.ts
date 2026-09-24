import { authStorage } from "../../app/store/auth.storage";

/**
 * CHM (airtelcms_react) opens this app as `<url>#token=<jwt>` so a user who
 * is already signed in there doesn't have to sign in again. The fragment
 * never reaches a server or a Referer header; it is stored once here (before
 * AuthHydrator validates it against /users/v2/getloggeduserdetails, exactly as
 * it validates any stored token) and stripped from the address bar.
 *
 * Opened any other way, the app simply shows its own login page.
 */
export function consumeHandoffToken() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const token = new URLSearchParams(hash).get("token");
  if (!token) return;

  if (token !== authStorage.getToken()) {
    // A different session than whatever this browser had cached: drop the
    // stale cached profile so it isn't painted before validation.
    authStorage.clear();
  }
  authStorage.setToken(token);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

/** The main CHM app, for the header's "Back to CHM" link. */
export const mainAppHomeUrl =
  (import.meta.env.VITE_MAIN_APP_URL as string | undefined) ?? "/airtelcms/";
