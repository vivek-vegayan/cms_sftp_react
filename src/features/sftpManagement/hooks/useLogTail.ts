import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReadRemoteFileChunkMutation } from "../api/remoteServerApi";
import type { FileChunk, RemoteLocation } from "../types/remoteServer.types";
import { getErrorMessage } from "../utils/remoteFormat";

const INITIAL_BYTES = 512 * 1024;
const OLDER_BYTES = 512 * 1024;
const FOLLOW_BYTES = 1024 * 1024;
const FOLLOW_INTERVAL_MS = 3000;
/** Oldest lines are dropped past this so a long follow session can't eat the tab's memory. */
const MAX_LINES = 200_000;

interface LogBuffer {
  /** Which file this buffer belongs to. */
  key: string;
  lines: string[];
  /** File byte offset of lines[0]. */
  start: number;
  /** File byte offset just past the last loaded byte. */
  end: number;
  fileSize: number;
  modified: number;
  /** False while the last line is still being written (no trailing newline yet). */
  endsWithNewline: boolean;
}

const encoder = new TextEncoder();

const splitLines = (text: string): { lines: string[]; endsWithNewline: boolean } => {
  if (!text) return { lines: [], endsWithNewline: true };
  const lines = text.split("\n");
  const endsWithNewline = lines[lines.length - 1] === "";
  if (endsWithNewline) lines.pop();
  return { lines, endsWithNewline };
};

const fromChunk = (key: string, chunk: FileChunk): LogBuffer => {
  const { lines, endsWithNewline } = splitLines(chunk.text);
  return {
    key,
    lines,
    start: chunk.start,
    end: chunk.end,
    fileSize: chunk.fileSize,
    modified: chunk.modified,
    endsWithNewline,
  };
};

/** Drops the oldest lines past MAX_LINES, moving `start` forward by their exact byte size. */
const capLines = (buf: LogBuffer): LogBuffer => {
  const excess = buf.lines.length - MAX_LINES;
  if (excess <= 0) return buf;
  let dropped = 0;
  for (let i = 0; i < excess; i++) dropped += encoder.encode(buf.lines[i]).length + 1;
  return { ...buf, lines: buf.lines.slice(excess), start: buf.start + dropped };
};

/**
 * Reads a remote (log) file in slices: the tail first, older slices on demand,
 * and new lines appended while `follow` is on. Never downloads the whole file.
 */
export function useLogTail(location: RemoteLocation | null, follow: boolean) {
  const [readChunk] = useReadRemoteFileChunkMutation();
  const [stored, setBuffer] = useState<LogBuffer | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorState, setErrorState] = useState<{ key: string | null; message: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  /** Bumped when a follow/refresh replaced the buffer (rotation), so the view can jump to the end. */
  const [resetCount, setResetCount] = useState(0);

  const locationKey = location ? `${location.serverId}|${location.root}|${location.path}` : null;
  // State left over from the previously opened file is never shown.
  const buffer = stored && stored.key === locationKey ? stored : null;
  const error = errorState && errorState.key === locationKey ? errorState.message : null;
  const loading = locationKey !== null && buffer === null && error === null;
  const setError = useCallback(
    (message: string | null) => setErrorState(message === null ? null : { key: locationKey, message }),
    [locationKey],
  );

  const bufferRef = useRef<LogBuffer | null>(null);
  useLayoutEffect(() => {
    bufferRef.current = buffer;
  });
  // Results from a previous file must never land in the current one.
  const generation = useRef(0);
  const pollInFlight = useRef(false);

  const loadTail = useCallback(() => {
    if (!location || !locationKey) return;
    const gen = ++generation.current;
    readChunk({ ...location, maxBytes: INITIAL_BYTES })
      .unwrap()
      .then((chunk) => {
        if (gen !== generation.current) return;
        setBuffer(fromChunk(locationKey, chunk));
        setLastUpdated(Date.now());
      })
      .catch((err: unknown) => {
        if (gen === generation.current) setError(getErrorMessage(err, "Could not read the file."));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the location's value, not its identity
  }, [locationKey, readChunk, setError]);

  useEffect(loadTail, [loadTail]);

  /** Retry after an error: clear it and read the tail again. */
  const reload = useCallback(() => {
    setError(null);
    loadTail();
  }, [loadTail, setError]);

  /** Loads the slice just before what is shown. Resolves to the number of lines prepended. */
  const loadOlder = useCallback(async (): Promise<number> => {
    const current = bufferRef.current;
    if (!location || !current || current.start === 0 || loadingOlder) return 0;
    const gen = generation.current;
    setLoadingOlder(true);
    try {
      const chunk = await readChunk({ ...location, before: current.start, maxBytes: OLDER_BYTES }).unwrap();
      if (gen !== generation.current) return 0;
      const { lines } = splitLines(chunk.text);
      setBuffer((prev) => (prev ? { ...prev, lines: [...lines, ...prev.lines], start: chunk.start } : prev));
      return lines.length;
    } catch (err) {
      setError(getErrorMessage(err, "Could not load older lines."));
      return 0;
    } finally {
      setLoadingOlder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the location's value, not its identity
  }, [locationKey, loadingOlder, readChunk]);

  /** Fetches whatever was appended since the last read. */
  const refresh = useCallback(async () => {
    const current = bufferRef.current;
    if (!location || !locationKey || !current || pollInFlight.current) return;
    const gen = generation.current;
    pollInFlight.current = true;
    setRefreshing(true);
    try {
      const chunk = await readChunk({ ...location, from: current.end, maxBytes: FOLLOW_BYTES }).unwrap();
      if (gen !== generation.current) return;
      setError(null);
      setLastUpdated(Date.now());
      if (chunk.reset) {
        setBuffer(fromChunk(locationKey, chunk));
        setResetCount((n) => n + 1);
        return;
      }
      setBuffer((prev) => {
        if (!prev) return prev;
        const meta = { fileSize: chunk.fileSize, modified: chunk.modified, end: chunk.end };
        if (!chunk.text) return { ...prev, ...meta };
        const { lines, endsWithNewline } = splitLines(chunk.text);
        const merged = prev.lines.slice();
        if (!prev.endsWithNewline && merged.length > 0 && lines.length > 0) {
          // The previous read ended mid-line; glue the rest of that line on.
          merged[merged.length - 1] += lines.shift();
        }
        merged.push(...lines);
        return capLines({ ...prev, ...meta, lines: merged, endsWithNewline });
      });
    } catch (err) {
      if (gen === generation.current) setError(getErrorMessage(err, "Could not refresh the file."));
    } finally {
      pollInFlight.current = false;
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the location's value, not its identity
  }, [locationKey, readChunk]);

  // Live tail: poll while following and the browser tab is visible.
  useEffect(() => {
    if (!follow || !locationKey) return;
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(tick, FOLLOW_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [follow, locationKey, refresh]);

  return {
    lines: buffer?.lines ?? [],
    fileSize: buffer?.fileSize ?? 0,
    modified: buffer?.modified ?? 0,
    loadedFrom: buffer?.start ?? 0,
    loadedTo: buffer?.end ?? 0,
    hasOlder: (buffer?.start ?? 0) > 0,
    isLoaded: buffer !== null,
    loading,
    loadingOlder,
    refreshing,
    error,
    lastUpdated,
    resetCount,
    loadOlder,
    refresh,
    reload,
  };
}
