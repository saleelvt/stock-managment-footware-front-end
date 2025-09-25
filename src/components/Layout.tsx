import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  RotateCcw, 
  BarChart3,
  Store,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Stock Management', href: '/stock', icon: Package },
  { name: 'Sales', href: '/sales', icon: ShoppingCart },
  { name: 'Returns', href: '/returns', icon: RotateCcw },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Elegance Footwear</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Stock Management System</p>
              </div>
              <div className="block sm:hidden">
                <h1 className="text-base font-bold text-foreground">Elegance</h1>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div className="flex gap-4 lg:gap-6 relative">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="bg-card rounded-lg shadow-card p-4 sticky top-24">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-elegant'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Sidebar - Mobile Slide-out */}
          <aside 
            className={cn(
              'fixed top-0 left-0 h-full w-80 bg-card shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:hidden',
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">Elegance Footwear</h1>
                    <p className="text-sm text-muted-foreground">Stock Management</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileMenu}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <nav className="p-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-elegant'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full">
            <div className="bg-card rounded-lg shadow-card p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-8rem)]">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg lg:hidden z-40">
        <nav className="px-2 py-2">
          <ul className="flex justify-around">
            {navigation.slice(0, 5).map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name} className="flex-1">
                  <Link
                    to={item.href}
                    className={cn(
                      'flex flex-col items-center space-y-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="truncate max-w-full text-center leading-tight">
                      {item.name.split(' ')[0]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Add padding to bottom on mobile to account for bottom navigation */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}