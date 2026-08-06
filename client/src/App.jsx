import { Routes, Route } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import MobileMenu from './components/MobileMenu.jsx';
import Welcome from './pages/Welcome.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StatsPage from './pages/StatsPage.jsx';
import McpAuthorize from './pages/McpAuthorize.jsx';

export default function App() {
  const { user, authLoading, demoMode } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 md:flex md:h-screen md:flex-col md:overflow-hidden">
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
                <MobileMenu />
                {/* Desktop only: bounds the routed page below the navbar so it
                    can manage its own internal scroll (see Dashboard.jsx) instead
                    of the whole page scrolling. Mobile is untouched. */}
                <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                  {Boolean(user) || demoMode ? (
                    <Routes>
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="*" element={<Dashboard />} />
                    </Routes>
                  ) : (
                    <Welcome />
                  )}
                </div>
              </>
            )
          }
        />
      </Routes>
    </div>
  );
}
