import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../app/hooks";
import { authStorage, TOKEN_KEY } from "../../../app/store/auth.storage";
import {
  currentInAppPath,
  postLoginRedirect,
} from "../../../app/store/postLoginRedirect";
import { useLazyGetLoggedUserQuery } from "../api/auth.api";
import {
  normalizeRBAC,
  normalizeModuleHierarchy,
} from "../utils/rbacNormalizer";
import { finishHydration, logout, setToken, setUser } from "../slices/auth.slice";
import type { AuthUser } from "../types/auth.types";
import { useGlobalLoading } from "../../../components/loading/LoadingProvider";

const AuthHydrator = () => {
  const dispatch = useAppDispatch();
  const [fetchUser] = useLazyGetLoggedUserQuery();
  // Drives the app's Global Loader for the real bootstrap window (token
  // validation on first paint / refresh) instead of the old blanket
  // "any RTK Query request in flight" counter — this is the only place a
  // full-screen loader should ever appear outside of an explicit page load.
  const [hydrating, setHydrating] = useState(true);
  useGlobalLoading(hydrating, "auth-hydration");

  useEffect(() => {
    const validateAndHydrate = async (token: string) => {
      dispatch(setToken(token));

      // Paint the last-known user immediately so the UI doesn't blank out
      // while the validation call below is in flight; it gets overwritten
      // with the server's response (or discarded on failure) either way.
      const cachedUser = authStorage.getUser();
      if (cachedUser) {
        dispatch(setUser({ ...cachedUser, authenticated: true }));
      }

      try {
        const userRes = await fetchUser().unwrap();

        const user: AuthUser = {
          olmId: userRes.olmId,
          employeeName: userRes.employeeName,
          roleCode: userRes.roleCode,
          userId: userRes.userId,
          modules: normalizeRBAC(userRes),
          moduleHierarchy: normalizeModuleHierarchy(userRes),
          authenticated: true,
        };

        dispatch(setUser(user));
        authStorage.setToken(token);
        authStorage.setUser({
          olmId: user.olmId,
          employeeName: user.employeeName,
          roleCode: user.roleCode,
          userId: user.userId,
          modules: user.modules,
          moduleHierarchy: user.moduleHierarchy,
        });
      } catch {
        // Backend rejected the token (expired / invalid / revoked) — only
        // now is it correct to treat the user as logged out.
        authStorage.clear();
        dispatch(logout());
      } finally {
        dispatch(finishHydration());
        setHydrating(false);
      }
    };

    const token = authStorage.getToken();
    if (token) {
      void validateAndHydrate(token);
    } else {
      // Cold start with no session at all: whatever URL is in the address bar
      // was typed or bookmarked by the person about to sign in, so it's theirs
      // to return to. This is the ONLY place a post-login redirect is ever
      // recorded — in particular PrivateRoute no longer smuggles the outgoing
      // route out through history state, which is how a logged-out user's last
      // page used to end up being handed to the next person who signed in.
      const requested = currentInAppPath();
      if (requested !== "/" && !requested.startsWith("/login")) {
        postLoginRedirect.set(requested);
      }
      dispatch(logout());
      dispatch(finishHydration());
      setHydrating(false);
    }

    // Cross-tab sync: this fires in every OTHER tab whenever localStorage
    // changes here (never in the tab that made the write), so there's no
    // race to lose — a brand-new tab reads localStorage synchronously on
    // its very first render via authStorage.getToken() above.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;

      if (!event.newValue) {
        // Another tab signed out. Its localStorage removals are what woke us,
        // so the shared keys are already gone; this call is here for the
        // tab-scoped pending redirect, which that tab could not reach.
        authStorage.clear();
        dispatch(logout());
        return;
      }

      if (event.newValue !== event.oldValue) {
        void validateAndHydrate(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    // Defense against bfcache: if the browser restores this page from an
    // in-memory snapshot (event.persisted) instead of re-running main.tsx —
    // e.g. pressing Back right after logout — re-validate against the
    // backend instead of trusting whatever was painted before the snapshot,
    // so a revoked/expired token can't leave a stale authenticated UI up.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const currentToken = authStorage.getToken();
      if (currentToken) {
        void validateAndHydrate(currentToken);
      } else {
        dispatch(logout());
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [dispatch, fetchUser]);

  return null;
};

export default AuthHydrator;
