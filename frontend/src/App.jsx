import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import UploadPage from "./pages/UploadPage";
import OverviewPage from "./pages/OverviewPage";
import SearchPage from "./pages/SearchPage";
import FindByIdPage from "./pages/FindByIdPage";
import AddRecordPage from "./pages/AddRecordPage";
import EditRecordPage from "./pages/EditRecordPage";
import DeletePage from "./pages/DeletePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ExportPage from "./pages/ExportPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/find" element={<FindByIdPage />} />
        <Route path="/add" element={<AddRecordPage />} />
        <Route path="/edit" element={<EditRecordPage />} />
        <Route path="/delete" element={<DeletePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Route>
    </Routes>
  );
}
