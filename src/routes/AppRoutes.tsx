import { lazy, type JSX } from "react";
import { Navigate, Route, Routes } from "react-router";
import { PrivateRoute } from "./PrivateRoute";

const SftpManagementMainPageTab = lazy(() =>
  import("../features/sftpManagement").then((m) => ({
    default: m.SftpManagementMainPageTab,
  })),
);
const WindowsSftpPage = lazy(() =>
  import("../features/sftpManagement").then((m) => ({
    default: m.WindowsSftpPage,
  })),
);
const LinuxSftpPage = lazy(() =>
  import("../features/sftpManagement").then((m) => ({
    default: m.LinuxSftpPage,
  })),
);
const ServersPage = lazy(() =>
  import("../features/sftpManagement").then((m) => ({
    default: m.ServersPage,
  })),
);

interface AppRoutesProps {
  setDynamicHeaderText: (text: string) => void;
  setDynamicHeaderIcon: (icon: JSX.Element) => void;
}

// Same /sftp-management/{windows,linux} paths the module had inside
// airtelcms_react, so its hand-off links map one-to-one.
export default function AppRoutes({ setDynamicHeaderText, setDynamicHeaderIcon }: AppRoutesProps) {
  return (
    <Routes>
      <Route index element={<Navigate to="sftp-management/windows" replace />} />
      <Route
        path="sftp-management"
        element={
          <PrivateRoute
            element={
              <SftpManagementMainPageTab
                setDynamicHeaderText={setDynamicHeaderText}
                setDynamicHeaderIcon={setDynamicHeaderIcon}
              />
            }
          />
        }
      >
        <Route index element={<Navigate to="windows" replace />} />
        <Route path="windows" element={<WindowsSftpPage />} />
        <Route path="linux" element={<LinuxSftpPage />} />
        <Route path="servers" element={<ServersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/sftp-management/windows" replace />} />
    </Routes>
  );
}
