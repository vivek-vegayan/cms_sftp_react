import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { Box, IconButton, Typography } from "@mui/material";
import {
  ArrowForward,
  DarkModeOutlined,
  LightModeOutlined,
} from "@mui/icons-material";

import {
  useTerminateSessionMutation,
  useLazyGetLoggedUserQuery,
  useLoginMutation,
} from "../api/auth.api";
import { useAppDispatch } from "../../../app/hooks";
import { setToken, setUser } from "../slices/auth.slice";
import { authStorage } from "../../../app/store/auth.storage";
import { postLoginRedirect } from "../../../app/store/postLoginRedirect";
import {
  normalizeRBAC,
  normalizeModuleHierarchy,
} from "../utils/rbacNormalizer";
import type { AuthUser } from "../types/auth.types";
import { hasModuleIn, hasSubModuleIn } from "../../../rbac/permissionCore";
import { getFirstAccessiblePath, isPathAllowed } from "../../../rbac/routeAccess";
import { useCaptcha } from "../hooks/useCaptcha";
import AnimatedBackground from "../components/AnimatedBackground";
import ConnectionSecurityBadge from "../components/ConnectionSecurityBadge";
import LoginForm from "../components/LoginForm";
import AirtelLogo from "../../../assets/svg/AiretLogoSvg.svg";
import VegayanLogo from "../../../assets/images/logo_vega.png";

import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

const CAPTCHA_DISABLED = false;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

