export interface ProductSize {
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string;
  color: string;
  sizes: ProductSize[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  size: string;
  quantity: number;
  color: string;
}

export interface Sale {
  id: string;
  _id?: string; // Add this line for backend response compatibility
  items: SaleItem[];
  customerName: string;
  totalItems: number;
  saleDate: Date;
  notes?: string;
}

export interface Return {
  id: string;
  originalSaleId: string;
  productId: string;
  productCode: string;
  productName: string;
  size: string;
  quantity: number;
  customerName: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
}

export interface StockAlert {
  productId: string;
  productCode: string;
  productName: string;
  size: string;
  currentStock: number;
  alertThreshold: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockAlerts: number;
  todaySales: number;
  totalSales: number;
  totalReturns: number;
}