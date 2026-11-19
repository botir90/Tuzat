import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { APP_NAME } from '@usta/shared';
import { adminApi, session, setUnauthorizedHandler } from './api';
import { Button, Loading } from './components/ui';
import { CasesPage } from './pages/CasesPage';
import { CatalogPage } from './pages/CatalogPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MastersPage } from './pages/MastersPage';
import { RegionsPage } from './pages/RegionsPage';
import { RequestsPage } from './pages/RequestsPage';
import { UsersPage } from './pages/UsersPage';
import { WaitlistPage } from './pages/WaitlistPage';

export type PageId =
  'dashboard' | 'masters' | 'requests' | 'cases' | 'users' | 'regions' | 'catalog' | 'waitlist';

const NAV: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Umumiy holat' },
  { id: 'masters', label: 'Ustalar' },
  { id: 'requests', label: 'Buyurtmalar' },
  { id: 'cases', label: 'Murojaatlar' },
  { id: 'users', label: 'Foydalanuvchilar' },
  { id: 'regions', label: 'Hududlar' },
  { id: 'catalog', label: 'Kategoriyalar va narxlar' },
  { id: 'waitlist', label: 'Kutish ro‘yxati' },
];

export function App() {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => session.get() !== null);
  const [page, setPage] = useState<PageId>('dashboard');

  // Check the saved token once; an expired token sends us back to the login screen.
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => adminApi<{ username: string }>('/admin/me'),
    enabled: hasToken,
    retry: false,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.clear();
      setHasToken(false);
    });
  }, [queryClient]);

  function logout() {
    session.clear();
    queryClient.clear();
    setHasToken(false);
  }

  if (!hasToken) {
    return (
      <LoginPage
        onLogin={() => {
          setHasToken(true);
          setPage('dashboard');
        }}
      />
    );
  }
  if (me.isLoading) return <Loading />;

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="brand">{APP_NAME} · admin</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'nav-active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
        <div className="sidebar-footer">
          <div className="muted">{me.data?.username}</div>
          <Button variant="secondary" onClick={logout}>
            Chiqish
          </Button>
        </div>
      </nav>
      <main className="content">
        {page === 'dashboard' ? <DashboardPage go={setPage} /> : null}
        {page === 'masters' ? <MastersPage /> : null}
        {page === 'requests' ? <RequestsPage /> : null}
        {page === 'cases' ? <CasesPage /> : null}
        {page === 'users' ? <UsersPage /> : null}
        {page === 'regions' ? <RegionsPage /> : null}
        {page === 'catalog' ? <CatalogPage /> : null}
        {page === 'waitlist' ? <WaitlistPage /> : null}
      </main>
    </div>
  );
}
