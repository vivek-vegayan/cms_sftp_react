const REDIRECT_KEY = "auth_post_login_redirect";

// App.tsx hands BrowserRouter this same value as its `basename`, so
// window.location.pathname carries it as a prefix while router paths don't.
const BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, "");

/**
 * The router-relative path the browser is currently showing (path + query +
 * hash, basename stripped) — i.e. the same shape a `<Navigate to>` takes.
 */
export const currentInAppPath = (): string => {
  const { pathname, search, hash } = window.location;
  const stripped =
    BASENAME && pathname.startsWith(BASENAME)
      ? pathname.slice(BASENAME.length)
      : pathname;
  return (stripped || "/") + search + hash;
};

/**
 * Where to send a visitor once they authenticate.
 *
 * Deliberately tab-scoped (sessionStorage, unlike authStorage's localStorage):
 * it describes *this* tab's interrupted navigation, so it can never bleed into
 * another tab. It is written in exactly one place — AuthHydrator, on a cold
 * start that found no session at all — which means it can only ever hold a URL
 * the visitor typed or bookmarked themselves. Every session teardown clears it
 * via authStorage.clear(), so a signed-out user's last route can never be
 * handed to whoever logs in next on a shared machine.
 */
export const postLoginRedirect = {
  set(path: string) {
    sessionStorage.setItem(REDIRECT_KEY, path);
  },

  /** Reads and removes in one step — an intent is good for exactly one login. */
  consume(): string | null {
    const path = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return path;
  },

  clear() {
    sessionStorage.removeItem(REDIRECT_KEY);
  },
};
