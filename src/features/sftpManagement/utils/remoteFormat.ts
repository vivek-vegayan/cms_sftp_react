// Small formatting / helper functions shared by the Servers tab components.

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
};

export const formatDateTime = (epochMs: number): string =>
  new Date(epochMs).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export const formatRelative = (epochMs: number, now: number = Date.now()): string => {
  const seconds = Math.round((epochMs - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return RELATIVE.format(Math.round(seconds / 86400), "day");
  return formatDateTime(epochMs);
};

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export const joinPath = (folder: string, name: string): string => (folder ? `${folder}/${name}` : name);

export const parentPath = (path: string): string => {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
};

const TEXT_EXTENSIONS = new Set([
  "log", "txt", "out", "err", "csv", "json", "xml", "yml", "yaml", "properties",
  "conf", "cfg", "ini", "sql", "sh", "bat", "cmd", "ps1", "md", "html", "js", "ts", "java", "py",
]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "gz", "tgz", "tar", "7z", "rar", "bz2", "xz", "war", "jar"]);

const extensionOf = (name: string): string => {
  // Rotated logs such as "catalina.out.1" or "app.log.2026-09-24" are still text.
  const lower = name.toLowerCase();
  if (/\.(log|out|txt)(\.[\w-]+)*$/.test(lower)) return "log";
  const dot = lower.lastIndexOf(".");
  return dot < 0 ? "" : lower.slice(dot + 1);
};

export type FileKind = "text" | "archive" | "other";

export const fileKind = (name: string): FileKind => {
  const ext = extensionOf(name);
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (ARCHIVE_EXTENSIONS.has(ext)) return "archive";
  return "other";
};

export const getErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { data?: unknown })?.data;
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message?: unknown }).message ?? fallback);
  }
  return fallback;
};

/** Opens a backend download link as a plain navigation so the browser streams it to disk. */
export const startBrowserDownload = (relativeUrl: string) => {
  const a = document.createElement("a");
  a.href = `${import.meta.env.VITE_REACT_APP_BASE_URL}${relativeUrl}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
