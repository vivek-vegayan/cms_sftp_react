import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import FilterListIcon from "@mui/icons-material/FilterList";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useLogTail } from "../../hooks/useLogTail";
import type { RemoteLocation } from "../../types/remoteServer.types";
import { formatBytes, formatDateTime, formatRelative } from "../../utils/remoteFormat";

const LINE_HEIGHT = 20;
const OVERSCAN = 30;
const MONO = '"IBM Plex Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

// A log console reads best dark in both app themes.
const CONSOLE = {
  bg: "#0b1220",
  gutter: "#111a2e",
  text: "#d6deeb",
  muted: "#7f8ea3",
  error: "#ff7b7b",
  errorBg: "rgba(255, 90, 90, 0.08)",
  warn: "#f5c451",
  warnBg: "rgba(245, 196, 81, 0.06)",
  mark: "#fde047",
  currentRow: "rgba(250, 204, 21, 0.16)",
};

type Level = "error" | "warn" | "debug" | "info";
type LevelFilter = "all" | "warn" | "error";

const ERROR_RE = /\b(ERROR|SEVERE|FATAL|CRITICAL)\b|Exception\b|^\s+at\s|^Caused by:/;
const WARN_RE = /\bWARN(ING)?\b/;
const DEBUG_RE = /\b(DEBUG|TRACE|FINE|FINER|FINEST)\b/;

const levelOf = (line: string): Level =>
  ERROR_RE.test(line) ? "error" : WARN_RE.test(line) ? "warn" : DEBUG_RE.test(line) ? "debug" : "info";

interface LogViewerDrawerProps {
  /** The file to show; null closes the drawer. */
  file: RemoteLocation | null;
  fileName: string;
  subtitle: string;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}

