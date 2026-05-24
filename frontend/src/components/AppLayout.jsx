import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";
import GlobalTimer from "./GlobalTimer";
import NotificationDropdown from "./NotificationDropdown";
import {
  LayoutDashboard, FolderKanban, ListChecks, MessageSquare, FileText, Users,
  ChevronLeft, ChevronRight, Sun, Moon, LogOut, Menu, User,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const sidebarLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/chat", label: "Messages", icon: MessageSquare },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/network", label: "Network", icon: Users },
];

const pageTitles = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/chat": "Messages",
  "/chat/general": "General Chat",
  "/invoices": "Invoices",
  "/network": "Network",
};

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout, isFreelancer } = useAuth();
  const { dark, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
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

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] || "JKAAS";
  const currentPath = "/" + pathname.split("/").filter(Boolean)[0];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between">
        <Link to="/dashboard" className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0">
          {collapsed ? "J" : "JKAAS"}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1">
        {sidebarLinks.map((link) => {
          if (link.to === "/invoices" && !isFreelancer) return null;
          const isActive = currentPath === link.to || (link.to !== "/" && pathname.startsWith(link.to));
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <link.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
              {!collapsed && link.to === "/network" && pendingCount > 0 && (
                <span className="ml-auto w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed-only mini icons */}
      {collapsed && pendingCount > 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-center">
            <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          </div>
        </div>
      )}

      {/* Logout at bottom of sidebar */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border/50 bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar border-r p-0">
          <div className="p-4">
            <Link
              to="/dashboard"
              className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 block mb-4"
              onClick={() => setMobileOpen(false)}
            >
              JKAAS
            </Link>
          </div>
          <div className="flex flex-col gap-1 px-3">
            {sidebarLinks.map((link) => {
              if (link.to === "/invoices" && !isFreelancer) return null;
              const isActive = currentPath === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <link.icon size={18} className="shrink-0" />
                  <span className="truncate">{link.label}</span>
                  {link.to === "/network" && pendingCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="p-3 mt-auto border-t border-border/50">
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground p-1"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-medium">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isFreelancer && <GlobalTimer />}
            <button
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 hover:opacity-90 transition-opacity">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">{user?.email}</div>
                <DropdownMenuItem asChild>
                  <Link to="/account" className="gap-2 cursor-pointer">
                    <User size={14} /> My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive gap-2">
                  <LogOut size={14} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
