import { api } from "../../../service/api";
import type {
  RemoteFileEntry,
  SendToLinuxRequest,
  SftpConnectionDetails,
  SftpFileEntry,
  UploadFileArgs,
  UploadToLinuxRemoteRequest,
} from "../types/sftp.types";

const buildUploadFormData = ({ file, replace }: UploadFileArgs) => {
  const formData = new FormData();
  formData.append("file", file);
  return { formData, replace: replace ?? false };
};

export const sftpApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ───────────────────────── Windows module ─────────────────────────
    // Existing backend endpoints under /api/sftpfromui — untouched, only consumed here.
    getWindowsFiles: builder.query<SftpFileEntry[], void>({
      query: () => "/api/sftpfromui/list",
      providesTags: ["SftpWindowsFiles"],
    }),
    uploadWindowsFile: builder.mutation<string, UploadFileArgs>({
      query: (args) => {
        const { formData, replace } = buildUploadFormData(args);
        return {
          url: `/api/sftpfromui/upload?replace=${replace}`,
          method: "POST",
          body: formData,
          responseHandler: "text",
        };
      },
      invalidatesTags: ["SftpWindowsFiles"],
    }),
    deleteWindowsFile: builder.mutation<string, string>({
      query: (fileName) => ({
        url: `/api/sftpfromui/delete/${encodeURIComponent(fileName)}`,
        method: "DELETE",
        responseHandler: "text",
      }),
      invalidatesTags: ["SftpWindowsFiles"],
    }),
    downloadWindowsFile: builder.query<Blob, string>({
      query: (fileName) => ({
        url: `/api/sftpfromui/download/${encodeURIComponent(fileName)}`,
        method: "GET",
        responseHandler: (response: Response) => response.blob(),
        cache: "no-cache",
      }),
    }),

    // ───────────────────────── Linux module (remote server over SFTP) ─────────────────────────
    // Every call carries the target host's connection details in the body (never a query
    // string) and the backend opens a fresh SFTP session per call — nothing is cached
    // server-side, so these are plain mutations rather than cacheable queries.
    listLinuxRemoteFiles: builder.mutation<RemoteFileEntry[], SftpConnectionDetails>({
      query: (body) => ({
        url: "/api/sftp/linux/remote/list",
        method: "POST",
        body,
      }),
    }),
    // Multipart (not JSON) because it carries the file's bytes — connection
    // details ride along as form fields alongside the file part.
    uploadFileToLinuxRemote: builder.mutation<RemoteFileEntry[], UploadToLinuxRemoteRequest>({
      query: ({ file, host, port, username, password }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("host", host);
        formData.append("port", String(port ?? 22));
        formData.append("username", username);
        formData.append("password", password);
        return {
          url: "/api/sftp/linux/remote/upload",
          method: "POST",
          body: formData,
        };
      },
    }),
    // Returns a short-lived link the browser opens itself, so the file streams
    // straight to disk (a Blob would hold it all in memory and fail at 2 GB+).
    createLinuxDownloadLink: builder.mutation<{ url: string; fileName: string; size: number }, SendToLinuxRequest>({
      query: (body) => ({
        url: "/api/sftp/linux/remote/download-link",
        method: "POST",
        body,
      }),
    }),
    deleteLinuxRemoteFile: builder.mutation<RemoteFileEntry[], SendToLinuxRequest>({
      query: (body) => ({
        url: "/api/sftp/linux/remote/delete",
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetWindowsFilesQuery,
  useUploadWindowsFileMutation,
  useDeleteWindowsFileMutation,
  useLazyDownloadWindowsFileQuery,

  useListLinuxRemoteFilesMutation,
  useUploadFileToLinuxRemoteMutation,
  useCreateLinuxDownloadLinkMutation,
  useDeleteLinuxRemoteFileMutation,
} = sftpApi;
