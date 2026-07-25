import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { AppShell, type AppView } from '@/components/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { ScanPage } from '@/pages/ScanPage';
import { ScanResultPage } from '@/pages/ScanResultPage';
import { TrustGraphPage } from '@/pages/TrustGraphPage';
import type { ScanInput } from '@/types';

type Route =
  | { name: 'landing' }
  | { name: 'auth' }
  | { name: 'app'; view: AppView }
  | { name: 'scan-result'; scanId: string };

const VALID_VIEWS: AppView[] = ['dashboard', 'scan', 'graph'];

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'landing':
      return '#/';
    case 'auth':
      return '#/auth';
    case 'app':
      return `#/${route.view}`;
    case 'scan-result':
      return `#/scan/${route.scanId}`;
  }
}

function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'landing' };
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'scan' && parts[1]) return { name: 'scan-result', scanId: parts[1] };
  if (parts[0] && VALID_VIEWS.includes(parts[0] as AppView)) return { name: 'app', view: parts[0] as AppView };
  return { name: 'landing' };
}

function AppRoutes() {
  const { session, loading } = useAuth();
  const [route, setRoute] = useState<Route>(() => hashToRoute(window.location.hash));
  const [preloadedScan, setPreloadedScan] = useState<ScanInput | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRoute(next);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (route.name === 'auth') {
      return <AuthPage onBack={() => navigate({ name: 'landing' })} />;
    }
    return (
      <LandingPage
        onStart={() => navigate({ name: 'auth' })}
        onDemo={() => navigate({ name: 'auth' })}
      />
    );
  }

  if (route.name === 'scan-result') {
    return (
      <AppShell view="scan" onNavigate={(v) => navigate({ name: 'app', view: v })}>
        <ScanResultPage
          scanId={route.scanId}
          onBack={() => navigate({ name: 'app', view: 'dashboard' })}
          onNavigateGraph={() => navigate({ name: 'app', view: 'graph' })}
        />
      </AppShell>
    );
  }

  const view: AppView = route.name === 'app' ? route.view : 'dashboard';

  return (
    <AppShell
      view={view}
      onNavigate={(v) => {
        setPreloadedScan(null);
        navigate({ name: 'app', view: v });
      }}
    >
      {view === 'dashboard' && (
        <Dashboard
          onNavigate={(v) => navigate({ name: 'app', view: v })}
          onOpenScan={(scanId) => navigate({ name: 'scan-result', scanId })}
        />
      )}
      {view === 'scan' && (
        <ScanPage
          preloaded={preloadedScan}
          onConsumePreload={() => setPreloadedScan(null)}
          onScanComplete={(scanId) => navigate({ name: 'scan-result', scanId })}
        />
      )}
      {view === 'graph' && <TrustGraphPage />}
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