const GLOBAL_CSS = `
  #lp-root {
    --lp-body-bg: linear-gradient(135deg,#e6edf5 0%,#c4d3e3 100%);
    --lp-shell-glass: rgba(255,255,255,0.42);
    --lp-shell-border-glass: rgba(255,255,255,0.55);
    --lp-shell-border: rgba(20,55,110,0.10);
    --lp-hero-bg: linear-gradient(135deg,#f8fbff 0%,#eaf1fb 45%,#dce8f7 100%);
    --lp-grid: rgba(15,90,180,0.10);
    --lp-hero-heading: #0a1b3d;
    --lp-hero-heading-sub: #4a6187;
    --lp-hero-mono: #0e7ec0;
    --lp-text-strong: #0a1b3d;
    --lp-text-sub: #4a6187;
    --lp-text-mut: #7387ab;
    --lp-input-bg: #ffffff;
    --lp-input-bg-focus: #ffffff;
    --lp-input-text: #0f1836;
    --lp-input-shadow: 0 1px 2px rgba(20,40,90,0.06), inset 0 0 0 1px rgba(20,40,90,0.05);
    --lp-input-shadow-focus: 0 0 0 4px rgba(37,99,235,0.14), 0 4px 12px rgba(37,99,235,0.15), inset 0 0 0 1px rgba(37,99,235,0.55);
    --lp-icon-idle: #8494bd;
    --lp-icon-active: #2563eb;
    --lp-label: #5a6a92;
    --lp-placeholder: rgba(30,50,100,0.32);
    --lp-link: #2563eb;
    --lp-link-hover: #ED1C24;
    --lp-footer: #8390b5;
    --lp-toggle-bg: rgba(255,255,255,0.75);
    --lp-toggle-border: rgba(20,40,90,0.1);
    --lp-toggle-icon: #33436e;
    --lp-dev-bg: rgba(37,99,235,0.07);
    --lp-dev-border: rgba(37,99,235,0.28);
    --lp-dev-text: #2563eb;
    --lp-error-bg: rgba(226,75,74,0.06);
    --lp-error-border: rgba(226,75,74,0.2);
    --lp-error-fg: #C0392B;
    --lp-warning-bg: rgba(234,179,8,0.06);
    --lp-warning-border: rgba(234,179,8,0.22);
    --lp-warning-fg: #92400E;
    --lp-badge-ok-bg: rgba(37,99,235,0.06);
    --lp-badge-ok-border: rgba(37,99,235,0.14);
    --lp-badge-ok-fg: #185FA5;
    --lp-badge-warn-bg: rgba(234,179,8,0.08);
    --lp-badge-warn-border: rgba(234,179,8,0.25);
    --lp-badge-warn-fg: #B45309;
  }
  #lp-root[data-theme="dark"] {
    --lp-body-bg: linear-gradient(135deg,#04050e 0%,#0a0f24 100%);
    --lp-shell-glass: rgba(12,18,44,0.42);
    --lp-shell-border-glass: rgba(120,150,255,0.18);
    --lp-hero-bg: radial-gradient(130% 130% at 20% 10%, #101a44 0%, #080d24 45%, #04050e 100%);
    --lp-grid: rgba(120,150,255,0.09);
    --lp-hero-heading: #ffffff;
    --lp-hero-heading-sub: rgba(255,255,255,0.55);
    --lp-hero-mono: #a9d1ff;
    --lp-shell-border: rgba(255,255,255,0.06);
    --lp-text-strong: #f4f6ff;
    --lp-text-sub: #9fb0e0;
    --lp-text-mut: #6b7aa0;
    --lp-input-bg: rgba(255,255,255,0.04);
    --lp-input-bg-focus: rgba(255,255,255,0.06);
    --lp-input-text: #eef2ff;
    --lp-input-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    --lp-input-shadow-focus: 0 0 0 4px rgba(37,99,235,0.22), inset 0 0 0 1px rgba(96,150,255,0.7);
    --lp-icon-idle: #66739e;
    --lp-icon-active: #4f8dff;
    --lp-label: #8f9cc6;
    --lp-placeholder: rgba(200,210,240,0.3);
    --lp-link: #7db8ff;
    --lp-link-hover: #ffb0b4;
    --lp-footer: #5a6690;
    --lp-toggle-bg: rgba(255,255,255,0.06);
    --lp-toggle-border: rgba(255,255,255,0.12);
    --lp-toggle-icon: #cdd6f4;
    --lp-dev-bg: rgba(37,99,235,0.1);
    --lp-dev-border: rgba(120,160,255,0.35);
    --lp-dev-text: #9dc0ff;
    --lp-error-bg: rgba(248,113,113,0.1);
    --lp-error-border: rgba(248,113,113,0.28);
    --lp-error-fg: #FCA5A5;
    --lp-warning-bg: rgba(234,179,8,0.1);
    --lp-warning-border: rgba(234,179,8,0.28);
    --lp-warning-fg: #FBBF24;
    --lp-badge-ok-bg: rgba(96,165,250,0.1);
    --lp-badge-ok-border: rgba(96,165,250,0.25);
    --lp-badge-ok-fg: #93C5FD;
    --lp-badge-warn-bg: rgba(234,179,8,0.1);
    --lp-badge-warn-border: rgba(234,179,8,0.3);
    --lp-badge-warn-fg: #FBBF24;
  }

  @keyframes lp-blobDrift  { 0%,100% { transform: translate(0,0) scale(1); }   50% { transform: translate(60px,-40px) scale(1.15); } }
  @keyframes lp-blobDrift2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-50px,50px) scale(0.9); } }
  @keyframes lp-gridPan { to { background-position: 44px 44px; } }
  @keyframes lp-ringSpin { to { transform: rotate(360deg); } }
  @keyframes lp-coreFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.03); } }
  @keyframes lp-riseIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes lp-shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  @keyframes lp-splashRush {
    0%   { opacity:1; transform:scale(1); filter:blur(0px); }
    100% { opacity:0; transform:scale(1.15); filter:blur(6px); }
  }
  @keyframes lp-coreBurst {
    0%   { transform: scale(1); }
    45%  { transform: scale(0.86); }
    100% { transform: scale(1.6); }
  }
  @keyframes lp-dotPulse {
    0%,100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
    50%     { transform: scale(1.25); opacity: 0.85; box-shadow: 0 0 0 6px rgba(52,211,153,0); }
  }
  @keyframes lp-hintDown { 0%,100% { transform: translateY(0); opacity:.55; } 50% { transform: translateY(3px); opacity:1; } }

  #lp-root .lp-field .MuiOutlinedInput-root {
    background: var(--lp-input-bg); border-radius: 999px !important;
    color: var(--lp-input-text); font-size: 14.5px;
    font-family: 'IBM Plex Sans', sans-serif;
    box-shadow: var(--lp-input-shadow);
    transition: box-shadow .22s ease, background .22s ease;
  }
  #lp-root .lp-field .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline { border: none; }
  #lp-root .lp-field .MuiOutlinedInput-root.Mui-focused { background: var(--lp-input-bg-focus); box-shadow: var(--lp-input-shadow-focus); }
  #lp-root .lp-field .MuiOutlinedInput-input { padding-top: 14px; padding-bottom: 14px; }
  #lp-root .lp-field .MuiInputBase-input::placeholder { color: var(--lp-placeholder); opacity: 1; }
  #lp-root .lp-field .MuiSvgIcon-root { color: var(--lp-icon-idle) !important; transition: color .2s; }
  #lp-root .lp-field .MuiOutlinedInput-root.Mui-focused .MuiSvgIcon-root { color: var(--lp-icon-active) !important; }
  #lp-root .lp-field .MuiInputAdornment-root .MuiIconButton-root { color: var(--lp-icon-idle); }
  #lp-root input:-webkit-autofill { -webkit-text-fill-color: var(--lp-input-text); -webkit-box-shadow: 0 0 0 40px var(--lp-input-bg) inset; caret-color: var(--lp-input-text); }

  .lp-submit:hover, .lp-force:hover { filter: brightness(1.02); }

  html, body, #root { height: 100%; overflow: hidden; }
`;

