import { useEffect, useId, useState } from "react";
import { Box, Fade, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLoadingVisibility, usePageLoading } from "./LoadingProvider";
import { useTabColorTokens } from "../../style/theme";

interface ContentLoaderProps {
  /** Caption under the ring. Keep it short — it sits inside a 240px card. */
  label?: string;
  /** Escape hatch: pin the loader to a fixed height instead of filling its
   *  parent. Prefer the default (fill) — a fixed height is what produced the
   *  old half-height box. */
  height?: number | string;
  /** Floor for the filled height, so the loader still centres nicely inside a
   *  parent that hasn't been given a height of its own. */
  minHeight?: number | string;
  /** Hold the visual back this long, so loads that finish sub-perceptually (a
   *  warm route chunk, a cached query) never flash a spinner. The container
   *  still occupies its full space during the delay — nothing shifts when the
   *  card fades in. */
  delayMs?: number;
}

const RING_SIZE = 46;
const RING_STROKE = 3;

/** Trims the 3px ring shape out of a filled circle (used for the arc + track). */
const RING_MASK = `radial-gradient(farthest-side, transparent calc(100% - ${RING_STROKE}px), #000 calc(100% - ${RING_STROKE}px))`;

/** True once `delayMs` has elapsed since mount. */
function useDelayedReveal(delayMs: number): boolean {
  const [revealed, setRevealed] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setRevealed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return revealed;
}

/**
 * The loader card itself: a rotating brand-coloured arc, a caption and an
 * indeterminate bar, on the same surface/border/shadow language as every
 * other card in the app (so it reads as a deliberate panel rather than a
 * stray spinner on a tinted void). Animations are pure CSS and collapse to a
 * static state under `prefers-reduced-motion`.
 */
function LoaderCard({ label }: { label: string }) {
  const theme = useTheme();
  const tk = useTabColorTokens(theme);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        minWidth: 240,
        px: 4.5,
        py: 4,
        borderRadius: "20px",
        bgcolor: tk.surface,
        border: `1px solid ${tk.border}`,
        boxShadow: tk.shadowCard,
      }}
    >
      {/* ── Ring ── */}
      <Box sx={{ position: "relative", width: RING_SIZE, height: RING_SIZE }}>
        {/* Track */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            bgcolor: alpha(tk.accent, tk.isDark ? 0.18 : 0.12),
            WebkitMask: RING_MASK,
            mask: RING_MASK,
          }}
        />
        {/* Sweeping arc */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${alpha(tk.accent, 0)} 0deg, ${alpha(
              tk.accent,
              0.15,
            )} 110deg, ${tk.accent} 320deg, ${tk.accent} 360deg)`,
            WebkitMask: RING_MASK,
            mask: RING_MASK,
            animation: "chm-loader-spin 0.9s linear infinite",
            "@keyframes chm-loader-spin": { to: { transform: "rotate(360deg)" } },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
        {/* Core */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 8,
            height: 8,
            mt: "-4px",
            ml: "-4px",
            borderRadius: "50%",
            bgcolor: tk.accent,
            animation: "chm-loader-pulse 1.5s ease-in-out infinite",
            "@keyframes chm-loader-pulse": {
              "0%, 100%": { transform: "scale(1)", opacity: 0.85 },
              "50%": { transform: "scale(0.6)", opacity: 0.35 },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      </Box>

      {/* ── Caption ── */}
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: "0.03em",
          color: tk.textSecondary,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>

      {/* ── Indeterminate bar ── */}
      <Box
        aria-hidden
        sx={{
          position: "relative",
          width: 132,
          height: 3,
          borderRadius: tk.radiusPill,
          bgcolor: alpha(tk.accent, tk.isDark ? 0.16 : 0.1),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            width: "45%",
            borderRadius: tk.radiusPill,
            background: `linear-gradient(90deg, ${alpha(tk.accent, 0)}, ${tk.accent}, ${alpha(
              tk.accent,
              0,
            )})`,
            animation: "chm-loader-slide 1.25s ease-in-out infinite",
            "@keyframes chm-loader-slide": {
              "0%": { transform: "translateX(-110%)" },
              "100%": { transform: "translateX(325%)" },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
              width: "100%",
              opacity: 0.5,
            },
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Loading *region*: fills whatever slot it's dropped into and centres the
 * loader card in it. Exported for anything that needs the visual without the
 * loader-registry gating that <PageLoader> applies.
 */
export function ContentLoader({
  label = "Loading…",
  height,
  minHeight = 260,
  delayMs = 140,
  muted = false,
}: ContentLoaderProps & {
  /** Keep the region (so nothing reflows) but draw nothing in it. */
  muted?: boolean;
}) {
  const revealed = useDelayedReveal(delayMs);

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={muted ? undefined : label}
      sx={{
        // Fill by default: as a flex child it stretches, and the minHeight
        // floor covers parents that aren't flex containers.
        flex: height ? "0 0 auto" : "1 1 auto",
        alignSelf: "stretch",
        width: "100%",
        height,
        minHeight: height ?? minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      {!muted && revealed && (
        <Fade in timeout={220}>
          <Box>
            <LoaderCard label={label} />
          </Box>
        </Fade>
      )}
    </Box>
  );
}

/**
 * Route/page-level loader: shown only for a page's *initial* data load
 * (registered via usePageLoading), inside the content area — header/sidebar
 * chrome stays visible, unlike GlobalLoader. Renders nothing while a Global
 * Loader is active (Global always wins) or while no page loader is registered.
 */
const PageLoader = ({ label, height, minHeight, delayMs }: ContentLoaderProps) => {
  const { globalActive, pageActive } = useLoadingVisibility();
  if (globalActive || !pageActive) return null;

  return (
    <ContentLoader label={label} height={height} minHeight={minHeight} delayMs={delayMs} />
  );
};

export default PageLoader;

/**
 * `<Suspense>` fallback for lazily-loaded routes. Distinct from <PageLoader>
 * in two ways that matter:
 *
 *  - it renders unconditionally (a chunk in flight has nothing in the loading
 *    registry to gate on, which is why the old shared fallback rendered
 *    *nothing* and left an empty shell behind);
 *  - while mounted it *holds* a page-registry entry, so the boot gate keeps
 *    the splash up across the first chunk fetch and hands straight over to
 *    the page's own initial-load gate — no empty-shell flash in between.
 */
export function RouteFallback({
  label = "Loading page…",
  minHeight,
  delayMs,
}: Omit<ContentLoaderProps, "height">) {
  // useId keeps concurrently-mounted fallbacks (outer route + a shell's own
  // nested Suspense) from sharing one registry key and de-registering each
  // other on unmount.
  const instanceId = useId();
  usePageLoading(true, `route-chunk${instanceId}`);
  const { globalActive } = useLoadingVisibility();

  return (
    <ContentLoader label={label} minHeight={minHeight} delayMs={delayMs} muted={globalActive} />
  );
}
