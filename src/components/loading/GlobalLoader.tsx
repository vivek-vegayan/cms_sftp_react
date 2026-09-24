import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLoadingVisibility } from "./LoadingProvider";
import AirtelLogo from "../../assets/svg/AiretLogoSvg.svg";

const MESSAGES = [
  "Initializing workspace…",
  "Loading modules…",
  "Fetching latest data…",
  "Almost ready…",
];

const PARTICLES = [
  { size: 260, top: "-10%", left: "6%", color: "#2563eb", duration: 10 },
  { size: 220, top: "58%", left: "76%", color: "#ED1C24", duration: 12 },
  { size: 180, top: "72%", left: "4%", color: "#7c3aed", duration: 9 },
];

// Rendered outside App.tsx's ThemeProvider/ColorModeContext (see main.tsx),
// so it deliberately doesn't read MUI theme - self-contained dark glass
// styling (same approach LoginPage uses) that looks right regardless of the
// app's light/dark mode underneath it.
const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  background:
    "radial-gradient(120% 120% at 50% 0%, rgba(16,28,68,0.94) 0%, rgba(6,10,28,0.97) 55%, rgba(4,6,18,0.99) 100%)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

const panelStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: 288,
  padding: "40px 32px 30px",
  borderRadius: 24,
  textAlign: "center",
  background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const ringStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  background: "conic-gradient(from 0deg, #2563eb, #ED1C24, #7c3aed, #2563eb)",
  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
  mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
};

const coreStyle: CSSProperties = {
  position: "absolute",
  inset: 10,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(circle at 35% 30%, #ffffff, #c7d3ef 75%)",
  boxShadow: "0 0 26px rgba(37,99,235,0.55)",
};

const messageStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "rgba(230,236,255,0.85)",
};

const trackStyle: CSSProperties = {
  position: "relative",
  marginTop: 22,
  height: 4,
  borderRadius: 999,
  background: "rgba(255,255,255,0.1)",
  overflow: "hidden",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: "40%",
  borderRadius: 999,
  background: "linear-gradient(90deg, transparent, #2563eb, #ED1C24, transparent)",
};

/**
 * Full-screen overlay contents. Only ever mounted while `globalActive` (see
 * <GlobalLoader> below) - this scopes the message-rotation interval's
 * lifetime to exactly when it's visible instead of ticking in the
 * background for the app's whole lifetime.
 */
function GlobalLoaderOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1900);
    return () => clearInterval(id);
  }, []);

  // This overlay always mounts on the very first commit (AuthHydrator's
  // `hydrating` state starts `true`), which makes its mount the reliable
  // signal to hand off from index.html's static pre-JS splash - fades it
  // out instead of yanking it away, so there's no gap or flash between the
  // two loaders.
  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (!splash) return;
    splash.classList.add("bs-hidden");
    const timeout = setTimeout(() => splash.remove(), 400);
    return () => clearTimeout(timeout);
  }, []);

  // index.html locks body scroll from first paint (inline style) so there's
  // no scroll movement/scrollbar flicker while the splash covers an
  // assembling page. This keeps that lock alive for as long as this overlay
  // is actually mounted - AnimatePresence delays unmount until the exit fade
  // finishes, so scroll is restored the instant (not before) the splash is
  // visually gone.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      key="global-loader-backdrop"
      data-testid="loader"
      role="status"
      aria-live="polite"
      aria-label="Loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      style={backdropStyle}
    >
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p.color}55, transparent 70%)`,
            filter: "blur(46px)",
            pointerEvents: "none",
          }}
          animate={{ y: [0, -24, 0], x: [0, 16, 0], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.92, y: -6, filter: "blur(4px)" }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        style={panelStyle}
      >
        <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto" }}>
          <motion.div
            aria-hidden="true"
            style={ringStyle}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            style={coreStyle}
            animate={{ scale: [1, 0.92, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={AirtelLogo}
              alt=""
              style={{ width: "60%", height: "60%", objectFit: "contain" }}
            />
          </motion.div>
        </div>

        <div style={{ marginTop: 20, minHeight: 20 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={MESSAGES[messageIndex]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              style={messageStyle}
            >
              {MESSAGES[messageIndex]}
            </motion.span>
          </AnimatePresence>
        </div>

        <div style={trackStyle} aria-hidden="true">
          <motion.div
            style={fillStyle}
            animate={{ x: ["-100%", "220%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Highest-priority loader: app bootstrap / auth hydration only (see
 * useGlobalLoading call sites). Full-screen — while this is up, PageLoader
 * and component-level skeletons self-suppress via useLoadingVisibility.
 */
const GlobalLoader = () => {
  const { globalActive } = useLoadingVisibility();

  return <AnimatePresence>{globalActive && <GlobalLoaderOverlay />}</AnimatePresence>;
};

export default GlobalLoader;
