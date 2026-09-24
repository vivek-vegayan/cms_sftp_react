import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { toast } from "react-toastify";
import {
  useCreateRemoteDownloadLinkMutation,
  useDeleteRemoteFileMutation,
  useGetRemoteServersQuery,
  useListRemoteFolderQuery,
} from "../../api/remoteServerApi";
import type { RemoteEntry } from "../../types/remoteServer.types";
import {
  fileKind,
  formatBytes,
  formatDateTime,
  formatRelative,
  getErrorMessage,
  joinPath,
  parentPath,
  startBrowserDownload,
} from "../../utils/remoteFormat";
import LogViewerDrawer from "./LogViewerDrawer";

type SortKey = "name" | "size" | "modified";

const EntryIcon = ({ entry }: { entry: RemoteEntry }) => {
  if (entry.directory) return <FolderIcon sx={{ color: "#f2b53a" }} fontSize="small" />;
  const kind = fileKind(entry.name);
  if (kind === "text") return <DescriptionOutlinedIcon color="primary" fontSize="small" />;
  if (kind === "archive") return <InventoryOutlinedIcon color="action" fontSize="small" />;
  return <InsertDriveFileOutlinedIcon color="action" fontSize="small" />;
};

/**
 * Browse the folders configured for each remote server (36, 37, ...):
 * pick a server and a folder, walk sub-folders, view logs live, download
 * files of any size, and delete in writable folders.
 * Server / folder / path / open file all live in the URL, so Back, refresh
 * and shared links work.
 */
