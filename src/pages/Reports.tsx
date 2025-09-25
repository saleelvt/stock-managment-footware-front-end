import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Download,
  Filter,
  Search
} from 'lucide-react';

export function Reports() {
  // Mock state - in real app, use useStore
  const state = {
    sales: [],
    returns: [],
    products: []
  };
  
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return { start: today, end: now };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        return { start: monthStart, end: now };
      default:
        return null;
    }
  };

  const dateRange = getDateRange();
  
  // Filter sales based on date range
  const filteredSales = dateRange 
    ? state.sales.filter(sale => 
        sale.saleDate >= dateRange.start && sale.saleDate <= dateRange.end
      )
    : state.sales;

  // Filter returns based on date range  
  const filteredReturns = dateRange
    ? state.returns.filter(returnItem => 
        returnItem.returnDate >= dateRange.start && returnItem.returnDate <= dateRange.end
      )
    : state.returns;

  // Sales analytics
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalItems, 0);
  const totalReturns = filteredReturns.reduce((sum, returnItem) => sum + returnItem.quantity, 0);
  const netSales = totalSales - totalReturns;

  // Product performance
  const productSales = {};
  
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSales[item.productCode]) {
        productSales[item.productCode] = { sales: 0, returns: 0, net: 0, name: item.productName };
      }
      productSales[item.productCode].sales += item.quantity;
    });
  });

  filteredReturns.forEach(returnItem => {
    if (productSales[returnItem.productCode]) {
      productSales[returnItem.productCode].returns += returnItem.quantity;
    }
  });

  Object.keys(productSales).forEach(code => {
    productSales[code].net = productSales[code].sales - productSales[code].returns;
  });

  // Top performing products
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b.net - a.net)
    .slice(0, 10);

  // Customer analytics
  const customerData = {};
  
  filteredSales.forEach(sale => {
    if (!customerData[sale.customerName]) {
      customerData[sale.customerName] = { purchases: 0, returns: 0, totalItems: 0 };
    }
    customerData[sale.customerName].purchases += 1;
    customerData[sale.customerName].totalItems += sale.totalItems;
  });

  filteredReturns.forEach(returnItem => {
    if (customerData[returnItem.customerName]) {
      customerData[returnItem.customerName].returns += 1;
    }
  });

  const topCustomers = Object.entries(customerData)
    .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort(([, a], [, b]) => b.totalItems - a.totalItems)
    .slice(0, 10);

  // Stock status
  const stockStatus = state.products.map(product => {
    const totalStock = product.sizes.reduce((sum, size) => sum + size.stock, 0);
    const lowStockSizes = product.sizes.filter(size => size.stock <= 5);
    
    return {
      code: product.code,
      name: product.name,
      color: product.color,
      totalStock,
      lowStockCount: lowStockSizes.length,
      status: lowStockSizes.length > 0 ? 'low' : totalStock === 0 ? 'out' : 'good'
    };
  }).sort((a, b) => {
    if (a.status === 'out' && b.status !== 'out') return -1;
    if (a.status === 'low' && b.status === 'good') return -1;
    return b.totalStock - a.totalStock;
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sales analytics and inventory insights</p>
        </div>
        
        <Button variant="outline" className="flex items-center space-x-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <Label className="text-sm">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 w-full sm:max-w-md">
              <Label className="text-sm">Search Customers</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sales</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">{totalSales}</p>
            <p className="text-xs text-muted-foreground">Items sold</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Returns</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">{totalReturns}</p>
            <p className="text-xs text-muted-foreground">Items returned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Net Sales</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">{netSales}</p>
            <p className="text-xs text-muted-foreground">After returns</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Transactions</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-2">{filteredSales.length}</p>
            <p className="text-xs text-muted-foreground">Sales recorded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map(([code, data]) => (
                  <div key={code} className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-sm sm:text-base truncate">{code}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{data.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-600 text-sm sm:text-base">{data.net} net</p>
                      <p className="text-xs text-muted-foreground">
                        {data.sales} sold, {data.returns} returned
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm sm:text-base">No sales data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {topCustomers.length > 0 ? (
                topCustomers.map(([name, data]) => (
                  <div key={name} className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-sm sm:text-base truncate">{name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {data.purchases} purchases, {data.returns} returns
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">
                      {data.totalItems} items
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm sm:text-base">No customer data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Current Stock Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 sm:space-y-3">
            {stockStatus.map(product => (
              <div key={product.code} className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-medium text-sm sm:text-base truncate">{product.code} - {product.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.color}</p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                  <span className="text-base sm:text-lg font-bold">{product.totalStock}</span>
                  <Badge 
                    variant={
                      product.status === 'out' ? 'destructive' : 
                      product.status === 'low' ? 'default' : 
                      'outline'
                    }
                    className="text-xs sm:text-sm"
                  >
                    {product.status === 'out' ? 'Out of Stock' : 
                     product.status === 'low' ? `${product.lowStockCount} Low` : 
                     'In Stock'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}