export default function LogViewerDrawer({ file, fileName, subtitle, onClose, onDownload, downloading }: LogViewerDrawerProps) {
  const theme = useTheme();
  const [follow, setFollow] = useState(false);
  const tail = useLogTail(file, follow);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  // Match cursor belongs to one query; a new query starts at its newest match.
  const [matchCursor, setMatchCursor] = useState<{ query: string; index: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [atBottom, setAtBottom] = useState(true);
  const pendingPrepend = useRef<{ length: number; scrollTop: number } | null>(null);

  // The parent remounts this component per file (key), so view options start fresh.
  const fileKey = file ? `${file.serverId}|${file.root}|${file.path}` : "";

  /* ─────────── what to show ─────────── */

  const rows = useMemo(() => {
    const all = tail.lines.map((text, index) => ({ text: text.endsWith("\r") ? text.slice(0, -1) : text, index }));
    const byLevel =
      levelFilter === "all"
        ? all
        : all.filter(({ text }) => {
            const level = levelOf(text);
            return level === "error" || (levelFilter === "warn" && level === "warn");
          });
    return onlyMatches && deferredQuery
      ? byLevel.filter(({ text }) => text.toLowerCase().includes(deferredQuery))
      : byLevel;
  }, [tail.lines, levelFilter, onlyMatches, deferredQuery]);

  const matches = useMemo(() => {
    if (!deferredQuery) return [];
    const result: number[] = [];
    rows.forEach((row, i) => {
      if (row.text.toLowerCase().includes(deferredQuery)) result.push(i);
    });
    return result;
  }, [rows, deferredQuery]);

  /* ─────────── scrolling ─────────── */

  const scrollToRow = useCallback(
    (rowIndex: number) => {
      const el = scrollRef.current;
      if (el) el.scrollTop = Math.max(0, rowIndex * LINE_HEIGHT - viewportHeight / 2);
    },
    [viewportHeight],
  );

  const scrollToEnd = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fileKey]);

  // Keep the view pinned: after older lines are prepended hold position,
  // otherwise stick to the bottom if the user was already there.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pending = pendingPrepend.current;
    if (pending) {
      el.scrollTop = pending.scrollTop + (rows.length - pending.length) * LINE_HEIGHT;
      pendingPrepend.current = null;
    } else if (atBottom && !deferredQuery) {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-pin when the content changes
  }, [rows.length, tail.resetCount]);

  const loadOlder = useCallback(async () => {
    if (!tail.hasOlder || tail.loadingOlder) return;
    pendingPrepend.current = { length: rows.length, scrollTop: scrollRef.current?.scrollTop ?? 0 };
    const added = await tail.loadOlder();
    if (added === 0) pendingPrepend.current = null;
  }, [rows.length, tail]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < LINE_HEIGHT * 2);
    if (el.scrollTop < LINE_HEIGHT * 3 && tail.hasOlder && !tail.loadingOlder && levelFilter === "all" && !onlyMatches) {
      void loadOlder();
    }
  };

  /* ─────────── search navigation ─────────── */

  // Start at the newest match - in a log that's the one you usually want.
  const currentMatch =
    matchCursor && matchCursor.query === deferredQuery
      ? Math.min(matchCursor.index, Math.max(0, matches.length - 1))
      : Math.max(0, matches.length - 1);

  useEffect(() => {
    if (matches.length) scrollToRow(matches[matches.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jump only when the query changes
  }, [deferredQuery]);

  const stepMatch = (delta: number) => {
    if (!matches.length) return;
    const next = (currentMatch + delta + matches.length) % matches.length;
    setMatchCursor({ query: deferredQuery, index: next });
    scrollToRow(matches[next]);
  };

  // Ctrl+F / "/" focus the search box while the viewer is open.
  useEffect(() => {
    if (!fileKey) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fileKey]);

  /* ─────────── rendering ─────────── */

  const first = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + OVERSCAN);
  const currentRow = matches.length ? matches[currentMatch] : -1;

  const highlight = (text: string): ReactNode => {
    if (!deferredQuery) return text || " ";
    const lower = text.toLowerCase();
    const parts: ReactNode[] = [];
    let pos = 0;
    let hit = lower.indexOf(deferredQuery);
    while (hit >= 0) {
      if (hit > pos) parts.push(text.slice(pos, hit));
      parts.push(
        <mark key={hit} style={{ background: CONSOLE.mark, color: "#111", borderRadius: 2 }}>
          {text.slice(hit, hit + deferredQuery.length)}
        </mark>,
      );
      pos = hit + deferredQuery.length;
      hit = lower.indexOf(deferredQuery, pos);
    }
    if (pos < text.length) parts.push(text.slice(pos));
    return parts.length ? parts : " ";
  };

  const loadedBytes = tail.loadedTo - tail.loadedFrom;

  return (
    <Drawer
      anchor="right"
      open={file !== null}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100vw", md: "min(1280px, 90vw)" },
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
          },
        },
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
          }}
        >
          <DescriptionOutlinedIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" fontWeight={600} noWrap title={fileName} sx={{ fontFamily: MONO, fontSize: 17 }}>
            {fileName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap title={subtitle}>
            {subtitle}
          </Typography>
          {tail.isLoaded && (
            <Typography variant="caption" color="text.secondary">
              {formatBytes(tail.fileSize)} · modified {formatRelative(tail.modified)} ({formatDateTime(tail.modified)})
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title={follow ? "Stop following new lines" : "Follow new lines as they are written (every 3s)"}>
            <Chip
              clickable
              onClick={() => {
                setFollow((f) => !f);
                if (!follow) scrollToEnd();
              }}
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    ml: "10px !important",
                    borderRadius: "50%",
                    bgcolor: follow ? "success.main" : "text.disabled",
                    animation: follow ? "logLivePulse 1.6s ease-in-out infinite" : "none",
                    "@keyframes logLivePulse": {
                      "0%, 100%": { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.6)}` },
                      "50%": { boxShadow: `0 0 0 5px ${alpha(theme.palette.success.main, 0)}` },
                    },
                  }}
                />
              }
              label={follow ? "Live" : "Paused"}
              color={follow ? "success" : "default"}
              variant={follow ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
          <Tooltip title="Fetch new lines now">
            <span>
              <IconButton onClick={() => void tail.refresh()} disabled={!tail.isLoaded || tail.refreshing}>
                {tail.refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
            onClick={onDownload}
            disabled={downloading}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            Download
          </Button>
          <Tooltip title="Close (Esc)">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Toolbar ── */}
      <Box sx={{ px: 2.5, pb: 1.5, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Search loaded lines  (Ctrl+F)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              stepMatch(e.shiftKey ? -1 : 1);
            }
          }}
          sx={{ flex: "1 1 280px", maxWidth: 480 }}
          slotProps={{
            input: {
              sx: { fontFamily: MONO, fontSize: 13 },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: deferredQuery ? (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, whiteSpace: "nowrap" }}>
                    {matches.length ? `${currentMatch + 1} / ${matches.length}` : "0 results"}
                  </Typography>
                  <IconButton size="small" onClick={() => stepMatch(-1)} disabled={!matches.length}>
                    <KeyboardArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => stepMatch(1)} disabled={!matches.length}>
                    <KeyboardArrowDownIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <Tooltip title="Show only lines that match the search">
          <ToggleButton
            value="only"
            size="small"
            selected={onlyMatches}
            onChange={() => setOnlyMatches((v) => !v)}
            sx={{ textTransform: "none", gap: 0.5, px: 1.5 }}
          >
            <FilterListIcon fontSize="small" /> Only matches
          </ToggleButton>
        </Tooltip>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={levelFilter}
          onChange={(_e, value: LevelFilter | null) => value && setLevelFilter(value)}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5 } }}
        >
          <ToggleButton value="all">All levels</ToggleButton>
          <ToggleButton value="warn">Warn + Error</ToggleButton>
          <ToggleButton value="error">Errors</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider />
      {(tail.loading || tail.loadingOlder) && <LinearProgress sx={{ height: 2 }} />}
      {tail.error && (
        <Alert
          severity="error"
          sx={{ borderRadius: 0 }}
          action={
            <Button color="inherit" size="small" onClick={() => void tail.reload()}>
              Retry
            </Button>
          }
        >
          {tail.error}
        </Alert>
      )}

      {/* ── Console ── */}
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, bgcolor: CONSOLE.bg }}>
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "auto",
            fontFamily: MONO,
            fontSize: 12.5,
            color: CONSOLE.text,
            "&::-webkit-scrollbar": { width: 10, height: 10 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "#2a3754", borderRadius: 5 },
            "&::-webkit-scrollbar-track": { backgroundColor: CONSOLE.bg },
          }}
        >
          <Box
            sx={{
              height: rows.length * LINE_HEIGHT,
              pt: `${first * LINE_HEIGHT}px`,
              boxSizing: "border-box",
              width: "max-content",
              minWidth: "100%",
            }}
          >
            {rows.slice(first, last).map((row, i) => {
              const rowIndex = first + i;
              const level = levelOf(row.text);
              const isCurrent = rowIndex === currentRow;
              return (
                <Box
                  key={row.index}
                  sx={{
                    height: LINE_HEIGHT,
                    lineHeight: `${LINE_HEIGHT}px`,
                    whiteSpace: "pre",
                    px: 2,
                    color:
                      level === "error"
                        ? CONSOLE.error
                        : level === "warn"
                          ? CONSOLE.warn
                          : level === "debug"
                            ? CONSOLE.muted
                            : CONSOLE.text,
                    bgcolor: isCurrent
                      ? CONSOLE.currentRow
                      : level === "error"
                        ? CONSOLE.errorBg
                        : level === "warn"
                          ? CONSOLE.warnBg
                          : "transparent",
                    boxShadow: isCurrent ? `inset 3px 0 0 ${CONSOLE.mark}` : "none",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
                  }}
                >
                  {highlight(row.text)}
                </Box>
              );
            })}
          </Box>
          {tail.isLoaded && rows.length === 0 && (
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: CONSOLE.muted }}>
              {tail.lines.length === 0 ? "This file is empty." : "No lines match the current filters."}
            </Box>
          )}
        </Box>

        {tail.hasOlder && (
          <Box sx={{ position: "absolute", top: 8, left: 0, right: 0, zIndex: 1, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <Button
              size="small"
              onClick={() => void loadOlder()}
              disabled={tail.loadingOlder}
              sx={{
                pointerEvents: "auto",
                bgcolor: CONSOLE.gutter,
                color: CONSOLE.muted,
                textTransform: "none",
                border: "1px solid #24314d",
                "&:hover": { bgcolor: "#18233d" },
              }}
            >
              {tail.loadingOlder
                ? "Loading earlier lines…"
                : `Load earlier lines · ${formatBytes(tail.loadedFrom)} not loaded yet`}
            </Button>
          </Box>
        )}
        {!atBottom && rows.length > 0 && (
          <Button
            size="small"
            variant="contained"
            startIcon={<VerticalAlignBottomIcon />}
            onClick={scrollToEnd}
            sx={{ position: "absolute", right: 24, bottom: 16, borderRadius: 5, textTransform: "none", boxShadow: 4 }}
          >
            Jump to end
          </Button>
        )}
      </Box>

      {/* ── Status bar ── */}
      <Box
        sx={{
          px: 2.5,
          py: 0.75,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          borderTop: `1px solid ${theme.palette.divider}`,
          color: "text.secondary",
          fontSize: 12,
        }}
      >
        <span>
          {rows.length.toLocaleString()} {rows.length === tail.lines.length ? "lines" : `of ${tail.lines.length.toLocaleString()} lines`}
        </span>
        <span>
          Loaded {formatBytes(loadedBytes)} of {formatBytes(tail.fileSize)}
          {tail.hasOlder ? " (latest part)" : ""}
        </span>
        {tail.lastUpdated && <span>Updated {new Date(tail.lastUpdated).toLocaleTimeString()}</span>}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <span>Follow</span>
          <Switch
            size="small"
            checked={follow}
            onChange={(e) => {
              setFollow(e.target.checked);
              if (e.target.checked) scrollToEnd();
            }}
          />
        </Stack>
      </Box>
    </Drawer>
  );
}
