import { useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Welcome from './pages/Welcome.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const { user, authLoading, demoMode } = useApp();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const signedIn = Boolean(user) || demoMode;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {signedIn ? <Dashboard /> : <Welcome />}
    </div>
  );
}
