import { Activity, Bell, Clock, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell, showBadge: true },
  { id: "history", label: "History", icon: Clock },
];

export function NavigationTabs({ activeTab, onTabChange, alertCount }: NavigationTabsProps) {
  return (
    <nav className="sticky top-16 z-40 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={cn(
                  "relative flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-semibold transition-all snap-start touch-target",
                  "hover:text-primary hover-elevate",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-t-full" />
                )}
                
                {/* Alert Badge */}
                {tab.showBadge && alertCount > 0 && (
                  <span 
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground"
                    data-testid="alert-count"
                  >
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
