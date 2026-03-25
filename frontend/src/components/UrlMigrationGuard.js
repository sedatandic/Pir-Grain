import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

export default function UrlMigrationGuard({ children }) {
  const [migrated, setMigrated] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkActiveUrl();
  }, []);

  const checkActiveUrl = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/active-url`, { cache: 'no-store' });
      const data = await res.json();
      const activeUrl = (data.activeUrl || '').replace(/\/$/, '');
      const currentOrigin = window.location.origin.replace(/\/$/, '');

      if (activeUrl && activeUrl !== currentOrigin) {
        // App has moved - clear auth and show warning
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setNewUrl(activeUrl);
        setMigrated(true);
      }
    } catch {
      // If we can't reach the API, don't block - let the app load normally
    } finally {
      setChecking(false);
    }
  };

  if (checking) return null;

  if (migrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4" data-testid="url-migration-screen">
        <div className="max-w-md w-full bg-gray-900 border border-amber-500/30 rounded-xl shadow-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Application Has Moved</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              This application has been relocated to a new address. Please update your bookmarks and use the new link below.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">New Application URL</p>
            <a
              href={newUrl}
              className="text-amber-400 hover:text-amber-300 font-mono text-sm break-all underline underline-offset-4 flex items-center justify-center gap-2"
              data-testid="new-url-link"
            >
              {newUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
          <a
            href={newUrl}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
            data-testid="go-to-new-url-btn"
          >
            Go to New App
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-gray-600">You have been logged out for security.</p>
        </div>
      </div>
    );
  }

  return children;
}
