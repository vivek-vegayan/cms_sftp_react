import { createContext, useMemo, useState } from "react";
import {
  alpha,
  createTheme,
  darken,
  lighten,
  responsiveFontSizes,
  type Theme,
  type ThemeOptions,
} from "@mui/material/styles";

/* ================================
   CONTRAST UTILITIES
   Small WCAG relative-luminance helpers so every color decision in this
   file (button text, badge text, chip text) is verifiably accessible
   instead of guessed — this matters because the brand accent and the
   status hues below are picked from a swatch list, not fixed values.
================================ */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks whichever of the two text colors clears WCAG AA (4.5:1) against `bg` — falls back to the higher-contrast option if neither clears it. */
function pickAccessibleText(
  bg: string,
  light = "#FFFFFF",
  dark = "#0B1420",
): string {
  const toLight = contrastRatio(bg, light);
  const toDark = contrastRatio(bg, dark);
  if (toLight >= 4.5 && toLight >= toDark) return light;
  if (toDark >= 4.5) return dark;
  return toLight >= toDark ? light : dark;
}

/* ================================
   SEMANTIC COLOR RAMPS
   Single source of truth for each status hue. Every surface, border,
   dim-fill, and alert override below reads from these five stops
   instead of re-typing hex — that duplication is what let "danger"
   and "info" tokens drift to different hues than palette.error/info
   in the previous version of this file.
   100 = softest tint (light-mode fill)   500 = base / brand hue
   300 = dark-mode text/fill               700 = light-mode strong accent
                                            900 = light-mode alert text
================================ */
const SUCCESS = { 100: "#E1F5EE", 300: "#5DCAA5", 500: "#1D9E75", 700: "#0F6E56", 900: "#085041" };
const ERROR = { 100: "#FCEBEB", 300: "#F09595", 500: "#E24B4A", 700: "#A32D2D", 900: "#791F1F" };
const WARNING = { 100: "#FAEEDA", 300: "#FAC775", 500: "#EF9F27", 700: "#854F0B", 900: "#633806" };
const INFO = { 100: "#E6F1FB", 300: "#85B7EB", 500: "#378ADD", 700: "#185FA5", 900: "#0C447C" };

/** A surface deliberately darker/lighter than `background.paper` — used only by the sidebar/drawer, which sit visually "below" cards. */
const SURFACE_SUNKEN = { light: "#FFFFFF", dark: "#0E1621" } as const;

/* ================================
   BRAND / ACCENT COLOR OPTIONS
   The Header's theme-control swatches pick one of these as
   theme.palette.primary — every accent-driven surface in the
   app (buttons, links, sidebar highlights, focus rings) follows.
================================ */

export interface BrandColorOption {
  label: string;
  value: string;
}

export const BRAND_COLOR_OPTIONS: BrandColorOption[] = [
  { label: "Airtel Blue", value: "#185FA5" },
  { label: "Violet", value: "#6C5CE7" },
  { label: "Sky", value: "#0984E3" },
  { label: "Emerald", value: "#00B894" },
  { label: "Amber", value: "#F39C12" },
  { label: "Rose", value: "#B81D4C" },
];

export const DEFAULT_BRAND_COLOR = BRAND_COLOR_OPTIONS[0].value;

/* ================================
   THEME SETTINGS
================================ */

