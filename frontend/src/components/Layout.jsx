import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon, CloudArrowUpIcon, DocumentMagnifyingGlassIcon,
  UsersIcon, ChartBarIcon, ArrowRightOnRectangleIcon,
  SunIcon, MoonIcon, Bars3Icon, XMarkIcon, BellIcon,
  DocumentCheckIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useAuthStore, useThemeStore } from '../store/authStore';
import toast from 'react-hot-toast';

const navByRole = {
  admin: [
    { label: 'Dashboard', icon: HomeIcon, href: '/admin' },
    { label: 'Upload GSTR2B', icon: CloudArrowUpIcon, href: '/admin' },
    { label: 'User Management', icon: UsersIcon, href: '/admin' },
    { label: 'Analytics', icon: ChartBarIcon, href: '/admin' }
  ],
  client: [
    { label: 'Dashboard', icon: HomeIcon, href: '/client' },
    { label: 'Upload Purchase', icon: CloudArrowUpIcon, href: '/client' },
    { label: 'My Results', icon: DocumentMagnifyingGlassIcon, href: '/client' }
  ],
  officer: [
    { label: 'Dashboard', icon: HomeIcon, href: '/officer' },
    { label: 'Matched Records', icon: DocumentCheckIcon, href: '/officer' },
    { label: 'All Reconciliations', icon: ShieldCheckIcon, href: '/officer' }
  ]
};

const roleColors = {
  admin: 'from-violet-600 to-purple-600',
  client: 'from-brand-500 to-indigo-600',
  officer: 'from-emerald-500 to-teal-600'
};

const roleBadge = {
  admin: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
  client: 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400',
  officer: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = navByRole[user?.role] || [];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[user?.role]} flex items-center justify-center shadow-glow-sm flex-shrink-0`}>
            <DocumentCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-display font-bold text-slate-900 dark:text-white leading-tight">GST Pro</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reconciliation System</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColors[user?.role]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge[user?.role]}`}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>
        {user?.company && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 truncate">{user.company}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Menu</p>
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className="nav-item nav-item-active group"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button onClick={toggle} className="nav-item w-full">
          {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={handleLogout} className="nav-item w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl lg:hidden"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 lg:hidden">
              <Bars3Icon className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-display font-bold text-slate-900 dark:text-white">
                GST Reconciliation System Pro
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'officer' ? 'Officer Panel' : 'Client Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost p-2.5 rounded-xl">
              {isDark ? <SunIcon className="w-5 h-5 text-amber-500" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button className="btn-ghost p-2.5 rounded-xl relative">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
            </button>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColors[user?.role]} flex items-center justify-center text-white font-bold text-sm`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <motion.div
            key="page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 lg:p-6 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
