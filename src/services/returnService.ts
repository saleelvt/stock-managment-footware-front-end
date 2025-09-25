import { urlEndPoints } from "@/api/apiConfig";
import apiService from "@/api/apiService";

// Return structure
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
  color?: string;
}

// Request payload for creating a return
export interface CreateReturnRequest {
  saleId: string;
  productCode: string;
  size: string;
  quantity: number;
  reason: string;
  notes?: string;
}

// Response structure from backend
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

// Create new return
export const addReturn = async (returnData: CreateReturnRequest): Promise<Return> => {
  try {
    const res = await apiService.post(urlEndPoints.createReturn, returnData);
    
    if (!res.data) {
      throw new Error('No data received from server');
    }
    
    return transformReturnResponse(res.data);
  } catch (error) {
    console.error('Error in addReturn:', error);
    throw error;
  }
};

// Get returns with pagination
export const getReturns = async (page = 1, limit = 4): Promise<{data: Return[], meta: any}> => {
  try {
    const res = await apiService.get(urlEndPoints.getRecentReturns(page, limit));
    
    if (!res.data) {
      throw new Error('No data received from server');
    }

    const returnsResponse: ReturnsResponse = res.data;
    
    const transformedReturns: Return[] = returnsResponse.data.map(transformReturnResponse);
    
    return {
      data: transformedReturns,
      meta: returnsResponse.meta
    };
  } catch (error) {
    console.error('Error in getReturns:', error);
    throw error;
  }
};

// Get recent returns (convenience function)
export const getRecentReturns = async (limit = 4): Promise<Return[]> => {
  try {
    const response = await getReturns(1, limit);
    return response.data;
  } catch (error) {
    console.error('Error in getRecentReturns:', error);
    throw error;
  }
};


// Helper function to transform backend response to frontend Return format
// Replace the transformReturnResponse function:
const transformReturnResponse = (returnItem: ReturnResponse): Return => {
  if (!returnItem) {
    throw new Error('Return response is null or undefined');
  }
  
  return {
    id: returnItem._id || '',
    originalSaleId: returnItem.sale || '',
    productId: returnItem.product || '',
    productCode: returnItem.productCode || '',
    productName: returnItem.productCode || 'Unknown Product', 
    size: returnItem.size || '',
    quantity: returnItem.quantity || 0,
    customerName: returnItem.customerName || 'Unknown Customer',
    returnDate: returnItem.createdAt ? new Date(returnItem.createdAt) : new Date(),
    reason: returnItem.reason,
    notes: returnItem.notes,
    color: returnItem.color
  };
};

// Helper function to transform frontend Return to backend request format
export const transformReturnToRequest = (returnItem: Omit<Return, 'id' | 'returnDate' | 'customerName' | 'productName' | 'productId' | 'color'>): CreateReturnRequest => {
  return {
    saleId: returnItem.originalSaleId || '',
    productCode: returnItem.productCode || '',
    size: returnItem.size || '',
    quantity: returnItem.quantity || 0,
    reason: returnItem.reason || '',
    notes: returnItem.notes,
  };
};