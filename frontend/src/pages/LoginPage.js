import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Wheat, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#0e7490] flex items-center justify-center mb-4">
            <Wheat className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#0e7490]" data-testid="login-title">
            PIR GRAIN & PULSES
          </CardTitle>
          <CardDescription className="text-slate-500">
            Agricultural Commodity Trading Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {error && (
                <p className="text-sm text-red-600" data-testid="login-error">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full bg-[#0e7490] hover:bg-[#155e75] text-white"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200" data-testid="login-demo-credentials">
            <p className="text-xs font-semibold text-slate-700">Login credentials:</p>
            <p className="text-xs text-slate-600 mt-1">
              Username: <code className="font-mono bg-slate-200 px-1 rounded">salihkaragoz</code>
            </p>
            <p className="text-xs text-slate-600">
              Password: <code className="font-mono bg-slate-200 px-1 rounded">salih123</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
