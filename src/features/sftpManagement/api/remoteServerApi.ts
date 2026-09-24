import { api } from "../../../service/api";
import type {
  DirectoryListing,
  DownloadLink,
  FileChunk,
  ReadChunkArgs,
  RemoteLocation,
  RemoteServer,
} from "../types/remoteServer.types";

const listingTag = ({ serverId, root, path }: RemoteLocation) => ({
  type: "RemoteListing" as const,
  id: `${serverId}|${root}|${path}`,
});

export const remoteServerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRemoteServers: builder.query<RemoteServer[], void>({
      query: () => "/api/remote/servers",
    }),

    listRemoteFolder: builder.query<DirectoryListing, RemoteLocation>({
      query: ({ serverId, root, path }) => ({
        url: `/api/remote/servers/${encodeURIComponent(serverId)}/files`,
        params: { root, path },
      }),
      providesTags: (_result, _error, arg) => [listingTag(arg)],
    }),

    // A mutation rather than a query: every call is a different byte range
    // that is appended to the viewer's own buffer, so caching would only waste memory.
    readRemoteFileChunk: builder.mutation<FileChunk, ReadChunkArgs>({
      query: ({ serverId, root, path, before, from, maxBytes }) => ({
        url: `/api/remote/servers/${encodeURIComponent(serverId)}/files/content`,
        params: { root, path, before, from, maxBytes },
      }),
    }),

    createRemoteDownloadLink: builder.mutation<DownloadLink, RemoteLocation>({
      query: ({ serverId, root, path }) => ({
        url: `/api/remote/servers/${encodeURIComponent(serverId)}/files/download-link`,
        method: "POST",
        body: { root, path },
      }),
    }),

    deleteRemoteFile: builder.mutation<void, RemoteLocation & { folder: string }>({
      query: ({ serverId, root, path }) => ({
        url: `/api/remote/servers/${encodeURIComponent(serverId)}/files`,
        method: "DELETE",
        params: { root, path },
      }),
      invalidatesTags: (_result, _error, { serverId, root, folder }) => [
        listingTag({ serverId, root, path: folder }),
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRemoteServersQuery,
  useListRemoteFolderQuery,
  useReadRemoteFileChunkMutation,
  useCreateRemoteDownloadLinkMutation,
  useDeleteRemoteFileMutation,
} = remoteServerApi;
