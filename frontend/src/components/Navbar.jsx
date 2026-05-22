import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import GlobalTimer from "./GlobalTimer";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function Navbar() {
  const { user, logout, isFreelancer } = useAuth();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      try {
        const data = await api("/api/network/pending-invites");
        setPendingCount(data.length);
      } catch {}
    };
    fetchPending();
    const iv = setInterval(fetchPending, 15000);
    return () => clearInterval(iv);
  }, [user]);

  if (!user) return null;

  const navLinks = (
    <>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Dashboard</Link>
      <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Projects</Link>
      <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Tasks</Link>
      <Link to="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Messages</Link>
      <Link to="/chat/general" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>General Chat</Link>
      <div className="relative inline-flex items-center">
        <Link to="/network" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Network</Link>
        {pendingCount > 0 && (
          <span className="absolute -top-2 -right-4 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {pendingCount}
          </span>
        )}
      </div>
      {isFreelancer && (
        <Link to="/invoices" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Invoices</Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          to="/dashboard"
          className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          JKAAS
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <GlobalTimer />
        <button
          onClick={toggle}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 hidden sm:block"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
        <button onClick={logout} className="text-sm text-destructive hover:text-destructive/80 transition-colors hidden sm:block">Logout</button>
        <button
          className="md:hidden text-muted-foreground hover:text-foreground p-1"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar border-r">
          <div className="p-4 space-y-4">
            <Link
              to="/dashboard"
              className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 block mb-4"
              onClick={() => setMobileOpen(false)}
            >
              JKAAS
            </Link>
            <div className="flex flex-col gap-3">
              {navLinks}
            </div>
            <hr className="border-border" />
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <span className="text-sm text-muted-foreground">{user.name}</span>
            </div>
            <button onClick={logout} className="text-sm text-destructive hover:text-destructive/80 transition-colors">Logout</button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
