import { useRef, useState } from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Alert,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { toast } from "react-toastify";
import {
  useListLinuxRemoteFilesMutation,
  useUploadFileToLinuxRemoteMutation,
  useCreateLinuxDownloadLinkMutation,
  useDeleteLinuxRemoteFileMutation,
} from "../api/sftpApiSlice";
import { startBrowserDownload } from "../utils/remoteFormat";
import type { RemoteFileEntry, SftpConnectionDetails } from "../types/sftp.types";

const EMPTY_CONNECTION: SftpConnectionDetails = { host: "", port: 22, username: "", password: "" };

const getErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message?: unknown }).message ?? fallback);
  }
  return fallback;
};

/** Browses and downloads files from a remote Linux server's /tmp directory over SFTP — independent of sending a specific staged file. */
export default function RemoteTmpBrowserPanel() {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conn, setConn] = useState<SftpConnectionDetails>(EMPTY_CONNECTION);
  const [showPassword, setShowPassword] = useState(false);
  const [hasListed, setHasListed] = useState(false);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileEntry[] | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const [listRemote, { isLoading: isListing }] = useListLinuxRemoteFilesMutation();
  const [uploadRemote, { isLoading: isUploading }] = useUploadFileToLinuxRemoteMutation();
  const [deleteRemote] = useDeleteLinuxRemoteFileMutation();
  const [createDownloadLink] = useCreateLinuxDownloadLinkMutation();

  const canConnect = Boolean(conn.host.trim() && conn.username.trim() && conn.password.trim());

  const handleList = async () => {
    if (!canConnect) return;
    try {
      const result = await listRemote(conn).unwrap();
      setRemoteFiles(result);
      setHasListed(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to list the remote /tmp directory."));
    }
  };

  const handleUploadChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canConnect) {
      toast.error("Enter the host, username and password before uploading.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const result = await uploadRemote({ ...conn, file }).unwrap();
      setRemoteFiles(result);
      setHasListed(true);
      toast.success(`${file.name} uploaded to ${conn.host}:/tmp`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to upload ${file.name} to the remote server.`));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (fileName: string) => {
    setDownloadingFile(fileName);
    try {
      // The browser streams the file straight to disk from this link, so
      // 2 GB+ files work and progress shows in its downloads bar.
      const link = await createDownloadLink({ ...conn, fileName }).unwrap();
      startBrowserDownload(link.url);
      toast.info(`Downloading ${fileName} — track it in your browser's downloads.`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to download ${fileName} from the remote server.`));
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!window.confirm(`Delete "${fileName}" from ${conn.host}:/tmp? This cannot be undone.`)) return;
    setDeletingFile(fileName);
    try {
      const result = await deleteRemote({ ...conn, fileName }).unwrap();
      setRemoteFiles(result);
      toast.success(`${fileName} deleted from ${conn.host}:/tmp`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${fileName} from the remote server.`));
    } finally {
      setDeletingFile(null);
    }
  };

  const visibleFiles = (remoteFiles ?? []).filter((f) => !f.directory);

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <FolderOpenIcon fontSize="small" color="action" />
        <Typography variant="h6" fontWeight={600}>
          Remote /tmp Directory
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect to a remote Linux server to view, download, upload, or delete files directly in its <code>/tmp</code>{" "}
        directory — no local staging required. These credentials are used for this connection only and are never stored.
      </Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Host / IP Address"
            fullWidth
            required
            value={conn.host}
            onChange={(e) => setConn((c) => ({ ...c, host: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            label="Port"
            type="number"
            fullWidth
            value={conn.port ?? 22}
            onChange={(e) => setConn((c) => ({ ...c, port: Number(e.target.value) || 22 }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Username"
            fullWidth
            required
            value={conn.username}
            onChange={(e) => setConn((c) => ({ ...c, username: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            label="Password"
            fullWidth
            required
            type={showPassword ? "text" : "password"}
            value={conn.password}
            onChange={(e) => setConn((c) => ({ ...c, password: e.target.value }))}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 2 }}>
        <input ref={fileInputRef} type="file" hidden onChange={handleUploadChosen} />
        <Button
          variant="outlined"
          startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          disabled={!canConnect || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Uploading..." : "Upload Directly to /tmp"}
        </Button>
        <Button
          variant="contained"
          startIcon={isListing ? <CircularProgress size={16} color="inherit" /> : <FolderOpenIcon />}
          disabled={!canConnect || isListing}
          onClick={handleList}
        >
          {isListing ? "Connecting..." : hasListed ? "Refresh List" : "Connect & List Files"}
        </Button>
      </Box>

      {hasListed && (
        <Box sx={{ mt: 2 }}>
          {visibleFiles.length === 0 ? (
            <Alert severity="info">No files found in /tmp on {conn.host}.</Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Modified</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Refresh list">
                        <span>
                          <IconButton size="small" onClick={handleList} disabled={isListing}>
                            {isListing ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleFiles.map((f) => (
                    <TableRow key={f.fileName} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <InsertDriveFileOutlinedIcon fontSize="small" color="action" />
                          <Typography noWrap title={f.fileName} sx={{ maxWidth: 320 }}>
                            {f.fileName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{f.fileSize}</TableCell>
                      <TableCell>{f.fileDate}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                          <Tooltip title="Download">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(f.fileName)}
                                disabled={downloadingFile === f.fileName}
                              >
                                {downloadingFile === f.fileName ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <CloudDownloadIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(f.fileName)}
                                disabled={deletingFile === f.fileName}
                              >
                                {deletingFile === f.fileName ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <DeleteOutlineIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
