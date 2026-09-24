import React, { useEffect, useRef } from "react";
import { Box, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import { Refresh, ShieldOutlined } from "@mui/icons-material";
import type { CaptchaState } from "../hooks/useCaptcha";

// Size of the code image as laid out on the page. It sits inside a pill the
// same height as the text fields, so the two read as one row.
const CANVAS_W = 112;
const CANVAS_H = 30;

// Mid-tone blues: legible on both the light theme's white input background
// and the dark theme's navy one, so the canvas needs no theme awareness.
const GLYPH_COLORS = ["#2563eb", "#378ADD", "#4f8dff", "#1d6fd1"];

function renderCaptcha(canvas: HTMLCanvasElement | null, code: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Draw at device resolution so the glyphs stay crisp on high-DPI screens.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Light noise strokes - enough to defeat trivial OCR without hurting legibility.
  ctx.strokeStyle = "rgba(55,138,221,0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * CANVAS_H);
    ctx.bezierCurveTo(
      CANVAS_W / 3, Math.random() * CANVAS_H,
      (CANVAS_W * 2) / 3, Math.random() * CANVAS_H,
      CANVAS_W, Math.random() * CANVAS_H,
    );
    ctx.stroke();
  }

  const cw = CANVAS_W / code.length;
  code.split("").forEach((ch, i) => {
    ctx.save();
    ctx.translate(cw * i + cw / 2, CANVAS_H / 2 + 1);
    ctx.rotate((Math.random() - 0.5) * 0.35);
    ctx.font = `600 ${17 + Math.random() * 2}px 'IBM Plex Mono', 'Courier New', monospace`;
    ctx.fillStyle = GLYPH_COLORS[i % GLYPH_COLORS.length];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

// Same as LoginForm's field labels, so "Security Verification" lines up with
// "OLM ID" and "Password" above it.
const fieldLabelSx = {
  display: "block",
  fontSize: "12.5px",
  color: "var(--lp-label)",
  letterSpacing: "0.02em",
  fontWeight: 500,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

interface Props {
  captcha: CaptchaState;
}

const CaptchaField: React.FC<Props> = ({ captcha }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (captcha.enabled) renderCaptcha(canvasRef.current, captcha.code);
  }, [captcha.enabled, captcha.code]);

  if (!captcha.enabled) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "var(--lp-dev-bg)",
          border: "1px dashed var(--lp-dev-border)",
          borderRadius: "12px",
          px: 1.4,
          py: 0.85,
          mb: 2.2,
        }}
      >
        <ShieldOutlined sx={{ fontSize: 12, color: "var(--lp-dev-text)" }} />
        <Typography
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            color: "var(--lp-dev-text)",
            letterSpacing: "0.04em",
          }}
        >
          CAPTCHA bypassed — development mode
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2.2 }}>
      <Typography component="label" htmlFor="lp-captcha" sx={{ ...fieldLabelSx, mb: 1, ml: 0.5 }}>
        Security Verification
      </Typography>

      {/* stretch: the image pill takes the input's exact height. */}
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 1.25 }}>
        <TextField
          id="lp-captcha"
          className="lp-field"
          size="small"
          value={captcha.input}
          onChange={(e) => captcha.setInput(e.target.value.toUpperCase())}
          placeholder="Enter code"
          autoComplete="off"
          sx={{ flex: 1, minWidth: 0 }}
          inputProps={{
            maxLength: 6,
            "aria-label": "Enter the code shown in the image",
            spellCheck: false,
            style: {
              letterSpacing: "0.18em",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ShieldOutlined sx={{ fontSize: 17 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Code image + refresh, styled as a pill matching the input beside it. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            pl: 1.75,
            pr: 0.5,
            gap: 0.25,
            borderRadius: "999px",
            bgcolor: "var(--lp-input-bg)",
            boxShadow: "var(--lp-input-shadow)",
            userSelect: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="CAPTCHA code"
            style={{ width: CANVAS_W, height: CANVAS_H, display: "block" }}
          />
          <Tooltip title="New code" arrow>
            <IconButton
              size="small"
              onClick={captcha.refresh}
              aria-label="Refresh CAPTCHA"
              sx={{
                width: 34,
                height: 34,
                color: "var(--lp-icon-idle)",
                transition: "color .2s, transform .35s ease",
                "&:hover": {
                  color: "var(--lp-icon-active)",
                  bgcolor: "transparent",
                  transform: "rotate(180deg)",
                },
              }}
            >
              <Refresh sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default CaptchaField;
