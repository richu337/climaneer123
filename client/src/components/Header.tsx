import { Moon, Sun, Wifi, WifiOff, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface HeaderProps {
  onSettingsClick: () => void;
  onRefresh: () => void;
  isOnline: boolean;
}

export function Header({ onSettingsClick, onRefresh, isOnline }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if user has a theme preference
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    
    setIsDark(theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3" data-testid="brand-logo">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-glow-emerald">
              <i className="fas fa-seedling text-white text-lg"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight gradient-text">
                CLIMANEER
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Smart Agriculture
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connection Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50" data-testid="connection-status">
              {isOnline ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Online</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Offline</span>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover-elevate active-elevate-2"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={handleRefresh}
              className="hover-elevate active-elevate-2 hidden sm:inline-flex"
              data-testid="button-refresh"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            {/* Settings Button */}
            <Button
              onClick={onSettingsClick}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-glow-emerald"
              size="default"
              data-testid="button-settings"
            >
              <SettingsIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
