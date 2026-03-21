import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Settings, User, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-teal-600" /> Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={user?.fullName || ''} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ''} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role || ''} disabled className="bg-slate-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-teal-600" /> Security</CardTitle>
          <CardDescription>Password and authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Password management is available for admin users. Contact your administrator to change your password.</p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-teal-600" /> Notifications</CardTitle>
          <CardDescription>Notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Email notifications and alerts configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-teal-600" /> Application</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-slate-500">Application</span>
              <span className="font-medium">PIR Grain & Pulses</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
