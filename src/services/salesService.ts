import { indexedDBService } from "./indexedDBService";

// Re-export types for backward compatibility
export type { Sale, SaleItem } from "./indexedDBService";

// Legacy interfaces for backward compatibility
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

// Response structure from backend (for backward compatibility)
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

// Transform legacy sale request to IndexedDB format
const transformSaleRequestToIDB = (saleData: CreateSaleRequest) => {
  const now = new Date();
  const totalItems = saleData.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    customerName: saleData.customerName,
    items: saleData.items.map(item => ({
      productId: parseInt(item.productId),
      productCode: item.productCode,
      productName: '', // Will be populated from product data
      size: item.size,
      quantity: item.quantity,
      color: '' // Will be populated from product data
    })),
    totalItems,
    saleDate: now,
    notes: saleData.notes,
    createdAt: now,
    updatedAt: now
  };
};

// Transform IndexedDB sale to legacy format
const transformSaleToLegacy = (idbSale: any) => ({
  id: idbSale.id?.toString() || '',
  customerName: idbSale.customerName,
  items: idbSale.items,
  totalItems: idbSale.totalItems,
  saleDate: idbSale.saleDate,
  notes: idbSale.notes
});

// Create new sale
export const addSale = async (saleData: CreateSaleRequest): Promise<any> => {
  try {
    const idbSaleData = transformSaleRequestToIDB(saleData);

    // Get product details to populate item information
    const enrichedItems = await Promise.all(
      idbSaleData.items.map(async (item: any) => {
        const product = await indexedDBService.getProductByCode(item.productCode);
        if (product) {
          return {
            ...item,
            productName: product.name,
            color: product.color
          };
        }
        return item;
      })
    );

    const enrichedSaleData = {
      ...idbSaleData,
      items: enrichedItems
    };

    const result = await indexedDBService.addSale(enrichedSaleData);
    return transformSaleToLegacy(result);
  } catch (error) {
    console.error('Error in addSale:', error);
    throw error;
  }
};

// Get Sales Paginated
export const getLastSales = async (page = 1, limit = 4): Promise<any[]> => {
  try {
    const response = await indexedDBService.getSalesPaginated(page, limit);
    return response.data.map(transformSaleToLegacy);
  } catch (error) {
    console.error('Error in getLastSales:', error);
    throw error;
  }
};

// Search sales by customer name
export const searchSalesByCustomerName = async (name: string): Promise<any[]> => {
  try {
    const sales = await indexedDBService.searchSalesByCustomerName(name);
    return sales.map(transformSaleToLegacy);
  } catch (error) {
    console.error('Error in searchSalesByCustomerName:', error);
    throw error;
  }
};

// Helper function to transform frontend Sale to backend request format
export const transformSaleToRequest = (sale: any): CreateSaleRequest => {
  console.log(sale)
  return {
    customerName: sale.customerName,
    items: sale.items.map((item: any) => ({
      productId: item.productId.toString(),
      productCode: item.productCode,
      size: item.size,
      quantity: item.quantity
    })),
    notes: sale.notes
  };
};