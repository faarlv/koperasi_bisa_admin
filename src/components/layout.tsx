import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Users,
  Wallet,
  History,
  Menu,
  X,
  LogOut,
 
  CoinsIcon,

} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}
import { createClient } from '@supabase/supabase-js';

const sidebarItems = [
  { path: '/', icon: Users, label: 'Users' },
  { path: '/balances', icon: Wallet, label: 'Saldo' },
  { path: '/loans', icon: CoinsIcon, label: 'Pinjaman' },
];

export default function Layout({
  children,
  setIsAuthenticated,
}: {
  children: React.ReactNode;
  setIsAuthenticated: (auth: boolean) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );
  
  const navigate = useNavigate();

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      navigate('/login');
  };

  return ( 
    <div className="min-h-screen bg-background">
      <Button
        variant="secondary"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-card border-r',
          !sidebarOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="h-full px-3 py-4 flex flex-col">
          <div className="px-3 flex flex-col items-center mb-5">
            <img src="../../assets/logo_koperasi.png" alt="" className="h-20 w-20 mb-2" />
            <h1 className="text-xl font-bold text-center">Koperasi Dashboard</h1>
          </div>


          <nav className="space-y-1 flex-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center px-2 py-2 text-sm rounded-lg',
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-primary-foreground'
                )}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.label}
              </Link>
            ))}
          </nav>

          <Button variant="destructive" className="justify-start mt-auto" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          'transition-all duration-200 ease-in-out',
          'md:ml-64 p-4 md:p-8'
        )}
      >
        {children}
      </main>
    </div>
  );
}