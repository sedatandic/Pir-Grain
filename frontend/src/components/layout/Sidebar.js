import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, BarChart3, Ship, Users, Settings, Sun, Moon,
  DollarSign, FolderOpen, CalendarDays, Calculator, PanelLeftClose, PanelLeft, Wheat, X
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const PIR_GREEN = '#1B7A3D';

const mainNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'user'] },
  { title: 'Trades', href: '/trades', icon: FileText, roles: ['admin', 'user'] },
  { title: 'Brokerage Inv.', href: '/commissions', icon: DollarSign, roles: ['admin', 'user'] },
  { title: 'Shipment Docs.', href: '/documents', icon: FolderOpen, roles: ['admin', 'user'] },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ['admin', 'user'] },
  { title: 'Accounting', href: '/omega', icon: Calculator, roles: ['admin', 'accountant'] },
  { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'user'] },
  { title: 'Vessels', href: '/vessels', icon: Ship, roles: ['admin', 'user'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'user'] },
    { title: 'Trades', href: '/trades', icon: FileText, roles: ['admin', 'user'] },
    { title: 'Brokerage Inv.', href: '/commissions', icon: DollarSign, roles: ['admin', 'user'] },
    { title: 'Shipment Docs.', href: '/documents', icon: FolderOpen, roles: ['admin', 'user'] },
    { title: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ['admin', 'user'] },
    { title: 'Accounting', href: '/omega', icon: Calculator, roles: ['admin', 'accountant'] },
    { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'user'] },
    { title: 'Vessels', href: '/vessels', icon: Ship, roles: ['admin', 'user'] },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Listen for mobile toggle events from AppLayout header
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Dispatch event so AppLayout can respond to collapse changes
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.dispatchEvent(new CustomEvent('sidebar-collapse', { detail: { collapsed: next } }));
  };

  const userRole = user?.role || 'user';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-mobile-overlay"
        />
      )}
      <aside
        data-testid="app-sidebar"
        className={cn(
          'fixed left-0 top-0 h-screen flex flex-col z-50 bg-card border-r border-border transition-all duration-200',
          collapsed ? 'w-[60px]' : 'w-[200px]',
          'max-md:w-[250px]',
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        )}
      >
      {/* Logo + Collapse Toggle */}
      <div className="flex items-center justify-center px-2 py-3 border-b border-border">
        {collapsed ? (
          <button onClick={toggleCollapse} className="mx-auto hover:opacity-80 transition-opacity max-md:hidden" data-testid="sidebar-expand-button">
            <PanelLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : null}
        <div className={cn('flex-1 flex justify-center', collapsed && 'max-md:flex md:hidden')}>
          <img src="/pir-logo-new.jpeg" alt="PIR Grain and Pulses" className="h-20 w-auto object-contain" />
        </div>
        {/* Desktop: collapse toggle */}
        {!collapsed && (
          <button onClick={toggleCollapse} className="hover:bg-muted rounded-md p-1 transition-colors hidden md:flex flex-shrink-0" data-testid="sidebar-collapse-button">
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {/* Mobile: close button */}
        <button onClick={() => setMobileOpen(false)} className="hover:bg-muted rounded-md p-1.5 transition-colors md:hidden flex-shrink-0" data-testid="sidebar-close-button">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <TooltipProvider delayDuration={0}>
        {navItems.filter(item => !item.roles || item.roles.includes(userRole)).map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
            <NavLink
              to={item.href}
              onClick={() => setMobileOpen(false)}
              data-testid={`sidebar-nav-${item.title.toLowerCase().replace(/[\s.]+/g, '-')}-link`}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
              {collapsed && <span className="md:hidden">{item.title}</span>}
            </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" className="hidden md:block">{item.title}</TooltipContent>}
          </Tooltip>
        ))}

        {/* Counterparties - single link, tabs inside the page */}
        {userRole !== 'accountant' && (
          <Tooltip>
            <TooltipTrigger asChild>
            <NavLink
              to="/partners"
              onClick={() => setMobileOpen(false)}
              data-testid="sidebar-nav-counterparties-link"
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Counterparties</span>}
              {collapsed && <span className="md:hidden">Counterparties</span>}
            </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" className="hidden md:block">Counterparties</TooltipContent>}
          </Tooltip>
        )}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-border space-y-0.5">
        <TooltipProvider delayDuration={0}>
        {userRole !== 'accountant' && (
          <Tooltip>
            <TooltipTrigger asChild>
            <NavLink
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Settings className="w-4 h-4" />
              {!collapsed && <span>Settings</span>}
              {collapsed && <span className="md:hidden">Settings</span>}
            </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" className="hidden md:block">Settings</TooltipContent>}
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
          <button
            onClick={() => { toggleDarkMode(); setMobileOpen(false); }}
            data-testid="sidebar-theme-toggle"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted w-full transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            {collapsed && <span className="md:hidden">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" className="hidden md:block">{darkMode ? 'Light Mode' : 'Dark Mode'}</TooltipContent>}
        </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
    </>
  );
}