export const themeSettings = (
  mode: "light" | "dark",
  primaryColor: string = DEFAULT_BRAND_COLOR,
): ThemeOptions => {
  const isDark = mode === "dark";

  const primaryMain = primaryColor;
  const primaryLight = lighten(primaryColor, 0.28);
  const primaryDark = darken(primaryColor, 0.28);
  const primaryContrastText = pickAccessibleText(primaryMain);
  const focusRing = alpha(primaryMain, isDark ? 0.1 : 0.06);
  const focusRingStrong = alpha(primaryMain, isDark ? 0.2 : 0.12);

  const bgDefault = isDark ? "#0C1117" : "#F4F6F9";
  const bgPaper = isDark ? "#131C2B" : "#FFFFFF";
  const textPrimary = isDark ? "#E8EDF5" : "#0D1B2A";
  const textSecondary = isDark ? "#7B90A8" : "#4A5568";
  const textDisabled = isDark ? "#3E5068" : "#A0AEC0";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(13,27,42,0.08)";
  const sidebarSurface = SURFACE_SUNKEN[mode];

  return {
    palette: {
      mode,

      primary: {
        main: primaryMain, // User-selectable brand accent — driven by the header theme control
        light: primaryLight,
        dark: primaryDark,
        contrastText: primaryContrastText,
      },

      // Mirrors `success` exactly — kept as a distinct MUI palette slot only
      // because a handful of components (AppStepper, ProfileDrawer) read
      // `palette.secondary` for "completed/positive" accents.
      secondary: {
        main: SUCCESS[500],
        light: SUCCESS[300],
        dark: SUCCESS[700],
        contrastText: pickAccessibleText(SUCCESS[500]),
      },

      error: {
        main: ERROR[500],
        light: ERROR[300],
        dark: ERROR[700],
        contrastText: pickAccessibleText(ERROR[500]),
      },

      warning: {
        main: WARNING[500],
        light: WARNING[300],
        dark: WARNING[700],
        contrastText: pickAccessibleText(WARNING[500]),
      },

      info: {
        main: INFO[500],
        light: INFO[300],
        dark: INFO[700],
        contrastText: pickAccessibleText(INFO[500]),
      },

      success: {
        main: SUCCESS[500],
        light: SUCCESS[300],
        dark: SUCCESS[700],
        contrastText: pickAccessibleText(SUCCESS[500]),
      },

      background: {
        default: bgDefault, // Page / outer shell
        paper: bgPaper, // Cards / sidebar / header
      },

      text: {
        primary: textPrimary,
        secondary: textSecondary,
        disabled: textDisabled,
      },

      divider: borderColor,

      action: {
        hover: isDark ? "rgba(255,255,255,0.04)" : "rgba(13,27,42,0.04)",
        selected: focusRingStrong,
        disabledBackground: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(13,27,42,0.06)",
        disabled: textDisabled,
      },
    },

    shape: {
      borderRadius: 8,
    },

    // Explicit breakpoints (same values MUI defaults to) so every
    // theme.breakpoints.down/up() call across the app is grounded here.
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },

    typography: {
      // IBM Plex Sans (already installed via @fontsource, already used on
      // LoginPage) with the previous system stack kept as the fallback
      // chain — no added network dependency, just a shared identity
      // between the login screen and the authenticated app shell.
      fontFamily: [
        '"IBM Plex Sans"',
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Source Sans Pro"',
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      fontSize: 14,

      h1: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" },
      h3: { fontSize: 20, fontWeight: 600 },
      h4: { fontSize: 17, fontWeight: 600 },
      h5: { fontSize: 15, fontWeight: 600 },
      h6: { fontSize: 13, fontWeight: 600 },

      body1: { fontSize: 14, lineHeight: 1.6 },
      body2: { fontSize: 12, lineHeight: 1.5 },

      caption: {
        fontSize: 11,
        letterSpacing: "0.04em",
        color: textSecondary,
      },

      overline: {
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
    },

    components: {
      // ── Global baseline ────────────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bgDefault,
            "&::-webkit-scrollbar": { width: 6, height: 6 },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: isDark ? "#1E2D40" : "#CBD5E1",
              borderRadius: 6,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: isDark ? "#2A3E57" : "#94A3B8",
            },
          },
        },
      },

      // ── Paper ──────────────────────────────────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${borderColor}`,
          },
          elevation1: {
            boxShadow: isDark
              ? "0 1px 4px rgba(0,0,0,0.4)"
              : "0 1px 4px rgba(13,27,42,0.08)",
          },
        },
      },

      // ── Card ───────────────────────────────────────────────────────────
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: bgPaper,
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
              ? "0 4px 20px rgba(0,0,0,0.3)"
              : "0 4px 20px rgba(13,27,42,0.06)",
          },
        },
      },

      // ── Button ─────────────────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8,
            padding: "7px 18px",
            fontSize: 13,
            transition: "background 0.15s, opacity 0.15s",
          },
          containedPrimary: {
            backgroundColor: primaryMain,
            color: primaryContrastText,
            "&:hover": { backgroundColor: primaryDark },
            "&.Mui-disabled": {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(13,27,42,0.07)",
              color: textDisabled,
            },
          },
          outlinedPrimary: {
            borderColor: alpha(primaryMain, isDark ? 0.4 : 0.35),
            color: primaryMain,
            "&:hover": { backgroundColor: focusRing },
          },
          textPrimary: {
            color: primaryMain,
            "&:hover": { backgroundColor: focusRing },
          },
        },
      },

      // ── IconButton ─────────────────────────────────────────────────────
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&:hover": {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(13,27,42,0.05)",
            },
          },
        },
      },

      // ── TextField / OutlinedInput ──────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 13,
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(13,27,42,0.15)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark
                ? "rgba(255,255,255,0.2)"
                : "rgba(13,27,42,0.3)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryMain,
              borderWidth: 1.5,
            },
          },
          input: {
            padding: "8px 12px",
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: 13,
            "&.Mui-focused": { color: primaryMain },
          },
        },
      },

      // ── Select ─────────────────────────────────────────────────────────
      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: 13,
            paddingTop: 8,
            paddingBottom: 8,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: 13,
            minHeight: 36,
            "&:hover": { backgroundColor: focusRing },
            "&.Mui-selected": {
              backgroundColor: focusRingStrong,
              "&:hover": { backgroundColor: alpha(primaryMain, isDark ? 0.28 : 0.16) },
            },
          },
        },
      },

      // ── Checkbox ───────────────────────────────────────────────────────
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 4,
            color: isDark ? "rgba(255,255,255,0.2)" : "rgba(13,27,42,0.25)",
            "&.Mui-checked": { color: primaryMain },
            "&.Mui-disabled": {
              color: isDark ? "rgba(255,255,255,0.1)" : "rgba(13,27,42,0.12)",
            },
          },
        },
      },

      // ── Chip ───────────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 11,
          },
          sizeSmall: {
            height: 20,
            fontSize: 10,
          },
        },
      },

      // ── Tabs ───────────────────────────────────────────────────────────
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
          indicator: {
            height: 2,
            borderRadius: 2,
            backgroundColor: primaryMain,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            fontSize: 13,
            minHeight: 44,
            color: textSecondary,
            "&.Mui-selected": {
              color: primaryMain,
              fontWeight: 600,
            },
            "&:hover": {
              color: isDark ? primaryLight : primaryDark,
              backgroundColor: focusRing,
            },
          },
        },
      },

      // ── Accordion ──────────────────────────────────────────────────────
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: "10px !important",
            border: `1px solid ${borderColor}`,
            boxShadow: "none",
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: 0 },
          },
        },
      },

      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: "44px !important",
            borderRadius: "10px 10px 0 0",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(13,27,42,0.015)",
            "&.Mui-expanded": {
              borderBottom: `1px solid ${borderColor}`,
            },
            "& .MuiAccordionSummary-content": {
              my: "10px !important",
              display: "flex",
              alignItems: "center",
              gap: 10,
            },
          },
        },
      },

      MuiAccordionDetails: {
        styleOverrides: {
          root: { padding: 0 },
        },
      },

      // ── Table ──────────────────────────────────────────────────────────
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: 12,
            borderColor: borderColor,
            padding: "8px 12px",
          },
          head: {
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: textSecondary,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(13,27,42,0.015)",
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover td": {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(13,27,42,0.018)",
            },
          },
        },
      },

      // ── Alert ──────────────────────────────────────────────────────────
      // Each variant reads from the same SUCCESS/ERROR/WARNING/INFO ramp
      // used everywhere else, so "danger" always means the same red.
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontSize: 12,
            alignItems: "center",
          },
          standardInfo: {
            backgroundColor: isDark ? alpha(INFO[500], 0.12) : INFO[100],
            color: isDark ? INFO[300] : INFO[900],
            border: `1px solid ${isDark ? alpha(INFO[500], 0.25) : INFO[300]}`,
          },
          standardWarning: {
            backgroundColor: isDark ? alpha(WARNING[500], 0.12) : WARNING[100],
            color: isDark ? WARNING[300] : WARNING[900],
            border: `1px solid ${isDark ? alpha(WARNING[500], 0.25) : WARNING[300]}`,
          },
          standardError: {
            backgroundColor: isDark ? alpha(ERROR[500], 0.12) : ERROR[100],
            color: isDark ? ERROR[300] : ERROR[900],
            border: `1px solid ${isDark ? alpha(ERROR[500], 0.25) : ERROR[300]}`,
          },
          standardSuccess: {
            backgroundColor: isDark ? alpha(SUCCESS[500], 0.12) : SUCCESS[100],
            color: isDark ? SUCCESS[300] : SUCCESS[900],
            border: `1px solid ${isDark ? alpha(SUCCESS[500], 0.25) : SUCCESS[300]}`,
          },
        },
      },

      // ── Drawer ─────────────────────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: sidebarSurface,
            borderRight: `1px solid ${borderColor}`,
          },
        },
      },

      // ── Tooltip ────────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 6,
            backgroundColor: isDark ? "#1E2D40" : textPrimary,
            color: isDark ? textPrimary : bgDefault,
            padding: "5px 10px",
          },
        },
      },

      // ── Divider ────────────────────────────────────────────────────────
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: borderColor,
          },
        },
      },
    },
  };
};

