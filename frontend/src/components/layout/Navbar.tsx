import { Link, useLocation } from 'react-router-dom';
import { FileSpreadsheet, Moon, Sun, Monitor, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { usePreferencesStore } from '@/stores/history';
import { useEffect, useState } from 'react';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/playground', label: 'Playground' },
  { path: '/docs', label: 'Docs' },
  { path: '/api-docs', label: 'API' },
  { path: '/about', label: 'About' },
];

export function Navbar() {
  const location = useLocation();
  const { theme, setTheme } = usePreferencesStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-4 md:mr-6 flex items-center space-x-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block font-mono">
            csv-intelligence
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 items-center space-x-1">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path}>
              <Button
                variant={location.pathname === link.path ? 'secondary' : 'ghost'}
                size="sm"
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden flex-1 justify-end mr-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-mono">csv-intelligence</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-2 mt-6">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    <Button
                      variant={location.pathname === link.path ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                    >
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
            <SelectTrigger className="w-[90px] md:w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center">
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </nav>
  );
}
