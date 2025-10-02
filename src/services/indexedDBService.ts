// IndexedDB Service for Offline Stock Management App
// Provides complete data persistence layer replacing API calls

export interface ProductSize {
  size: string;
  stock: number;
}

export interface Product {
  id?: number; // Auto-increment in IndexedDB
  code: string;
  name: string;
  brand?: string;
  color: string;
  category?: string;
  sizes: ProductSize[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: number;
  productCode: string;
  productName: string;
  size: string;
  quantity: number;
  color: string;
}

export interface Sale {
  id?: number; // Auto-increment in IndexedDB
  customerName: string;
  items: SaleItem[];
  totalItems: number;
  saleDate: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Return {
  id?: number; // Auto-increment in IndexedDB
  originalSaleId: number;
  productId: number;
  productCode: string;
  productName: string;
  size: string;
  quantity: number;
  customerName: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Database configuration
const DB_NAME = 'FootwearStockManager';
const DB_VERSION = 1;

// Store names
const STORES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  RETURNS: 'returns',
  METADATA: 'metadata'
} as const;

// Initialize IndexedDB
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = this.openDB();
    this.db = await this.dbPromise;

    return this.db;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(new Error(`IndexedDB error: ${request.error}`));
      };

      request.onsuccess = () => {
        console.log('IndexedDB initialized successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Products store
    if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
      const productsStore = db.createObjectStore(STORES.PRODUCTS, {
        keyPath: 'id',
        autoIncrement: true
      });

      // Indexes for products
      productsStore.createIndex('code', 'code', { unique: true });
      productsStore.createIndex('name', 'name', { unique: false });
      productsStore.createIndex('brand', 'brand', { unique: false });
      productsStore.createIndex('color', 'color', { unique: false });
      productsStore.createIndex('category', 'category', { unique: false });
      productsStore.createIndex('createdAt', 'createdAt', { unique: false });
      productsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // Sales store
    if (!db.objectStoreNames.contains(STORES.SALES)) {
      const salesStore = db.createObjectStore(STORES.SALES, {
        keyPath: 'id',
        autoIncrement: true
      });

      // Indexes for sales
      salesStore.createIndex('customerName', 'customerName', { unique: false });
      salesStore.createIndex('saleDate', 'saleDate', { unique: false });
      salesStore.createIndex('createdAt', 'createdAt', { unique: false });
      salesStore.createIndex('totalItems', 'totalItems', { unique: false });
    }

    // Returns store
    if (!db.objectStoreNames.contains(STORES.RETURNS)) {
      const returnsStore = db.createObjectStore(STORES.RETURNS, {
        keyPath: 'id',
        autoIncrement: true
      });

      // Indexes for returns
      returnsStore.createIndex('originalSaleId', 'originalSaleId', { unique: false });
      returnsStore.createIndex('productCode', 'productCode', { unique: false });
      returnsStore.createIndex('customerName', 'customerName', { unique: false });
      returnsStore.createIndex('returnDate', 'returnDate', { unique: false });
      returnsStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Metadata store for app settings
    if (!db.objectStoreNames.contains(STORES.METADATA)) {
      db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
    }
  }

  // Generic CRUD operations
  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Product operations
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      const store = await this.getStore(STORES.PRODUCTS, 'readwrite');
      const now = new Date();
 
      const productWithTimestamps = {
        ...product,
        createdAt: now,
        updatedAt: now
      };

      const request = store.add(productWithTimestamps);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const newProduct = { ...productWithTimestamps, id: request.result as number };
          resolve(newProduct);
        };
        request.onerror = () => reject(new Error(`Failed to add product: ${request.error}`));
      });
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | null> {
    try {
      const store = await this.getStore(STORES.PRODUCTS);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error(`Failed to get product: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  async getProductByCode(code: string): Promise<Product | null> {
    try {
      const store = await this.getStore(STORES.PRODUCTS);
      const index = store.index('code');
      const request = index.get(code);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error(`Failed to get product by code: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting product by code:', error);
      throw error;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const store = await this.getStore(STORES.PRODUCTS);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get all products: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  async getProductsPaginated(page: number = 1, limit: number = 10, search?: string): Promise<{
    data: Product[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const allProducts = await this.getAllProducts();
      let filteredProducts = allProducts;

      // Apply search filter if provided
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredProducts = allProducts.filter(product =>
          product.code.toLowerCase().includes(searchLower) ||
          product.name.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.color.toLowerCase().includes(searchLower)
        );
      }

      // Sort by creation date (newest first)
      filteredProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = filteredProducts.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      return {
        data: paginatedProducts,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting paginated products:', error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    try {
      const existingProduct = await this.getProduct(id);
      if (!existingProduct) {
        throw new Error(`Product with id ${id} not found`);
      }

      const store = await this.getStore(STORES.PRODUCTS, 'readwrite');
      const updatedProduct = {
        ...existingProduct,
        ...updates,
        updatedAt: new Date()
      };

      const request = store.put(updatedProduct);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(updatedProduct);
        request.onerror = () => reject(new Error(`Failed to update product: ${request.error}`));
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const store = await this.getStore(STORES.PRODUCTS, 'readwrite');
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete product: ${request.error}`));
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Sale operations
  async addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
    try {
      const store = await this.getStore(STORES.SALES, 'readwrite');
      const now = new Date();

      const saleWithTimestamps = {
        ...sale,
        createdAt: now,
        updatedAt: now
      };

      const request = store.add(saleWithTimestamps);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const newSale = { ...saleWithTimestamps, id: request.result as number };
          resolve(newSale);
        };
        request.onerror = () => reject(new Error(`Failed to add sale: ${request.error}`));
      });
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  }

  async getSale(id: number): Promise<Sale | null> {
    try {
      const store = await this.getStore(STORES.SALES);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error(`Failed to get sale: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting sale:', error);
      throw error;
    }
  }

  async getAllSales(): Promise<Sale[]> {
    try {
      const store = await this.getStore(STORES.SALES);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get all sales: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting all sales:', error);
      throw error;
    }
  }

  async getSalesPaginated(page: number = 1, limit: number = 10): Promise<{
    data: Sale[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const allSales = await this.getAllSales();

      // Sort by sale date (newest first)
      allSales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

      const total = allSales.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSales = allSales.slice(startIndex, endIndex);

      return {
        data: paginatedSales,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting paginated sales:', error);
      throw error;
    }
  }

  async searchSalesByCustomerName(customerName: string): Promise<Sale[]> {
    try {
      const allSales = await this.getAllSales();
      const searchLower = customerName.toLowerCase();

      return allSales.filter(sale =>
        sale.customerName.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching sales by customer name:', error);
      throw error;
    }
  }

  // Return operations
  async addReturn(returnItem: Omit<Return, 'id'>): Promise<Return> {
    try {
      const store = await this.getStore(STORES.RETURNS, 'readwrite');
      const now = new Date();

      const returnWithTimestamps = {
        ...returnItem,
        createdAt: now,
        updatedAt: now
      };

      const request = store.add(returnWithTimestamps);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const newReturn = { ...returnWithTimestamps, id: request.result as number };
          resolve(newReturn);
        };
        request.onerror = () => reject(new Error(`Failed to add return: ${request.error}`));
      });
    } catch (error) {
      console.error('Error adding return:', error);
      throw error;
    }
  }

  async getReturn(id: number): Promise<Return | null> {
    try {
      const store = await this.getStore(STORES.RETURNS);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error(`Failed to get return: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting return:', error);
      throw error;
    }
  }
 
  async getAllReturns(): Promise<Return[]> {
    try {
      const store = await this.getStore(STORES.RETURNS);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get all returns: ${request.error}`));
      });
    } catch (error) {
      console.error('Error getting all returns:', error);
      throw error;
    }
  }

  async getReturnsPaginated(page: number = 1, limit: number = 10): Promise<{
    data: Return[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const allReturns = await this.getAllReturns();

      // Sort by return date (newest first)
      allReturns.sort((a, b) => b.returnDate.getTime() - a.returnDate.getTime());

      const total = allReturns.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReturns = allReturns.slice(startIndex, endIndex);

      return {
        data: paginatedReturns,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting paginated returns:', error);
      throw error;
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
      const db = await this.init();
      const transaction = db.transaction([STORES.PRODUCTS, STORES.SALES, STORES.RETURNS], 'readwrite');

      const promises = [
        STORES.PRODUCTS,
        STORES.SALES,
        STORES.RETURNS
      ].map(storeName => {
        return new Promise<void>((resolve, reject) => {
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error}`));
        });
      });

      await Promise.all(promises);
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async getDatabaseInfo(): Promise<{
    name: string;
    version: number;
    stores: string[];
  }> {
    const db = await this.init();
    return {
      name: db.name,
      version: db.version,
      stores: Array.from(db.objectStoreNames)
    };
  }

  // Stock management helpers
  async updateProductStock(productId: number, size: string, newStock: number): Promise<void> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    const updatedSizes = product.sizes.map(s =>
      s.size === size ? { ...s, stock: Math.max(0, newStock) } : s
    );

    await this.updateProduct(productId, { sizes: updatedSizes });
  }

  async getTotalStock(): Promise<number> {
    const products = await this.getAllProducts();
    return products.reduce((total, product) =>
      total + product.sizes.reduce((sizeTotal, size) => sizeTotal + size.stock, 0), 0
    );
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
export default indexedDBService;