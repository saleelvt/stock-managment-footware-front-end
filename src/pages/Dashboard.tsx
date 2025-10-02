import { useStore } from '@/contexts/StoreContext';
import { StatsCard } from '@/components/StatsCard';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp,
  RotateCcw,
  Archive
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { getDashboardStats, getStockAlerts, state } = useStore();
  // const stats = getDashboardStats();
  const alerts = getStockAlerts();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your store's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-0">
        <StatsCard
          title="Total Products"
         value={'0'}
          icon={<Package className="w-5 h-5 sm:w-6 sm:h-6" />} 
          description="Active products in inventory"
        />
        
        <StatsCard
          title="Total Stock"
          value={'0'}
          icon={<Archive className="w-5 h-5 sm:w-6 sm:h-6" />}
          description="Items across all sizes"
        />
        
        <StatsCard
          title="Low Stock Alerts"
          value={'0'}
          icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
          description="Items below threshold"
          variant={ 'success'}
        />
        
        <StatsCard
          title="Today's Sales"
           value={'0'}
          icon={<ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />}
          description="Items sold today"
          variant="success"
        />
        
        <StatsCard
          title="Total Sales"
         value={'0'}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          description="All-time sales volume"
          variant="success"
        />
        
        <StatsCard
          title="Total Returns"
         value={'0'}
          icon={<RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />}
          description="Items returned"
        />
      </div>

    

      {/* Quick Actions */}
      <div className="bg-card rounded-lg shadow-card border border-border p-4 sm:p-6 mx-2 sm:mx-0">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/stock"
            className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-primary-light rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="font-medium text-primary text-sm sm:text-base">Add Stock</span>
          </Link>
          
          <Link
            to="/sales"
            className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-success-light rounded-lg hover:bg-success/20 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
            <span className="font-medium text-success text-sm sm:text-base">Record Sale</span>
          </Link>
          
          <Link
            to="/returns"
            className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-warning-light rounded-lg hover:bg-warning/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
            <span className="font-medium text-warning text-sm sm:text-base">Process Return</span>
          </Link>
          
          <Link
            to="/reports"
            className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground flex-shrink-0" />
            <span className="font-medium text-accent-foreground text-sm sm:text-base">View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}