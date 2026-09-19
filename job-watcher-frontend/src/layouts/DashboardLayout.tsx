import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Briefcase, 
  Bell, 
  Activity, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export const DashboardLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  interface NavItem {
    name: string;
    path: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  }

  const primaryNavItems: NavItem[] = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { name: 'Watch Profiles', path: '/dashboard/watch-profiles', icon: Search },
    { name: 'Jobs', path: '/dashboard/jobs', icon: Briefcase },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
    { name: 'Scans', path: '/dashboard/scans', icon: Activity },
  ];

  const secondaryNavItems: NavItem[] = [
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  // Derive initials from email
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  // Format page title for top bar breadcrumb
  const currentNav = [...primaryNavItems, ...secondaryNavItems].find(item => 
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );
  const currentTitle = currentNav?.name || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Global subtle spatial background lighting & grid */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-radial-ambient" />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm shadow-cyan-500/30">
              <Activity className="h-4 w-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-mono text-sm font-bold tracking-tight text-white block leading-none">
                Job Watcher
              </span>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 font-semibold uppercase block mt-0.5">
                CAREER MONITORING
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="px-3 pt-5 pb-2">
          <div className="px-3 mb-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
            OPERATIONS
          </div>
          <nav className="space-y-1">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150',
                    isActive
                      ? 'bg-slate-900 border border-cyan-500/30 text-white shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active left indicator pill */}
                    {isActive && (
                      <span className="absolute left-1.5 h-3.5 w-1 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
                    )}
                    <item.icon
                      className={cn(
                        'mr-3 h-4 w-4 flex-shrink-0 transition-colors ml-1.5',
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div className="px-3 pt-4 pb-2">
          <div className="px-3 mb-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
            SYSTEM
          </div>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150',
                    isActive
                      ? 'bg-slate-900 border border-cyan-500/30 text-white shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-1.5 h-3.5 w-1 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
                    )}
                    <item.icon
                      className={cn(
                        'mr-3 h-4 w-4 flex-shrink-0 transition-colors ml-1.5',
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Account / Footer Area */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="rounded-xl border border-slate-850 bg-slate-900/60 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/30 font-mono text-xs font-bold text-cyan-300">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-slate-200 font-sans">
                  {user?.email || 'Authenticated User'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400">ONLINE</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/20 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-850 hover:bg-slate-900"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="hidden sm:inline hover:text-slate-300">Console</span>
              <ChevronRight className="h-3 w-3 text-slate-600 hidden sm:inline" />
              <span className="text-slate-200 font-medium">{currentTitle}</span>
            </div>
          </div>

          {/* Operational Status Pill */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-mono text-emerald-300 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ENGINE ACTIVE</span>
              <span className="sm:hidden">ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
