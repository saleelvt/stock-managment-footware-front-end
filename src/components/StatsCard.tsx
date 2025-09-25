import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend = 'neutral',
  variant = 'default' 
}: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center',
          variant === 'success' && 'bg-success-light text-success',
          variant === 'warning' && 'bg-warning-light text-warning',
          variant === 'danger' && 'bg-destructive-light text-destructive',
          variant === 'default' && 'bg-primary-light text-primary'
        )}>
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}