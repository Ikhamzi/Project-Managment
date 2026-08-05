import { Routes, Route } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Welcome from './pages/Welcome.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StatsPage from './pages/StatsPage.jsx';
import McpAuthorize from './pages/McpAuthorize.jsx';

export default function App() {
  const { user, authLoading, demoMode } = useApp();

  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/mcp-authorize" element={<McpAuthorize />} />
        <Route
          path="*"
          element={
            authLoading ? (
              <div className="flex h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-400">Loading…</p>
              </div>
            ) : (
              <>
                <Navbar />
                {Boolean(user) || demoMode ? (
                  <Routes>
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="*" element={<Dashboard />} />
                  </Routes>
                ) : (
                  <Welcome />
                )}
              </>
            )
          }
        />
      </Routes>
    </div>
  );
}
