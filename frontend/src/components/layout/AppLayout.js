import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import { Bell, PanelLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

export default function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const nameParts = (user?.name || user?.fullName || 'User').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '');

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <div className="ml-[250px]">
        {/* Header Bar */}
        <header className="flex h-14 items-center gap-2 border-b bg-white px-4 sticky top-0 z-40">
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-500" />
          </Button>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-semibold text-sm">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">{firstName}</p>
              <p className="text-xs text-slate-500">{lastName}</p>
            </div>
          </div>
        </header>
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
