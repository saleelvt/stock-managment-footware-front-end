import { indexedDBService } from "./indexedDBService";

// Re-export types for backward compatibility
export type { Product, ProductSize } from "./indexedDBService";

// Backward compatibility interface for existing code
export interface StockBySize {
  size: string;
  quantity: number;
}

// Legacy Product interface for existing code (for function signatures only)
interface LegacyProduct {
  id?: string;
  productCode: string;
  productName: string; 
  brand: string;
  color: string;
  stockBySize: StockBySize[];
  category?: string;
}

// Transform IndexedDB Product to legacy format
const transformToLegacyProduct = (idbProduct: any): LegacyProduct => ({
  id: idbProduct.id?.toString(),
  productCode: idbProduct.code,
  productName: idbProduct.name,
  brand: idbProduct.brand || '',
  color: idbProduct.color,
  category: idbProduct.category,
  stockBySize: idbProduct.sizes.map((size: any) => ({
    size: size.size,
    quantity: size.stock
  }))
});

// Transform legacy Product to IndexedDB format
const transformToIDBProduct = (legacyProduct: any) => {
  const now = new Date();
  return {
    code: legacyProduct.productCode,
    name: legacyProduct.productName,
    brand: legacyProduct.brand,
    color: legacyProduct.color,
    category: legacyProduct.category,
    sizes: legacyProduct.stockBySize?.map((size: any) => ({
      size: size.size,
      stock: size.quantity || 0
    })) || [],
    createdAt: now,
    updatedAt: now
  };
};

// Add new product
export const addProduct = async (productData: LegacyProduct): Promise<LegacyProduct> => {
  try {
    const idbProduct = transformToIDBProduct(productData);
    const result = await indexedDBService.addProduct(idbProduct);
    return transformToLegacyProduct(result);
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// getProductsPaginated with search
export const getProducts = async (page = 1, limit = 10, search = ""): Promise<{data: LegacyProduct[], meta: any}> => {
  try {
    const response = await indexedDBService.getProductsPaginated(page, limit, search);
    const legacyProducts = response.data.map(transformToLegacyProduct);

    return {
      data: legacyProducts,
      meta: response.meta
    };
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

// Update product
export const updateProduct = async (
  id: string,
  productData: Partial<LegacyProduct>
): Promise<LegacyProduct> => {
  try {
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error(`Invalid product ID: ${id}`);
    }

    const idbProductData = transformToIDBProduct(productData);
    const result = await indexedDBService.updateProduct(numericId, idbProductData);
    return transformToLegacyProduct(result);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error(`Invalid product ID: ${id}`);
    }

    await indexedDBService.deleteProduct(numericId);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Get all products
export const ListProducts = async (): Promise<LegacyProduct[]> => {
  try {
    const idbProducts = await indexedDBService.getAllProducts();
    return idbProducts.map(transformToLegacyProduct);
  } catch (error) {
    console.error('Error getting all products:', error);
    throw error;
  }
};

// Additional utility functions for stock management
export const updateProductStock = async (productId: string, size: string, quantity: number): Promise<void> => {
  try {
    const numericId = parseInt(productId);
    if (isNaN(numericId)) {
      throw new Error(`Invalid product ID: ${productId}`);
    }

    await indexedDBService.updateProductStock(numericId, size, quantity);
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

export const getProductByCode = async (code: string): Promise<LegacyProduct | null> => {
  try {
    const idbProduct = await indexedDBService.getProductByCode(code);
    return idbProduct ? transformToLegacyProduct(idbProduct) : null;
  } catch (error) {
    console.error('Error getting product by code:', error);
    throw error;
  }
};