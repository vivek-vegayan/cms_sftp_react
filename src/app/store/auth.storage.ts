import type { StoredUser } from "../../features/auth/types/auth.types";
import { postLoginRedirect } from "./postLoginRedirect";


export const USER_KEY = "auth_user";
export const TOKEN_KEY = "access_token";

// Shared across all tabs/windows of the origin (unlike sessionStorage),
// so a new tab, a pasted/typed URL, or a bookmark can rehydrate the
// session immediately instead of racing another tab to hand it over.
// The token itself is still re-validated against the backend on every
// bootstrap (see AuthHydrator), so a cleared/expired copy here can't be
// used to skip that check.
export const authStorage = {
  setUser(user: StoredUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  clear() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // Tearing down a session also drops wherever that session was headed.
    // Hooking it here rather than at each of the logout call sites (header
    // menu, AccessDenied, the global 401 handler, a failed token validation)
    // is what guarantees the next user to sign in on this machine lands on
    // their own default route instead of the previous user's last page.
    postLoginRedirect.clear();
  },
};
