import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Wallet,
  PiggyBank,
  History,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/balances', icon: Wallet, label: 'Balances' },
  { path: '/loans', icon: PiggyBank, label: 'Loans' },
  { path: '/transactions', icon: History, label: 'Transactions' },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-card border-r',
          !sidebarOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="h-full px-3 py-4 flex flex-col">
          <div className="flex items-center mb-10 px-2">
            <PiggyBank className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-bold">Koperasi Admin</h1>
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
                    : 'hover:bg-accent'
                )}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.label}
              </Link>
            ))}
          </nav>

          <Button variant="ghost" className="justify-start mt-auto">
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
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