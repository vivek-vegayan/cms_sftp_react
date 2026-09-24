import { useRef, useState, type ReactNode } from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Tooltip,
  useTheme,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { toast } from "react-toastify";
import type { SftpFileEntry } from "../types/sftp.types";

interface FileManagerPanelProps {
  title: string;
  subtitle?: string;
  files: SftpFileEntry[] | undefined;
  isLoading: boolean;
  isFetching?: boolean;
  onRefresh: () => void;
  isUploading: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onDownload: (fileName: string) => Promise<unknown>;
  onDelete: (fileName: string) => Promise<unknown>;
  /** Extra icon button(s) rendered before Download/Delete on each row (e.g. "Send to Linux Server"). */
  renderRowAction?: (fileName: string) => ReactNode;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message?: unknown }).message ?? fallback);
  }
  return fallback;
};

export default function FileManagerPanel({
  title,
  subtitle,
  files,
  isLoading,
  isFetching,
  onRefresh,
  isUploading,
  onUpload,
  onDownload,
  onDelete,
  renderRowAction,
}: FileManagerPanelProps) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onUpload(file);
      toast.success(`${file.name} uploaded successfully.`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to upload ${file.name}.`));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (fileName: string) => {
    setDownloadingFile(fileName);
    try {
      await onDownload(fileName);
      toast.success(`${fileName} downloaded successfully.`);
    } catch {
      toast.error(`Failed to download ${fileName}.`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeletingFile(fileName);
    try {
      await onDelete(fileName);
      toast.success(`${fileName} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${fileName}.`));
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title="Refresh list">
            <span>
              <IconButton onClick={onRefresh} disabled={isFetching}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileChosen} />
          <Button
            variant="contained"
            startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Modified</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} sx={{ my: 3 }} />
                </TableCell>
              </TableRow>
            ) : !files || files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No files found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              files.map((f) => (
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
                      {renderRowAction?.(f.fileName)}
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
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
