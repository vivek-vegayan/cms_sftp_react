import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import {
  ExitToApp,
  KeyboardCapslockOutlined,
  LockOutlined,
  Login as LoginIcon,
  PersonOutline,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import CaptchaField from "./CaptchaField";
import InlineAlert from "./InlineAlert";
import type { CaptchaState } from "../hooks/useCaptcha";

interface LoginFormProps {
  olmId: string;
  password: string;
  onOlmIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  captcha: CaptchaState;
  isAlreadyLogged: boolean;
  onForceLogout: () => void;
  lockoutSecondsRemaining: number;
  shakeKey: number;
}

const fieldLabelSx = {
  display: "block",
  fontSize: "12.5px",
  color: "var(--lp-label)",
  letterSpacing: "0.02em",
  fontWeight: 500,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const LoginForm: React.FC<LoginFormProps> = ({
  olmId,
  password,
  onOlmIdChange,
  onPasswordChange,
  onSubmit,
  loading,
  error,
  captcha,
  isAlreadyLogged,
  onForceLogout,
  lockoutSecondsRemaining,
  shakeKey,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const isLocked = lockoutSecondsRemaining > 0;

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isLocked) onSubmit();
      }}
    >
      <Box
        key={shakeKey}
        sx={{ animation: shakeKey ? "lp-shake 0.4s ease" : "none" }}
      >
        <Box sx={{ mb: 1.8 }}>
          <Typography component="label" htmlFor="lp-olmid" sx={{ ...fieldLabelSx, mb: 1, ml: 0.5 }}>
            OLM ID
          </Typography>
          <TextField
            id="lp-olmid"
            className="lp-field"
            fullWidth
            size="small"
            value={olmId}
            onChange={(e) => onOlmIdChange(e.target.value)}
            placeholder="Enter your OLM ID"
            autoComplete="username"
            disabled={isLocked}
            inputProps={{ maxLength: 50 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutline sx={{ fontSize: 17 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mb: capsLockOn ? 0.6 : 2.2 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1, mx: 0.5 }}>
            <Typography component="label" htmlFor="lp-password" sx={fieldLabelSx}>
              Password
            </Typography>
            <Typography
              component="a"
              href="#"
              sx={{
                fontSize: "11.5px",
                color: "var(--lp-link)",
                textDecoration: "none",
                fontWeight: 500,
                fontFamily: "'IBM Plex Sans', sans-serif",
                "&:hover": { color: "var(--lp-link-hover)" },
              }}
            >
              Forgot?
            </Typography>
          </Box>
          <TextField
            id="lp-password"
            className="lp-field"
            type={showPassword ? "text" : "password"}
            fullWidth
            size="small"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={handlePasswordKeyEvent}
            onKeyUp={handlePasswordKeyEvent}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLocked}
            inputProps={{ maxLength: 128 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ fontSize: 17 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: "var(--lp-icon-idle)", p: 0.5 }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <VisibilityOff sx={{ fontSize: 16 }} />
                    ) : (
                      <Visibility sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {capsLockOn && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 1.6,
              ml: 0.5,
            }}
          >
            <KeyboardCapslockOutlined sx={{ fontSize: 12, color: "var(--lp-warning-fg)" }} />
            <Typography
              sx={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: "10.5px",
                color: "var(--lp-warning-fg)",
              }}
            >
              Caps Lock is on
            </Typography>
          </Box>
        )}
      </Box>

      <CaptchaField captcha={captcha} />

      {isLocked ? (
        <InlineAlert tone="warning">
          Too many failed attempts. Try again in {lockoutSecondsRemaining}s.
        </InlineAlert>
      ) : (
        error && <InlineAlert tone="error">{error}</InlineAlert>
      )}

      {!isAlreadyLogged ? (
        <Button
          type="submit"
          fullWidth
          disabled={loading || isLocked}
          className="lp-submit"
          startIcon={
            loading ? (
              <CircularProgress size={13} sx={{ color: "#fff" }} />
            ) : (
              <LoginIcon sx={{ fontSize: "16px !important" }} />
            )
          }
          sx={{
            height: 48,
            borderRadius: "999px",
            background: "linear-gradient(100deg,#1e5bd6,#2563eb 55%,#4f8dff)",
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow: "0 14px 30px -10px rgba(37,99,235,0.65), inset 0 1px 0 rgba(255,255,255,0.22)",
            transition: "transform 0.15s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 20px 40px -12px rgba(37,99,235,0.8), inset 0 1px 0 rgba(255,255,255,0.28)",
              background: "linear-gradient(100deg,#1e5bd6,#2563eb 55%,#4f8dff)",
            },
            "&.Mui-disabled": { opacity: 0.55, color: "#fff" },
          }}
        >
          {loading ? "Authenticating…" : isLocked ? `Locked · ${lockoutSecondsRemaining}s` : "Sign In"}
        </Button>
      ) : (
        <>
          <InlineAlert tone="warning">
            This account is active on another device. Force logout to continue here.
          </InlineAlert>
          <Button
            fullWidth
            className="lp-force"
            onClick={onForceLogout}
            startIcon={<ExitToApp sx={{ fontSize: "16px !important" }} />}
            sx={{
              height: 48,
              borderRadius: "999px",
              background: "linear-gradient(100deg,#C0392B,#96281B 55%,#e74c3c)",
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "13.5px",
              fontWeight: 600,
              textTransform: "none",
              letterSpacing: "0.02em",
              boxShadow: "0 14px 30px -10px rgba(192,57,43,0.5)",
              transition: "transform 0.15s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                background: "linear-gradient(100deg,#C0392B,#96281B 55%,#e74c3c)",
              },
            }}
          >
            Force Logout Previous Session
          </Button>
        </>
      )}
    </Box>
  );
};

export default LoginForm;
