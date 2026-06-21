import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DebugLogPanel from "./components/DebugLogPanel";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <DebugLogPanel />
    </BrowserRouter>
  );
}
