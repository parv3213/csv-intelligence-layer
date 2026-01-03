import { Link, useLocation } from 'react-router-dom';
import { FileSpreadsheet, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePreferencesStore } from '@/stores/history';
import { useEffect } from 'react';

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block font-mono">
            csv-intelligence
          </span>
        </Link>

        <div className="flex flex-1 items-center space-x-1">
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

        <div className="flex items-center space-x-2">
          <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
            <SelectTrigger className="w-[110px]">
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