/* ================================
   COLOR MODE + BRAND COLOR CONTEXT
================================ */

interface ColorModeContextType {
  toggleColorMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  primaryColor: DEFAULT_BRAND_COLOR,
  setPrimaryColor: () => {},
});

/* ================================
   USE MODE HOOK
================================ */

const MODE_STORAGE_KEY = "chm.themeMode";
const BRAND_COLOR_STORAGE_KEY = "chm.brandColor";

function readStoredMode(): "light" | "dark" {
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function readStoredBrandColor(): string {
  return window.localStorage.getItem(BRAND_COLOR_STORAGE_KEY) || DEFAULT_BRAND_COLOR;
}

export const useMode = (): [
  ReturnType<typeof createTheme>,
  ColorModeContextType,
] => {
  const [mode, setMode] = useState<"light" | "dark">(readStoredMode);
  const [primaryColor, setPrimaryColorState] = useState<string>(readStoredBrandColor);

  const colorMode = useMemo<ColorModeContextType>(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          window.localStorage.setItem(MODE_STORAGE_KEY, next);
          return next;
        }),
      primaryColor,
      setPrimaryColor: (color: string) => {
        window.localStorage.setItem(BRAND_COLOR_STORAGE_KEY, color);
        setPrimaryColorState(color);
      },
    }),
    [primaryColor],
  );

  const theme = useMemo(
    () => responsiveFontSizes(createTheme(themeSettings(mode, primaryColor))),
    [mode, primaryColor],
  );

  return [theme, colorMode];
};

