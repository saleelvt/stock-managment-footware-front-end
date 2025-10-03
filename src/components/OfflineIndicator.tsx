import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';

interface OfflineIndicatorProps {
  className?: string;
  showSyncButton?: boolean;
  compact?: boolean;
} 

export function OfflineIndicator({
  className = '',
  showSyncButton = true,
  compact = false
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus(syncService.getSyncStatus());
      toast({
        title: "Back Online",
        description: "Internet connection restored. You can now sync data if needed.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(syncService.getSyncStatus());
      toast({
        title: "Offline Mode",
        description: "Internet connection lost. App will work offline.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync status periodically
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast]);

  const handleSync = async () => {
    if (!syncStatus.canSync) {
      toast({
        title: "Cannot Sync",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncService.syncToRemote();

      if (result.success) {
        toast({
          title: "Sync Completed",
          description: `Synced ${result.productsSynced} products, ${result.salesSynced} sales, ${result.returnsSynced} returns.`,
        });
      } else {
        toast({
          title: "Sync Issues",
          description: `Some items couldn't be synced. Check console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge
          variant={isOnline ? "default" : "destructive"}
          className="flex items-center gap-1"
        >
          {isOnline ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>

        {showSyncButton && isOnline && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing || !syncStatus.canSync}
            className="h-6 px-2"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Cloud className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${className} hidden`}>
      <CardContent className="px-2 py-1">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <div>
                <p className="font-medium text-xs">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </p>
                <p className="text-[0.6rem] text-muted-foreground">
                  {isOnline
                    ? 'All features available'
                    : 'Working with local data only'
                  }
                </p>
              </div>
            </div>
          </div>

          {showSyncButton && (
            <Button
              onClick={handleSync}
              disabled={isSyncing || !syncStatus.canSync}
              variant={isOnline ? "default" : "secondary"}
              className="flex items-center gap-2 text-xs px-2 py-1 w-fit h-fit"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : isOnline ? (
                <>
                  <Cloud className="w-4 h-4" />
                  Backup Data
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4" />
                  Offline
                </>
              )}
            </Button>
          )}
        </div>

        {isOnline && !syncStatus.canSync && (
          <p className="text-sm text-amber-600 mt-2">
            Sync is currently disabled. Please wait or check your connection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for components to access online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    syncStatus,
    canSync: syncStatus.canSync
  };
}

export default OfflineIndicator;