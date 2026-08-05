import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { realApi } from '../api/realApi';
import { demoApi } from '../api/demoApi';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  // The off-canvas drawer that holds the sidebar + nav on narrow
  // screens (see MobileMenu.jsx) - lives here rather than in Navbar
  // since the hamburger button that opens it and the drawer itself are
  // rendered by different components.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const signInWithGoogle = useCallback(async (credential) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error('Sign-in failed');
    const me = await res.json();
    setUser(me);
    setDemoMode(false);
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const startDemo = useCallback(() => setDemoMode(true), []);
  const exitDemo = useCallback(() => setDemoMode(false), []);

  const api = demoMode ? demoApi : realApi;

  const value = useMemo(
    () => ({
      user,
      authLoading,
      demoMode,
      signInWithGoogle,
      signOut,
      startDemo,
      exitDemo,
      api,
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
    }),
    [user, authLoading, demoMode, signInWithGoogle, signOut, startDemo, exitDemo, api, mobileMenuOpen, toggleMobileMenu, closeMobileMenu]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