export default function ServerExplorerPanel() {
  const theme = useTheme();
  const [params, setParams] = useSearchParams();

  const { data: servers, isLoading: serversLoading, error: serversError, refetch: refetchServers } =
    useGetRemoteServersQuery();

  const server = servers?.find((s) => s.id === params.get("server")) ?? servers?.[0];
  const root = server?.roots.find((r) => r.id === params.get("root")) ?? server?.roots[0];
  const path = params.get("path") ?? "";
  const viewing = params.get("view");

  const location = server && root ? { serverId: server.id, root: root.id, path } : null;
  const {
    data: listing,
    isFetching,
    isLoading: listingLoading,
    error: listingError,
    refetch,
  } = useListRemoteFolderQuery(location ?? { serverId: "", root: "", path: "" }, { skip: !location });

  const [createLink] = useCreateRemoteDownloadLinkMutation();
  const [deleteFile] = useDeleteRemoteFileMutation();

  // The name filter belongs to one folder; moving elsewhere starts it empty.
  const folderKey = `${server?.id}|${root?.id}|${path}`;
  const [filterState, setFilterState] = useState({ key: folderKey, value: "" });
  const filter = filterState.key === folderKey ? filterState.value : "";
  const setFilter = (value: string) => setFilterState({ key: folderKey, value });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "modified", dir: "desc" });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  /* ─────────── navigation (URL is the state) ─────────── */

  const navigate = useCallback(
    (next: { server?: string | null; root?: string | null; path?: string | null; view?: string | null }, replace = false) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          const set = (key: string, value: string | null | undefined) => {
            if (value === undefined) return;
            if (value === null || value === "") p.delete(key);
            else p.set(key, value);
          };
          set("server", next.server);
          set("root", next.root);
          set("path", next.path);
          set("view", next.view);
          return p;
        },
        { replace },
      );
    },
    [setParams],
  );

  // Ids left in the URL by an older config or bookmark (e.g. ?server=37) are
  // dropped so the address always matches what is shown. With a single
  // server there is nothing to choose, so its id never appears at all.
  const serverParam = params.get("server");
  const rootParam = params.get("root");
  useEffect(() => {
    if (!servers || !server) return;
    const staleServer = serverParam !== null && (servers.length === 1 || serverParam !== server.id);
    const staleRoot = rootParam !== null && !server.roots.some((r) => r.id === rootParam);
    if (staleServer || staleRoot) {
      navigate(
        {
          server: staleServer ? null : undefined,
          ...(staleServer || staleRoot ? { root: null, path: null, view: null } : {}),
        },
        true,
      );
    }
  }, [servers, server, serverParam, rootParam, navigate]);

  const openFolder = (folderPath: string) => navigate({ path: folderPath, view: null });
  const selectServer = (serverId: string) => navigate({ server: serverId, root: null, path: null, view: null });
  const selectRoot = (rootId: string) => navigate({ root: rootId, path: null, view: null });

  /* ─────────── rows ─────────── */

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const entries = (listing?.entries ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...entries].sort((a, b) => {
      if (a.directory !== b.directory) return a.directory ? -1 : 1;
      const cmp =
        sort.key === "name"
          ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
          : sort.key === "size"
            ? a.size - b.size
            : a.modified - b.modified;
      return cmp * factor;
    });
  }, [listing, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  /* ─────────── actions ─────────── */

  const handleDownload = async (filePath: string) => {
    if (!server || !root) return;
    setDownloading(filePath);
    try {
      const link = await createLink({ serverId: server.id, root: root.id, path: filePath }).unwrap();
      startBrowserDownload(link.url);
      toast.info(`Downloading ${link.fileName} — track it in your browser's downloads.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start the download."));
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (entry: RemoteEntry) => {
    if (!server || !root) return;
    if (!window.confirm(`Delete "${entry.name}" from ${root.label}? This cannot be undone.`)) return;
    const filePath = joinPath(path, entry.name);
    setDeleting(filePath);
    try {
      await deleteFile({ serverId: server.id, root: root.id, path: filePath, folder: path }).unwrap();
      toast.success(`${entry.name} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${entry.name}.`));
    } finally {
      setDeleting(null);
    }
  };

  const openEntry = (entry: RemoteEntry) => {
    const entryPath = joinPath(path, entry.name);
    if (entry.directory) openFolder(entryPath);
    else if (fileKind(entry.name) === "archive") void handleDownload(entryPath);
    else navigate({ view: entryPath });
  };

  /* ─────────── states before a listing exists ─────────── */

  if (serversLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: "none" }}>
        <Skeleton width={260} height={36} />
        <Skeleton width="60%" />
        <Skeleton variant="rounded" height={280} sx={{ mt: 2 }} />
      </Paper>
    );
  }

  if (serversError || !servers || servers.length === 0) {
    return (
      <Alert
        severity={serversError ? "error" : "info"}
        action={
          <Button color="inherit" size="small" onClick={() => void refetchServers()}>
            Retry
          </Button>
        }
      >
        {serversError ? (
          getErrorMessage(serversError, "Could not load the server list.")
        ) : (
          <>
            No folders are configured yet. Add <code>LOCAL_READ_ROOTS</code> (and optionally{" "}
            <code>LOCAL_WRITE_ROOTS</code>) to the backend's external config file and restart it.
          </>
        )}
      </Alert>
    );
  }

  // With a single server (per-server deployment) its name is just noise.
  const showServer = servers.length > 1;
  const segments = path ? path.split("/") : [];
  const viewingName = viewing ? viewing.split("/").pop() ?? viewing : "";

  return (
    <Stack spacing={2} sx={{ pb: 4 }}>
      {/* ── Server + folder pickers ── */}
      <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: "none" }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          {/* One server (the usual per-server deployment): no picker, straight to its folders. */}
          {servers.length > 1 && (
          <TextField
            select
            label="Server"
            size="small"
            value={server?.id ?? ""}
            onChange={(e) => selectServer(e.target.value)}
            sx={{ minWidth: 260 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <DnsOutlinedIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              },
            }}
          >
            {servers.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {s.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.host}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
          )}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flex: 1 }}>
            {server?.roots.map((r) => {
              const selected = r.id === root?.id;
              return (
                <Tooltip key={r.id} title={`${r.path} — ${r.writable ? "delete allowed" : "read-only"}`}>
                  <Chip
                    clickable
                    onClick={() => selectRoot(r.id)}
                    icon={r.writable ? <EditOutlinedIcon /> : <LockOutlinedIcon />}
                    label={r.label}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    sx={{ fontWeight: selected ? 600 : 500 }}
                  />
                </Tooltip>
              );
            })}
            {server && server.roots.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No folders are configured for this server.
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ── Browser ── */}
      {root && (
        <Paper
          sx={{
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: "none",
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <Tooltip title="Up one folder">
              <span>
                <IconButton size="small" disabled={!path} onClick={() => openFolder(parentPath(path))}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ flex: 1, minWidth: 200 }} maxItems={6}>
              <Link
                component="button"
                underline="hover"
                color={segments.length ? "inherit" : "text.primary"}
                onClick={() => openFolder("")}
                sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}
              >
                {root.label}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  ({root.path})
                </Typography>
              </Link>
              {segments.map((seg, i) => {
                const isLast = i === segments.length - 1;
                return isLast ? (
                  <Typography key={i} color="text.primary" fontWeight={600}>
                    {seg}
                  </Typography>
                ) : (
                  <Link key={i} component="button" underline="hover" color="inherit" onClick={() => openFolder(segments.slice(0, i + 1).join("/"))}>
                    {seg}
                  </Link>
                );
              })}
            </Breadcrumbs>

            <TextField
              size="small"
              placeholder="Filter by name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ width: { xs: "100%", sm: 220 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={() => void refetch()} disabled={isFetching}>
                  {isFetching ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {listing?.truncated && (
            <Alert severity="warning" sx={{ borderRadius: 0 }}>
              This folder has more entries than can be listed at once — only the first {listing.entries.length.toLocaleString()} are shown.
            </Alert>
          )}
          {listingError && (
            <Alert
              severity="error"
              sx={{ borderRadius: 0 }}
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            >
              {getErrorMessage(listingError, "Could not open this folder.")}
            </Alert>
          )}

          {/* Table */}
          <Box sx={{ overflowX: "auto", maxHeight: { xs: "none", lg: "calc(100vh - 330px)" }, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: { xs: 2, md: 3 } }}>
                    <TableSortLabel active={sort.key === "name"} direction={sort.key === "name" ? sort.dir : "asc"} onClick={() => toggleSort("name")}>
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    <TableSortLabel active={sort.key === "size"} direction={sort.key === "size" ? sort.dir : "desc"} onClick={() => toggleSort("size")}>
                      Size
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: 200 }}>
                    <TableSortLabel
                      active={sort.key === "modified"}
                      direction={sort.key === "modified" ? sort.dir : "desc"}
                      onClick={() => toggleSort("modified")}
                    >
                      Modified
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ width: 150, pr: { xs: 2, md: 3 } }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listingLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4} sx={{ px: 3 }}>
                        <Skeleton height={28} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        {filter ? `Nothing matches "${filter}".` : listingError ? "" : "This folder is empty."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((entry) => {
                    const entryPath = joinPath(path, entry.name);
                    const canView = !entry.directory && fileKind(entry.name) !== "archive";
                    return (
                      <TableRow
                        key={entry.name}
                        hover
                        onClick={() => openEntry(entry)}
                        sx={{ cursor: "pointer", "& td": { py: 0.75 } }}
                      >
                        <TableCell sx={{ pl: { xs: 2, md: 3 } }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                            <EntryIcon entry={entry} />
                            <Typography
                              variant="body2"
                              noWrap
                              title={entry.name}
                              sx={{ fontWeight: entry.directory ? 600 : 400, maxWidth: { xs: 200, md: 520 } }}
                            >
                              {entry.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                          {entry.directory ? "—" : formatBytes(entry.size)}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>
                          <Tooltip title={formatDateTime(entry.modified)}>
                            <span>{formatRelative(entry.modified)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" sx={{ pr: { xs: 2, md: 3 } }} onClick={(e) => e.stopPropagation()}>
                          {!entry.directory && (
                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
                              {canView && (
                                <Tooltip title="View">
                                  <IconButton size="small" onClick={() => navigate({ view: entryPath })}>
                                    <VisibilityOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Download">
                                <span>
                                  <IconButton size="small" onClick={() => void handleDownload(entryPath)} disabled={downloading === entryPath}>
                                    {downloading === entryPath ? <CircularProgress size={18} /> : <CloudDownloadOutlinedIcon fontSize="small" />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              {root.writable && (
                                <Tooltip title="Delete">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => void handleDelete(entry)}
                                      disabled={deleting === entryPath}
                                    >
                                      {deleting === entryPath ? <CircularProgress size={18} /> : <DeleteOutlineIcon fontSize="small" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>

          {listing && (
            <Box sx={{ px: 3, py: 1, borderTop: `1px solid ${theme.palette.divider}`, color: "text.secondary", fontSize: 12 }}>
              {listing.entries.filter((e) => e.directory).length} folders ·{" "}
              {listing.entries.filter((e) => !e.directory).length} files ·{" "}
              {formatBytes(listing.entries.reduce((sum, e) => sum + (e.directory ? 0 : e.size), 0))}
              {!root.writable && " · read-only"}
            </Box>
          )}

        </Paper>
      )}

      <LogViewerDrawer
        // Remount per file so search, filters and follow start fresh.
        key={viewing && server && root ? `${server.id}|${root.id}|${viewing}` : "closed"}
        file={viewing && server && root ? { serverId: server.id, root: root.id, path: viewing } : null}
        fileName={viewingName}
        subtitle={server && root ? `${showServer ? `${server.name} (${server.host}) · ` : ""}${root.label}/${viewing ?? ""}` : ""}
        onClose={() => navigate({ view: null })}
        onDownload={() => viewing && void handleDownload(viewing)}
        downloading={downloading === viewing}
      />
    </Stack>
  );
}
