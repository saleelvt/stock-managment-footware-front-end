import { urlEndPoints } from "@/api/apiConfig";
import apiService from "@/api/apiService";

// Sale item structure
export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  size: string;
  quantity: number;
  color: string;
}

// Sale structure
export interface Sale {
  id: string;
  customerName: string;
  items: SaleItem[];
  totalItems: number;
  saleDate: Date;
  notes?: string;
}

// Request payload for creating a sale
export interface CreateSaleRequest {
  customerName: string;
  items: {
    productId: string;
    productCode: string;
    size: string;
    quantity: number;
  }[];
  notes?: string;
}

// Response structure from backend
export interface SaleResponse {
  _id: string;
  customerName: string;
  items: {
    productId: string;
    productCode: string;
    productName: string;
    size: string;
    quantity: number;
    color: string;
  }[];
  totalItems: number;
  saleDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Create new sale
export const addSale = async (saleData: CreateSaleRequest): Promise<Sale> => {
  try {
    const res = await apiService.post(urlEndPoints.createSale, saleData);
    
    if (!res.data) {
      throw new Error('No data received from server');
    }
    
    return transformSaleResponse(res.data);
  } catch (error) {
    console.error('Error in addSale:', error);
    throw error;
  }
};


// Get Sales Paginated
export const getLastSales = async (page = 1, limit = 4): Promise<Sale[]> => {
  try {
    const res = await apiService.get(urlEndPoints.getRecentSales(page, limit));

    if (!res.data) {
      console.warn('No data in response');
      return [];
    }
    
    if (!res.data.data || !Array.isArray(res.data.data)) {
      console.warn('Sales data is not an array:', res.data);
      return [];
    }
    
    return res.data.data.map(transformSaleResponse);
  } catch (error) {
    console.error('Error in getLastSales:', error);
    throw error;
  }
};

// SearchSalesByUsingConstumerName
export const searchSalesByCustomerName = async (name: string): Promise<Sale[]> => {
  try {
    const res = await apiService.get(urlEndPoints.searchSaleByName(name));
    
    if (!res.data) {
      console.warn('No data in response');
      return [];
    }
    
    let salesArray: any[] = [];
    
    if (Array.isArray(res.data)) {
      salesArray = res.data;
    } else if (res.data.data && Array.isArray(res.data.data)) {
      salesArray = res.data.data;
    } else if (res.data.sales && Array.isArray(res.data.sales)) {
      salesArray = res.data.sales;
    } else {
      console.warn('Sales data is not an array:', res.data);
      return [];
    }
    
    return salesArray.map(transformSaleResponse);
  } catch (error) {
    console.error('Error in searchSalesByCustomerName:', error);
    throw error;
  }
};

// Helper function to transform backend response to frontend Sale format
const transformSaleResponse = (sale: any): Sale => {
  if (!sale) {
    throw new Error('Sale response is null or undefined');
  }
  
  const items = sale.items && Array.isArray(sale.items) 
    ? sale.items.map((item: any) => ({
        productId: item.productId || '',
        productCode: item.productCode || '',
        productName: item.productName || '',
        size: item.size || '',
        quantity: item.quantity || 0,
        color: item.color || ''
      }))
    : [];

  // Use createdAt from backend as the sale date
  const saleDate = sale.createdAt || sale.saleDate;
  
  return {
    id: sale._id || sale.id || '',
    customerName: sale.customerName || '',
    items: items,
    totalItems: sale.totalItems || items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
    saleDate: saleDate ? new Date(saleDate) : new Date(),
    notes: sale.notes,
  };
};

// Helper function to transform frontend Sale to backend request format
export const transformSaleToRequest = (sale: Omit<Sale, 'id' | 'saleDate' | 'totalItems'>): CreateSaleRequest => {
  return {
    customerName: sale.customerName,
    items: sale.items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      size: item.size,
      quantity: item.quantity
    })),
    notes: sale.notes
  };
};