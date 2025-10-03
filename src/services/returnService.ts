/* eslint-disable @typescript-eslint/no-explicit-any */
import { indexedDBService } from "./indexedDBService";

// Re-export types for backward compatibility
export type { Return } from "./indexedDBService";

// Legacy interfaces for backward compatibility
export interface CreateReturnRequest {
  saleId: string;
  productCode: string;
  size: string;
  quantity: number;
  reason: string;
  notes?: string;
}

// Response structure from backend (for backward compatibility)
export interface ReturnResponse {
  _id: string;
  sale: string;
  customerName: string;
  product: string;
  productCode: string;
  size: string;
  quantity: number;
  color?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Paginated response structure
export interface ReturnsResponse {
  data: ReturnResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Transform legacy return request to IndexedDB format
const transformReturnRequestToIDB = async (returnData: CreateReturnRequest) => {
  const now = new Date();

  // Get sale details to populate customer and product information
  const sale = await indexedDBService.getSale(parseInt(returnData.saleId));
  if (!sale) {
    throw new Error(`Sale with id ${returnData.saleId} not found`);
  }

  // Find the sale item to get product details
  const saleItem = sale.items.find(item =>
    item.productCode === returnData.productCode && item.size === returnData.size
  );

  if (!saleItem) {
    throw new Error(`Sale item not found for product ${returnData.productCode} size ${returnData.size}`);
  }

  return {
    originalSaleId: parseInt(returnData.saleId),
    productId: saleItem.productId,
    productCode: returnData.productCode,
    productName: saleItem.productName,
    size: returnData.size,
    quantity: returnData.quantity,
    customerName: sale.customerName,
    returnDate: now,
    reason: returnData.reason,
    notes: returnData.notes,
    color: saleItem.color,
    createdAt: now,
    updatedAt: now
  };
};

// Transform IndexedDB return to legacy format
const transformReturnToLegacy = (idbReturn: any) => ({
  id: idbReturn.id?.toString() || '',
  originalSaleId: idbReturn.originalSaleId?.toString() || '',
  productId: idbReturn.productId?.toString() || '',
  productCode: idbReturn.productCode,
  productName: idbReturn.productName,
  size: idbReturn.size,
  quantity: idbReturn.quantity,
  customerName: idbReturn.customerName,
  returnDate: idbReturn.returnDate,
  reason: idbReturn.reason,
  notes: idbReturn.notes,
  color: idbReturn.color
});

// Create new return
export const addReturn = async (returnData: CreateReturnRequest): Promise<any> => {
  try {
    const idbReturnData = await transformReturnRequestToIDB(returnData);
    const result = await indexedDBService.addReturn(idbReturnData);
    return transformReturnToLegacy(result);
  } catch (error) {
    console.error('Error in addReturn:', error);
    throw error;
  }
};

// Get returns with pagination
export const getReturns = async (page = 1, limit = 4): Promise<{data: any[], meta: any}> => {
  try {
    const response = await indexedDBService.getReturnsPaginated(page, limit);
    const legacyReturns = response.data.map(transformReturnToLegacy);

    return {
      data: legacyReturns,
      meta: response.meta
    };
  } catch (error) {
    console.error('Error in getReturns:', error);
    throw error;
  }
};

// Get recent returns (convenience function)
export const getRecentReturns = async (limit = 4): Promise<any[]> => {
  try {
    const response = await getReturns(1, limit);
    return response.data;
  } catch (error) { 
    console.error('Error in getRecentReturns:', error);
    throw error;
  }
};

// Helper function to transform frontend Return to backend request format
export const transformReturnToRequest = (returnItem: any): CreateReturnRequest => {
  return {
    saleId: returnItem.originalSaleId?.toString() || '',
    productCode: returnItem.productCode || '',
    size: returnItem.size || '',
    quantity: returnItem.quantity || 0,
    reason: returnItem.reason || '',
    notes: returnItem.notes,
  };
};