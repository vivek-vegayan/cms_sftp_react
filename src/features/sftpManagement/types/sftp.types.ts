// Shared types for the SFTP Management module (Windows + Linux tabs).

/** A single file entry as returned by the Windows or local-Linux list endpoints. */
export interface SftpFileEntry {
  fileName: string;
  fileDate: string;
  fileSize: string;
}

/** A single entry from the remote Linux server's /tmp directory listing. */
export interface RemoteFileEntry extends SftpFileEntry {
  directory: boolean;
}

/** Credentials for the target Linux server — sent per-request, never persisted. */
export interface SftpConnectionDetails {
  host: string;
  port?: number;
  username: string;
  password: string;
}

/** "Send to Linux Server" / "Download from remote /tmp" request. */
export interface SendToLinuxRequest extends SftpConnectionDetails {
  fileName: string;
}

export interface UploadFileArgs {
  file: File;
  replace?: boolean;
}

/** "Upload direct to remote /tmp" request — skips local staging entirely. */
export interface UploadToLinuxRemoteRequest extends SftpConnectionDetails {
  file: File;
}
