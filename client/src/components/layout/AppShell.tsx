import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Trophy, BarChart3, User, Search, Bell, Coffee, Settings, LogOut, Play, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/feed', icon: Play, label: 'Content', accent: true },
  { to: '/contests', icon: Trophy, label: 'Contests' },
  { to: '/leaderboard', icon: BarChart3, label: 'Board' },
  { to: '/profile', icon: User, label: 'Profile' },
] as const;

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
};

export function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-base-200 border-r border-base-300 fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-base-300">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Coffee className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Barista <span className="text-primary">Spotlight</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {navItems.map((item) => {
            const { to, icon: Icon, label } = item;
            const isAccent = 'accent' in item && item.accent;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isAccent && !isActive
                      ? 'text-warning hover:bg-warning/10 hover:text-warning'
                      : isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-base-content/60 hover:text-base-content hover:bg-base-300/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                    {label}
                    {isAccent && !isActive && (
                      <span className="ml-auto badge badge-warning badge-xs">NEW</span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          {/* Extra sidebar links */}
          <div className="mt-4 pt-4 border-t border-base-300/50">
            <NavLink
              to="/throwdown"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-warning hover:bg-warning/10 hover:text-warning'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Zap className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  Throwdown
                  {!isActive && (
                    <span className="ml-auto badge badge-warning badge-xs">NEW</span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-base-300 p-3 space-y-1">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-content/60 hover:text-base-content hover:bg-base-300/50 w-full transition-colors">
            <Settings className="h-5 w-5" />
            Settings
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-base-content/60 hover:text-error hover:bg-error/10 w-full transition-colors">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>

        {/* User card */}
        <div className="border-t border-base-300 p-4">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-primary/20 text-primary rounded-full w-9 h-9">
                <span className="text-sm font-bold">JS</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Jordan Silva</p>
              <p className="text-xs text-base-content/50 truncate">Barista</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="navbar bg-base-200/80 backdrop-blur-lg sticky top-0 z-40 border-b border-base-300">
          <div className="flex-1 lg:hidden">
            <a className="text-lg font-bold text-primary tracking-tight flex items-center gap-2" href="/">
              <Coffee className="h-5 w-5" />
              Barista Spotlight
            </a>
          </div>
          <div className="hidden lg:flex flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search baristas, contests..."
                className="input input-sm bg-base-300/50 border-base-300 pl-9 w-full focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex-none gap-1">
            <button className="btn btn-ghost btn-circle btn-sm lg:hidden touch-target" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
            <button className="btn btn-ghost btn-circle btn-sm touch-target relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
            </button>
          </div>
        </header>

        {/* Main content with page transitions */}
        <main className="flex-1 container mx-auto max-w-4xl px-4 pb-20 lg:pb-8 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              {...pageTransition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="btm-nav bg-base-200/80 backdrop-blur-lg border-t border-base-300 z-50 lg:hidden">
        {navItems.map((item) => {
          const { to, icon: Icon, label } = item;
          const isAccent = 'accent' in item && item.accent;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `touch-target flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'active text-primary' :
                  isAccent ? 'text-warning' :
                  'text-base-content/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={isAccent && !isActive ? 'bg-warning/15 rounded-lg p-1' : ''}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span className="btm-nav-label text-xs">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