/* ================================
   SEMANTIC UI TOKENS
   The canonical token API consumed by feature components — surfaces,
   borders, and status colors all derive from the active MUI theme
   (so they always track palette.mode + the selected brand color) and
   from the SUCCESS/ERROR/WARNING/INFO ramps above (so "danger" here is
   always the same red as theme.palette.error, never a different one).
================================ */

export function useTabColorTokens(theme: Theme) {
  const isDark = theme.palette.mode === "dark";
  const primaryMain = theme.palette.primary.main;

  return {
    // ── Surfaces ──────────────────────────────────────────────────────────
    bg: theme.palette.background.default, // #0C1117 / #F4F6F9
    surface: theme.palette.background.paper, // #131C2B / #FFFFFF
    surface2: isDark ? "#1A2436" : "#F0F4F8", // Slightly elevated surface
    sidebarBg: SURFACE_SUNKEN[theme.palette.mode],

    // ── Borders ───────────────────────────────────────────────────────────
    border: theme.palette.divider,
    borderHover: isDark ? "rgba(255,255,255,0.12)" : "rgba(13,27,42,0.18)",

    // ── Primary accent (user-selectable brand colour) ─────────────────────
    accent: primaryMain,
    accentLight: isDark ? theme.palette.primary.light : theme.palette.primary.dark,
    accentDim: alpha(primaryMain, isDark ? 0.1 : 0.05),
    accentBorder: alpha(primaryMain, isDark ? 0.3 : 0.2),

    // ── Success / green ───────────────────────────────────────────────────
    success: theme.palette.success.main,
    successDim: alpha(theme.palette.success.main, isDark ? 0.12 : 0.07),
    successBorder: alpha(theme.palette.success.main, isDark ? 0.3 : 0.2),

    // ── Danger / red ──────────────────────────────────────────────────────
    danger: theme.palette.error.main,
    dangerDim: alpha(theme.palette.error.main, isDark ? 0.12 : 0.07),
    dangerBorder: alpha(theme.palette.error.main, isDark ? 0.3 : 0.2),

    // ── Warning / amber ───────────────────────────────────────────────────
    warning: isDark ? WARNING[300] : WARNING[700],
    warningDim: alpha(theme.palette.warning.main, isDark ? 0.12 : 0.07),
    warningBorder: alpha(theme.palette.warning.main, isDark ? 0.3 : 0.2),

    // ── Info / blue ───────────────────────────────────────────────────────
    info: theme.palette.info.main,
    infoDim: alpha(theme.palette.info.main, isDark ? 0.1 : 0.07),
    infoBorder: alpha(theme.palette.info.main, isDark ? 0.28 : 0.22),

    // ── Text ──────────────────────────────────────────────────────────────
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    textDim: theme.palette.text.disabled,

    // ── Sidebar / nav specific ────────────────────────────────────────────
    selectedRow: alpha(primaryMain, isDark ? 0.12 : 0.07),
    selectedBar: primaryMain,

    // ── Radius ────────────────────────────────────────────────────────────
    radius: `${theme.shape.borderRadius}px`, // 8px
    radiusL: `${(theme.shape.borderRadius as number) + 4}px`, // 12px
    radiusXL: `${(theme.shape.borderRadius as number) + 8}px`, // 16px
    radiusPill: "999px",

    // ── Elevation ─────────────────────────────────────────────────────────
    // A shared shadow scale for new shell surfaces (header, sidebar
    // flyouts, the global search palette) — existing per-component ad hoc
    // shadows elsewhere are untouched, this is additive only.
    shadowCard: isDark
      ? "0 4px 20px rgba(0,0,0,0.3)"
      : "0 4px 20px rgba(13,27,42,0.06)",
    shadowElevated: isDark
      ? "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)"
      : "0 8px 32px rgba(30,30,80,0.16), 0 2px 8px rgba(13,27,42,0.06)",
    shadowOverlay: isDark
      ? "0 20px 60px rgba(0,0,0,0.55)"
      : "0 20px 60px rgba(13,27,42,0.22)",

    // ── Toggle track ──────────────────────────────────────────────────────
    trackOff: isDark ? "rgba(255,255,255,0.08)" : "rgba(13,27,42,0.09)",
    trackOffBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(13,27,42,0.12)",

    isDark,
  };
}
