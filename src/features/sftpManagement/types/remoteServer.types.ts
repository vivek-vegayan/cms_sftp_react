// Types for the "Servers" tab — remote servers (36, 37, ...) configured on the backend.
// The UI never sees credentials: it names a server id, a root (folder) id and a
// path relative to that root.

export interface RemoteRoot {
  id: string;
  label: string;
  /** Display only, e.g. "C:/apache-tomcat/logs". */
  path: string;
  /** Writable roots allow delete; log roots are read-only. */
  writable: boolean;
}

export interface RemoteServer {
  id: string;
  name: string;
  host: string;
  roots: RemoteRoot[];
}

export interface RemoteEntry {
  name: string;
  directory: boolean;
  size: number;
  /** Epoch millis. */
  modified: number;
}

export interface DirectoryListing {
  serverId: string;
  rootId: string;
  path: string;
  entries: RemoteEntry[];
  truncated: boolean;
}

/** Identifies a folder or file: server + root + path relative to the root. */
export interface RemoteLocation {
  serverId: string;
  root: string;
  path: string;
}

export interface FileChunk {
  path: string;
  fileSize: number;
  modified: number;
  /** Byte range [start, end) of the file this text covers. */
  start: number;
  end: number;
  text: string;
  /** File was rotated/truncated or jumped ahead — replace the view instead of appending. */
  reset: boolean;
}

export interface ReadChunkArgs extends RemoteLocation {
  before?: number;
  from?: number;
  maxBytes?: number;
}

export interface DownloadLink {
  url: string;
  fileName: string;
  expiresAt: number;
}
