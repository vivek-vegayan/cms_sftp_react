import CommonContainer from "../../../components/common/CommonContainer";
import FileManagerPanel from "../components/FileManagerPanel";
import {
  useGetWindowsFilesQuery,
  useUploadWindowsFileMutation,
  useDeleteWindowsFileMutation,
  useLazyDownloadWindowsFileQuery,
} from "../api/sftpApiSlice";

const triggerBrowserDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export default function WindowsSftpPage() {
  const { data: files, isLoading, isFetching, refetch } = useGetWindowsFilesQuery();
  const [uploadFile, { isLoading: isUploading }] = useUploadWindowsFileMutation();
  const [deleteFile] = useDeleteWindowsFileMutation();
  const [triggerDownload] = useLazyDownloadWindowsFileQuery();

  const handleDownload = async (fileName: string) => {
    const blob = await triggerDownload(fileName).unwrap();
    triggerBrowserDownload(blob, fileName);
  };

  return (
    <CommonContainer>
      <FileManagerPanel
        title="Windows File Manager"
        subtitle="Upload, list, download and delete files stored on this Windows server."
        files={files}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={refetch}
        isUploading={isUploading}
        onUpload={(file) => uploadFile({ file }).unwrap()}
        onDownload={handleDownload}
        onDelete={(fileName) => deleteFile(fileName).unwrap()}
      />
    </CommonContainer>
  );
}
