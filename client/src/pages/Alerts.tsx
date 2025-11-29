import { Alert } from "@shared/schema";
import { AlertNotification } from "@/components/AlertNotification";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCheck, BellOff } from "lucide-react";

interface AlertsProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export function Alerts({ alerts, onDismiss, onMarkRead, onClearAll }: AlertsProps) {
  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">System Alerts</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All alerts read'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {alerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              data-testid="button-clear-all"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3" data-testid="alerts-list">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No alerts</h3>
            <p className="text-sm text-muted-foreground">Your system is running smoothly</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertNotification
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss}
              onMarkRead={onMarkRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