function injectGlobalCss() {
  if (document.querySelector("[data-lp-css]")) return;
  const s = document.createElement("style");
  s.dataset.lpCss = "1";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

const VegaOrb: React.FC<{ size: number }> = ({ size }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: "50%",
      bgcolor: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(20,30,80,0.12), 0 0 0 1px rgba(20,30,80,0.06)",
      flexShrink: 0,
    }}
  >
    <img
      src={VegayanLogo}
      alt="Vegayan logo"
      style={{ width: "62%", height: "62%", objectFit: "contain" }}
    />
  </Box>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const [olmId, setOlmId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAlreadyLogged, setIsAlreadyLogged] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [splashStage, setSplashStage] = useState<
    "shown" | "opening" | "hidden"
  >("shown");

  const [, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const captcha = useCaptcha(!CAPTCHA_DISABLED);

  const [login, { isLoading }] = useLoginMutation();
  const [fetchUser] = useLazyGetLoggedUserQuery();
  const [terminateSession] = useTerminateSessionMutation();

  useEffect(() => {
    injectGlobalCss();
  }, []);

  useEffect(() => {
    if (!lockedUntil) {
      setLockoutRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((lockedUntil - Date.now()) / 1000),
      );
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const openLogin = () => {
    if (splashStage !== "shown") return;
    setSplashStage("opening");
    setTimeout(() => setSplashStage("hidden"), 1400);
  };

  const registerFailedAttempt = () => {
    setShakeKey((k) => k + 1);
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
      }
      return next;
    });
  };

  const handleOlmIdChange = (value: string) => {
    setOlmId(value);
    if (error) setError("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError("");
  };

  const handleLogin = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;

    const trimmedOlmId = olmId.trim();
    if (!trimmedOlmId || !password) {
      setError("OLM ID and password are required");
      setShakeKey((k) => k + 1);
      return;
    }

    if (!captcha.isValid()) {
      setError("Captcha does not match");
      captcha.refresh();
      registerFailedAttempt();
      return;
    }

    setBtnLoading(true);
    const response = await login({ olmId: trimmedOlmId, password });
    setBtnLoading(false);

    if ("error" in response) {
      const message = (response.error as any)?.data?.message || "Login failed";
      if (message.toLowerCase().includes("already")) {
        setIsAlreadyLogged(true);
        toast.info("User already logged in on another device");
        return;
      }
      setError(message);
      setPassword("");
      toast.error(message);
      registerFailedAttempt();
      return;
    }

    const res = response.data;
    if (!res?.accessToken) {
      toast.error("JWT missing");
      registerFailedAttempt();
      return;
    }

    setError("");
    setFailedAttempts(0);
    setLockedUntil(null);
    dispatch(setToken(res.accessToken));

    const userRes = await fetchUser().unwrap();
    if (!userRes) {
      toast.error("User data not received");
      return;
    }

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
    authStorage.setToken(res.accessToken);
    const storedUser = {
      olmId: user.olmId,
      employeeName: user.employeeName,
      roleCode: user.roleCode,
      userId: user.userId,
      modules: user.modules,
      moduleHierarchy: user.moduleHierarchy,
    };
    authStorage.setUser(storedUser);
    // Writing to localStorage above already notifies any other open tab
    // via the native `storage` event (see AuthHydrator), so no separate
    // broadcast is needed here.
    // Redux hasn't re-rendered with the new user yet, so the landing target
    // is computed directly from the just-fetched user object (via the same
    // pure predicates usePermission() uses) rather than the usePermission
    // hook, which would still read the pre-login (unauthenticated) state.
    const hasModuleFor = (moduleName: string) =>
      hasModuleIn(user.modules, user.roleCode, moduleName);
    const hasSubModuleFor = (moduleName: string, subModuleName: string) =>
      hasSubModuleIn(user.moduleHierarchy, user.roleCode, moduleName, subModuleName);

    const target = getFirstAccessiblePath(hasModuleFor, hasSubModuleFor) ?? "/";
    // A pending redirect only exists when this tab was opened straight onto a
    // deep link with no session at all (see AuthHydrator) — never after a
    // logout, which clears it — so it belongs to the person who just signed in.
    // It's still vetted against their permissions: the previous occupant of
    // this machine may have bookmarked a module this user can't open.
    const pending = postLoginRedirect.consume();
    const landing =
      pending && isPathAllowed(pending, hasModuleFor, hasSubModuleFor)
        ? pending
        : target;
    navigate(landing, { replace: true });
  };

  // The password typed for the login attempt that came back "Already Logged"
  // is still in state here, and the backend re-verifies it before ending
  // anything — terminating a session now requires proving you own the account.
  const handleForceLogout = async () => {
    if (!password) {
      setError("Enter your password to end the previous session");
      setShakeKey((k) => k + 1);
      return;
    }

    try {
      await terminateSession({ olmId: olmId.trim(), password }).unwrap();
      toast.success("Previous session terminated");
      setIsAlreadyLogged(false);
      setPassword("");
      setError("");
      captcha.refresh();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast.error(
        status === 401
          ? "Incorrect password — cannot end the previous session"
          : "Could not end the previous session",
      );
    }
  };

  const loading = isLoading || btnLoading;
  const dark = theme === "dark";

  return (
    <Box
      id="lp-root"
      data-theme={theme}
      sx={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "var(--lp-body-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 2.5vw, 40px)",
        transition: "background .4s ease",
      }}
    >
      {/* ── PERSISTENT HERO BACKGROUND ─────────────────────────────────── */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          background: "var(--lp-hero-bg)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.55,
            backgroundImage:
              "linear-gradient(var(--lp-grid) 1px,transparent 1px),linear-gradient(90deg, var(--lp-grid) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            animation: "lp-gridPan 12s linear infinite",
            maskImage:
              "radial-gradient(120% 120% at 55% 55%, #000 15%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(120% 120% at 55% 55%, #000 15%, transparent 78%)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: -140,
            left: -80,
            width: 520,
            height: 520,
            borderRadius: "50%",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at center, rgba(37,99,235,0.5), transparent 66%)",
            filter: "blur(34px)",
            animation: "lp-blobDrift 16s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -180,
            right: -60,
            width: 480,
            height: 480,
            borderRadius: "50%",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at center, rgba(237,28,36,0.35), transparent 66%)",
            filter: "blur(36px)",
            animation: "lp-blobDrift2 19s ease-in-out infinite",
          }}
        />

        <AnimatedBackground dark={dark} />

        {/* Central orbit visual */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: splashStage === "hidden" ? "22%" : "50%",
            transform: "translate(-50%,-50%)",
            width: "min(30%, 340px)",
            aspectRatio: "1/1",
            pointerEvents: "none",
            display: { xs: "none", sm: "block" },
            transition: "left .9s cubic-bezier(.4,.2,.2,1)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px dashed rgba(120,160,255,0.28)",
              animation: "lp-ringSpin 80s linear infinite",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -5,
                left: "50%",
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#4f8dff",
                boxShadow: "0 0 14px #4f8dff",
                transform: "translateX(-50%)",
              }}
            />
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: "10%",
              borderRadius: "50%",
              border: "1px dashed rgba(237,90,90,0.24)",
              animation: "lp-ringSpin 55s linear infinite reverse",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -4,
                left: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#ED1C24",
                boxShadow: "0 0 12px #ED1C24",
                transform: "translateX(-50%)",
              }}
            />
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: "22%",
              borderRadius: "50%",
              border: "1px solid rgba(120,160,255,0.2)",
              animation: "lp-ringSpin 40s linear infinite",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -3,
                left: "50%",
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#7db8ff",
                transform: "translateX(-50%)",
              }}
            />
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: "30%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(237,28,36,0.32) 0%, transparent 70%)",
              filter: "blur(14px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: "32%",
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.92)",
              boxShadow:
                "0 6px 24px rgba(20,30,80,0.28), 0 0 0 3px rgba(255,255,255,0.5), 0 0 40px rgba(237,28,36,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation:
                splashStage === "opening"
                  ? "lp-coreBurst .7s cubic-bezier(.4,0,.4,1.4) forwards"
                  : "lp-coreFloat 6s ease-in-out infinite",
            }}
          >
            <img
              src={AirtelLogo}
              alt="Airtel logo"
              style={{ width: "78%", height: "78%", objectFit: "contain" }}
            />
          </Box>
        </Box>
      </Box>

      {/* ── HERO SPLASH OVERLAY ──────────────────────────────────────────── */}
      {splashStage !== "hidden" && (
        <Box
          component="button"
          type="button"
          onClick={openLogin}
          aria-label="Enter sign-in"
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            overflow: "hidden",
            background: "transparent",
            textAlign: "left",
            animation:
              splashStage === "opening"
                ? "lp-splashRush .8s cubic-bezier(.4,0,.6,1) .5s forwards"
                : "none",
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: "100%",
              padding: "clamp(36px,4.5vw,64px) clamp(32px,5vw,80px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              color: "var(--lp-text-strong)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2.5,
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.75,
                  py: 0.75,
                  borderRadius: "999px",
                  background: "rgba(52,211,153,0.12)",
                  border: "1px solid rgba(52,211,153,0.3)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#34d399",
                    animation: "lp-dotPulse 2s ease-in-out infinite",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "10.5px",
                    letterSpacing: ".14em",
                    color: "#059669",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  ALL SYSTEMS OPERATIONAL
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  pl: 1.5,
                  pr: 1.75,
                  py: 1,
                  borderRadius: "999px",
                  border: "1px solid var(--lp-shell-border)",
                  background: "var(--lp-toggle-bg)",
                  backdropFilter: "blur(10px)",
                  color: "var(--lp-text-sub)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10.5px",
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  animation: "lp-hintDown 1.8s ease-in-out infinite",
                }}
              >
                <span>Tap to sign in</span>
                <ArrowForward sx={{ fontSize: 12 }} />
              </Box>
            </Box>

            <Box sx={{ textAlign: "left", position: "relative", zIndex: 2 }}>
              <Typography
                component="h2"
                sx={{
                  m: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(40px, 5.2vw, 78px)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.035em",
                  color: "var(--lp-hero-heading)",
                  textShadow: "0 4px 24px rgba(37,99,235,0.15)",
                }}
              >
                <span style={{ display: "block" }}>Change Management</span>
                <span
                  style={{
                    display: "block",
                    color: "var(--lp-hero-heading-sub)",
                    fontWeight: 500,
                    fontSize: "clamp(26px, 3.2vw, 44px)",
                    letterSpacing: "-0.02em",
                    marginTop: 6,
                  }}
                >
                  System
                </span>
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.75,
                  mt: 2.75,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 3,
                    borderRadius: "2px",
                    background: "linear-gradient(90deg,#2563eb,#ED1C24)",
                    boxShadow: "0 0 14px rgba(37,99,235,0.6)",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: ".24em",
                    color: "var(--lp-hero-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  by Vegayan
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── GLASS CARD ───────────────────────────────────────────────────── */}
      {splashStage === "hidden" && (
        <Box
          sx={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 520,
            height: "auto",
            maxHeight: 860,
            background: "var(--lp-shell-glass)",
            border: "1px solid var(--lp-shell-border-glass)",
            borderRadius: "32px",
            boxShadow:
              "0 40px 120px -30px rgba(20,30,80,0.4), 0 12px 32px -12px rgba(20,30,80,0.2), inset 0 1px 0 rgba(255,255,255,0.35)",
            overflow: "hidden",
            backdropFilter: "blur(22px) saturate(140%)",
            WebkitBackdropFilter: "blur(22px) saturate(140%)",
            animation: "lp-riseIn 0.7s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <IconButton
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            disableRipple
            sx={{
              position: "absolute",
              top: 18,
              right: 18,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              px: 1.4,
              py: 0.7,
              borderRadius: "999px",
              border: "1px solid var(--lp-toggle-border)",
              background: "var(--lp-toggle-bg)",
              backdropFilter: "blur(10px)",
              color: "var(--lp-toggle-icon)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all .25s ease",
              "&:hover": {
                borderColor: "var(--lp-link)",
                color: "var(--lp-text-strong)",
                background: "var(--lp-toggle-bg)",
              },
            }}
          >
            {dark ? (
              <LightModeOutlined sx={{ fontSize: 14 }} />
            ) : (
              <DarkModeOutlined sx={{ fontSize: 14 }} />
            )}
            <Typography
              component="span"
              sx={{
                fontFamily: "inherit",
                fontSize: "inherit",
                letterSpacing: "inherit",
              }}
            >
              {dark ? "Light" : "Dark"}
            </Typography>
          </IconButton>

          <Box
            sx={{
              position: "relative",
              padding: "36px clamp(28px, 5vw, 56px)",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Brand header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                // The theme toggle button floats absolutely over the card's
                // top-right corner (top: 18, right: 18) - nudge this row
                // down a touch so the security badge doesn't sit flush
                // under/behind it.
                mt: 1,
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.2,
                  pl: 0.7,
                  pr: 1.6,
                  py: 0.6,
                  borderRadius: "999px",
                  border: "1px solid var(--lp-shell-border-glass)",
                  background: "var(--lp-toggle-bg)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <VegaOrb size={28} />
                <Box>
                  <Typography
                    sx={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "var(--lp-text-strong)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.15,
                    }}
                  >
                    Airtel CHM
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: "9px",
                      color: "var(--lp-text-mut)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    by Vegayan System
                  </Typography>
                </Box>
              </Box>

              <ConnectionSecurityBadge />
            </Box>

            {/* Header */}
            <Box sx={{ mt: 3.5, textAlign: "center" }}>
              <Typography
                component="h1"
                sx={{
                  m: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(26px, 3.2vw, 34px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--lp-text-strong)",
                }}
              >
                Welcome back
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  fontSize: "13px",
                  color: "var(--lp-text-sub)",
                  lineHeight: 1.5,
                }}
              >
                Sign in to the Change Management Portal
              </Typography>
            </Box>

            {/* Form */}
            <Box sx={{ mt: 3 }}>
              <LoginForm
                olmId={olmId}
                password={password}
                onOlmIdChange={handleOlmIdChange}
                onPasswordChange={handlePasswordChange}
                onSubmit={handleLogin}
                loading={loading}
                error={error}
                captcha={captcha}
                isAlreadyLogged={isAlreadyLogged}
                onForceLogout={handleForceLogout}
                lockoutSecondsRemaining={lockoutRemaining}
                shakeKey={shakeKey}
              />
            </Box>

            {/* Footer */}
            <Box
              sx={{
                mt: 2.5,
                pt: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
              }}
            >
              <Typography
                component="a"
                href="#"
                sx={{
                  fontSize: "12px",
                  color: "var(--lp-link)",
                  textDecoration: "none",
                  fontWeight: 500,
                  "&:hover": { color: "var(--lp-link-hover)" },
                }}
              >
                Need help?
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10.5px",
                  letterSpacing: "0.06em",
                  color: "var(--lp-footer)",
                }}
              >
                © {new Date().getFullYear()} · Vegayan
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LoginPage;
