import { NavLink, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  LayoutDashboard, FileText, BarChart3, Ship, Users, Settings, LogOut,
  DollarSign, FolderOpen, ChevronRight, Building2, ShoppingCart, Handshake,
  CalendarDays, Calculator, PanelLeftClose, PanelLeft, Wheat
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

const partnerSubItems = [
  { title: 'All Counterparties', href: '/partners', icon: Users },
  { title: 'Sellers', href: '/partners/sellers', icon: Building2 },
  { title: 'Buyers', href: '/partners/buyers', icon: ShoppingCart },
  { title: 'Co-Brokers', href: '/partners/co-brokers', icon: Handshake },
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
        'fixed left-0 top-0 h-screen flex flex-col z-50 bg-white border-r border-slate-200 transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[250px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-3 py-3 border-b border-slate-200">
        {collapsed ? (
          <img src="/pir-logo.jpg" alt="PIR" className="w-10 h-10 object-contain" />
        ) : (
          <div className="flex items-end gap-2.5">
            <img src="/pir-logo.jpg" alt="PIR Grain and Pulses" className="h-12 w-auto object-contain flex-shrink-0" />
            <div>
              <h1 className="text-[13px] font-bold tracking-wide leading-tight" style={{ color: PIR_GREEN }}>PIR GRAIN & PULSES</h1>
              <p className="text-[9px] text-slate-400 tracking-wider leading-tight text-center">TRADING DASHBOARD</p>
            </div>
          </div>
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
              isActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {/* Counterparties */}
        <div>
          <button
            data-testid="sidebar-nav-counterparties-link"
            onClick={() => setPartnersOpen(!partnersOpen)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full transition-colors',
              isPartnerActive ? 'bg-[#1B7A3D]/10 text-[#1B7A3D] font-medium' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Counterparties</span>
                <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', partnersOpen && 'rotate-90')} />
              </>
            )}
          </button>
          {!collapsed && partnersOpen && (
            <div className="ml-5 pl-3 border-l border-slate-200 mt-0.5 space-y-0.5">
              {partnerSubItems.map((sub) => (
                <NavLink
                  key={sub.href}
                  to={sub.href}
                  end={sub.href === '/partners'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors',
                    isActive ? 'text-[#1B7A3D] font-medium bg-[#1B7A3D]/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <sub.icon className="w-3.5 h-3.5" />
                  <span>{sub.title}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-slate-200 space-y-0.5">
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
          onClick={logout}
          data-testid="sidebar-logout-button"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
