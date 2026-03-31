import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import { Bell, LogOut, ChevronDown, CheckCheck, Menu, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
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

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isAdmin, fetchNotifications]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Accountant can only access /omega (Accounting)
  if (user?.role === 'accountant' && location.pathname !== '/omega') {
    return <Navigate to="/omega" replace />;
  }

  const nameParts = (user?.name || user?.fullName || 'User').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '');

  const PAGE_TITLES = {
    '/': { title: 'Dashboard' },
    '/trades': { title: 'Contracts' },
    '/partners': { title: 'Counterparties' },
    '/vessels': { title: 'Vessels' },
    '/documents': { title: 'Vessel Execution' },
    '/calendar': { title: 'Calendar' },
    '/omega': { title: 'Accounting' },
    '/reports': { title: 'Reports' },
    '/commissions': { title: 'Brokerage Invoices' },
    '/settings': { title: 'Settings' },
    '/market-data': { title: 'Market Data' },
    '/doc-instructions': { title: 'Documentary Instructions' },
    '/port-lineups': { title: 'Port Line-Ups' },
    '/business-cards': { title: 'Business Cards' },
  };
  const currentPage = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/trades/') ? { title: location.pathname.includes('/edit') ? 'Edit Contract' : 'New Contract' } : location.pathname.startsWith('/documents/') ? { title: 'Vessel Execution' } : { title: '' });

  const unreadCount = notifications.filter(n => !(n.readBy || []).includes(user?.username)).length;

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      fetchNotifications();
    } catch {}
  };

  const deleteAllNotifications = async () => {
    try {
      await api.delete('/api/notifications');
      fetchNotifications();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-[200px]')}>
        {/* Header Bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 sticky top-0 z-40">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            data-testid="mobile-menu-button"
            onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title */}
          {currentPage.title && <h1 className="text-3xl font-bold text-foreground whitespace-nowrap hidden sm:block" data-testid="header-page-title">{currentPage.title}</h1>}

          {/* Spacer to push content right */}
          <div className="flex-1" />

          {/* Universal Search */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts, partners, vessels..."
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                data-testid="header-search-input"
              />
            </div>
          </div>

          {/* Notifications Bell - Admin only */}
          {isAdmin && <DropdownMenu>
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
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                      <CheckCheck className="h-3 w-3 mr-1" />Read All
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={deleteAllNotifications}>
                      Delete All
                    </Button>
                  )}
                </div>
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
                          {n.username && n.username !== 'system' && <span className="font-medium">{n.displayName || n.username} · </span>}
                          {n.createdAt ? (() => { try { return formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true }); } catch { return ''; }})() : ''}
                        </span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>}

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
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">{user?.fullName || `${firstName} ${lastName}`.trim()}</p>
                <p className="text-xs text-muted-foreground">{user?.username}</p>
              </div>
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer" data-testid="header-logout-button">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-3 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
