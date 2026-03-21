import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import { Bell, LogOut, ChevronDown, CheckCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function AppLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebar-collapse', handler);
    return () => window.removeEventListener('sidebar-collapse', handler);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchNotifications]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const nameParts = (user?.name || user?.fullName || 'User').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '');

  const PAGE_TITLES = {
    '/': { title: 'Dashboard', subtitle: 'Welcome back! Here is your trading overview.' },
    '/trades': { title: 'Trades', subtitle: 'Manage your commodity trades' },
    '/partners': { title: 'Counterparties', subtitle: 'Manage your trading partners' },
    '/vessels': { title: 'Vessels', subtitle: 'Manage your fleet of vessels' },
    '/documents': { title: 'Shipment Docs.', subtitle: 'Manage shipment documents' },
    '/calendar': { title: 'Calendar', subtitle: 'Events, meetings, and deadlines' },
    '/omega': { title: 'Omega — Accounting', subtitle: 'Invoices, expenses, and bank statements' },
    '/reports': { title: 'Reports', subtitle: 'Analytics and reporting' },
    '/commissions': { title: 'Brokerage Inv.', subtitle: 'Manage brokerage invoices' },
    '/settings': { title: 'Settings', subtitle: 'System configuration' },
  };
  const currentPage = PAGE_TITLES[location.pathname] || { title: '', subtitle: '' };

  const unreadCount = notifications.filter(n => !(n.readBy || []).includes(user?.username)).length;

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      fetchNotifications();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'ml-[60px]' : 'ml-[250px]')}>
        {/* Header Bar */}
        <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4 sticky top-0 z-40">
          <div className="flex-1" />

          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="header-notifications-button">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                    <CheckCheck className="h-3 w-3 mr-1" />Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-[300px]">
                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.slice(0, 20).map(n => {
                    const isRead = (n.readBy || []).includes(user?.username);
                    return (
                      <DropdownMenuItem key={n.id} className={cn('flex flex-col items-start gap-0.5 px-3 py-2 cursor-default', !isRead && 'bg-primary/5')}>
                        <span className={cn('text-sm', !isRead && 'font-medium')}>{n.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {n.username && n.username !== 'system' && <span className="font-medium">{n.username} · </span>}
                          {n.createdAt ? (() => { try { return formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true }); } catch { return ''; }})() : ''}
                        </span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer outline-none" data-testid="header-user-menu">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-semibold text-sm">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none text-foreground">{firstName}</p>
                  <p className="text-xs text-muted-foreground">{lastName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer" data-testid="header-logout-button">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
