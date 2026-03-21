import { NavLink, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  LayoutDashboard, FileText, BarChart3, Ship, Users, Settings, Sun, Moon,
  DollarSign, FolderOpen, CalendarDays, Calculator, PanelLeftClose, PanelLeft, Wheat
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';

const PIR_GREEN = '#1B7A3D';
const PIR_GREEN_LIGHT = 'rgba(27, 122, 61, 0.08)';
const PIR_GREEN_ACTIVE = 'rgba(27, 122, 61, 0.14)';

const mainNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Trades', href: '/trades', icon: FileText },
  { title: 'Brokerage Inv.', href: '/commissions', icon: DollarSign },
  { title: 'Shipment Docs.', href: '/documents', icon: FolderOpen },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Accounting', href: '/omega', icon: Calculator },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Vessels', href: '/vessels', icon: Ship },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const location = useLocation();
  const { user } = useAuth();

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

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-50 bg-card border-r border-border transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[250px]'
      )}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {collapsed ? (
          <button onClick={toggleCollapse} className="mx-auto hover:opacity-80 transition-opacity" data-testid="sidebar-expand-button">
            <PanelLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <>
            <div className="flex items-end gap-2.5">
              <img src="/pir-logo.jpg" alt="PIR Grain and Pulses" className="h-12 w-auto object-contain flex-shrink-0" />
              <div>
                <h1 className="text-[13px] font-bold tracking-wide leading-tight" style={{ color: PIR_GREEN }}>PIR GRAIN & PULSES</h1>
                <p className="text-[9px] text-muted-foreground tracking-wider leading-tight text-center">TRADING DASHBOARD</p>
              </div>
            </div>
            <button onClick={toggleCollapse} className="hover:bg-muted rounded-md p-1 transition-colors" data-testid="sidebar-collapse-button">
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            data-testid={`sidebar-nav-${item.title.toLowerCase().replace(/[\s.]+/g, '-')}-link`}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {/* Counterparties - single link, tabs inside the page */}
        <NavLink
          to="/partners"
          data-testid="sidebar-nav-counterparties-link"
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Counterparties</span>}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-border space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <button
          onClick={toggleDarkMode}
          data-testid="sidebar-theme-toggle"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted w-full transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </aside>
  );
}
