import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  BarChart3, ShoppingCart, Building2, Ship, FolderOpen,
  CalendarDays, DollarSign, FileText, Settings, ChevronDown,
  ChevronRight, PanelLeftClose, PanelLeft, Wheat, Users, LogOut
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';

const mainNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { title: 'Trades', href: '/trades', icon: ShoppingCart },
];

const partnerSubItems = [
  { title: 'All Counterparties', href: '/partners' },
  { title: 'Buyers', href: '/partners/buyers' },
  { title: 'Sellers', href: '/partners/sellers' },
  { title: 'Co-Brokers', href: '/partners/co-brokers' },
];

const operationsNavItems = [
  { title: 'Vessels', href: '/vessels', icon: Ship },
  { title: 'Shipment Docs.', href: '/documents', icon: FolderOpen },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Brokerage Inv.', href: '/commissions', icon: DollarSign },
  { title: 'Reports', href: '/reports', icon: FileText },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isPartnerActive = location.pathname.startsWith('/partners');

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        'sidebar fixed left-0 top-0 h-screen flex flex-col z-50',
        collapsed ? 'w-[76px]' : 'w-[264px]'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
          <Wheat className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">PIR GRAIN & PULSES</h1>
            <p className="text-[10px] text-white/50">Trading Dashboard</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            data-testid={`sidebar-nav-${item.title.toLowerCase()}-link`}
            className={({ isActive }) =>
              cn('sidebar-nav-item', isActive && 'active')
            }
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {/* Partners (collapsible) */}
        <div>
          <button
            data-testid="sidebar-nav-partners-link"
            onClick={() => setPartnersOpen(!partnersOpen)}
            className={cn(
              'sidebar-nav-item w-full justify-between',
              isPartnerActive && 'active'
            )}
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>Counterparties</span>}
            </div>
            {!collapsed && (
              partnersOpen
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {!collapsed && partnersOpen && (
            <div className="ml-8 mt-1 space-y-0.5">
              {partnerSubItems.map((sub) => (
                <NavLink
                  key={sub.href}
                  to={sub.href}
                  end={sub.href === '/partners'}
                  className={({ isActive }) =>
                    cn(
                      'block py-1.5 px-3 text-[13px] rounded-md transition-colors',
                      isActive
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                    )
                  }
                >
                  {sub.title}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {operationsNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            data-testid={`sidebar-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}-link`}
            className={({ isActive }) =>
              cn('sidebar-nav-item', isActive && 'active')
            }
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn('sidebar-nav-item', isActive && 'active')
          }
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* User info */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-semibold text-white">
              {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.fullName || user.username}</p>
              <p className="text-[10px] text-white/50 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-white/50 hover:text-white transition-colors"
              data-testid="sidebar-logout-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          data-testid="sidebar-toggle-button"
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-nav-item w-full"
        >
          {collapsed ? (
            <PanelLeft className="w-[18px] h-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
