import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "../../app/hooks";

type LoadingLevel = "global" | "page";

interface LoadingRegistryState {
  global: Set<string>;
  page: Set<string>;
}

interface LoadingContextValue {
  registry: React.MutableRefObject<LoadingRegistryState>;
  notify: () => void;
  version: number;
  bootGateActive: boolean;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

// After auth hydration clears, a route with no `usePageLoading` gate of its
// own gets this long to register one before the splash assumes there's
// nothing to wait for.
const BOOT_GRACE_MS = 150;
// Hard cap from the moment auth clears, regardless of what the page registry
// is doing - a slow/broken initial-load API can never hang the splash forever.
const BOOT_MAX_MS = 6000;

/**
 * Root of the app's loading-priority system. The registry itself lives in a
 * ref (register/unregister never needs to walk React state), but the context
 * `value` object's identity must change on every registry mutation — that's
 * what tells React to re-render consumers of `useLoadingVisibility` even
 * though the `children` element reference passed in from main.tsx never
 * changes (which would otherwise let React bail out of the subtree).
 */
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registry = useRef<LoadingRegistryState>({ global: new Set(), page: new Set() });
  const [version, setVersion] = useState(0);
  const notify = useCallback(() => setVersion((v) => v + 1), []);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  // Boot gate: on a fresh boot, "auth-hydration" clearing from the global
  // registry (see AuthHydrator) isn't a reliable signal that the app is
  // actually ready to reveal - the landing route's own initial data load
  // (registered via usePageLoading) usually hasn't settled yet. This keeps
  // the splash up through that first load too, exactly once per app
  // lifetime, so later events (cross-tab re-validation, bfcache restore)
  // never re-trigger it.
  const [bootGateActive, setBootGateActive] = useState(true);
  const bootRef = useRef<{ done: boolean; authClearedAt: number | null }>({
    done: false,
    authClearedAt: null,
  });

  useEffect(() => {
    if (bootRef.current.done) return;
    if (registry.current.global.has("auth-hydration")) return; // still authenticating

    const now = Date.now();
    if (bootRef.current.authClearedAt === null) bootRef.current.authClearedAt = now;
    const elapsed = now - bootRef.current.authClearedAt;

    const finish = () => {
      if (bootRef.current.done) return;
      bootRef.current.done = true;
      setBootGateActive(false);
    };

    if (!isAuthenticated) {
      // Nothing to wait for - the login page has no initial-load gate.
      finish();
      return;
    }

    if (registry.current.page.size === 0) {
      if (elapsed >= BOOT_GRACE_MS) {
        finish();
        return;
      }
      const t = setTimeout(() => {
        // Re-check at fire time: a page loader may have registered since.
        if (registry.current.page.size === 0) finish();
      }, BOOT_GRACE_MS - elapsed);
      return () => clearTimeout(t);
    }

    // A page loader is active - wait for it to drain, bounded by the hard cap.
    if (elapsed >= BOOT_MAX_MS) {
      finish();
      return;
    }
    const t = setTimeout(finish, BOOT_MAX_MS - elapsed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, isAuthenticated]);

  const value = useMemo(
    () => ({ registry, notify, version, bootGateActive }),
    [notify, version, bootGateActive],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

function useLoadingContext(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("Loading hooks must be used within <LoadingProvider>");
  }
  return ctx;
}

/** Registers/unregisters `key` as an active loader at `level` while `active` is true. */
function useRegisterLoading(level: LoadingLevel, key: string, active: boolean) {
  const { registry, notify } = useLoadingContext();

  useEffect(() => {
    const set = registry.current[level];
    if (active) {
      if (!set.has(key)) {
        set.add(key);
        notify();
      }
    } else if (set.has(key)) {
      set.delete(key);
      notify();
    }

    return () => {
      if (set.has(key)) {
        set.delete(key);
        notify();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, key, active]);
}

/** App bootstrap / auth hydration only — highest priority, suppresses everything else. */
export function useGlobalLoading(active: boolean, key: string) {
  useRegisterLoading("global", key, active);
}

/** A page/route's *initial* data load only — never pass `isFetching` here, only `isLoading && !data`. */
export function usePageLoading(active: boolean, key: string) {
  useRegisterLoading("page", key, active);
}

/** Read-only visibility snapshot for loader components to self-suppress by priority. */
export function useLoadingVisibility(): { globalActive: boolean; pageActive: boolean } {
  // Subscribing via useContext (inside useLoadingContext) re-renders this
  // hook's caller whenever the provider's `value` identity changes (i.e. on
  // every notify() bump), even though the ref itself never changes identity.
  const { registry, bootGateActive } = useLoadingContext();
  const globalActive = registry.current.global.size > 0 || bootGateActive;
  const pageActive = !globalActive && registry.current.page.size > 0;
  return { globalActive, pageActive };
}
