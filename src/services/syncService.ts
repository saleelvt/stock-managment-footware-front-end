// Data Synchronization Service
// Handles synchronization between IndexedDB and remote API for future use

import { indexedDBService } from './indexedDBService';
import { addProduct, getProducts } from './productService';
import { addSale, getLastSales } from './salesService';
import { addReturn, getReturns } from './returnService';

export interface SyncResult {
  success: boolean;
  productsSynced: number;
  salesSynced: number;
  returnsSynced: number;
  errors: string[];
}

export interface ProductSyncData {
  id?: string;
  productCode: string;
  productName: string;
  brand: string;
  color: string;
  category?: string;
  stockBySize: Array<{
    size: string;
    quantity: number;
  }>;
}

export interface SaleSyncData {
  id?: string;
  customerName: string;
  items: Array<{
    productId: string;
    productCode: string;
    size: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface ReturnSyncData {
  id?: string;
  saleId: string;
  productCode: string;
  size: string;
  quantity: number;
  reason: string;
  notes?: string;
}

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('App is online - sync enabled');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('App is offline - sync disabled');
    });
  }

  // Check if sync is possible
  canSync(): boolean {
    return this.isOnline && !this.syncInProgress;
  }

  // Sync all local data to remote API
  async syncToRemote(): Promise<SyncResult> {
    if (!this.canSync()) {
      return {
        success: false,
        productsSynced: 0,
        salesSynced: 0,
        returnsSynced: 0,
        errors: ['Cannot sync: offline or sync in progress']
      };
    }

    const result: SyncResult = {
      success: true,
      productsSynced: 0,
      salesSynced: 0,
      returnsSynced: 0,
      errors: []
    };

    this.syncInProgress = true;

    try {
      // Sync products
      await this.syncProductsToRemote(result);

      // Sync sales
      await this.syncSalesToRemote(result);

      // Sync returns
      await this.syncReturnsToRemote(result);

    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Sync products from remote API to local IndexedDB
  async syncFromRemote(): Promise<SyncResult> {
    if (!this.canSync()) {
      return {
        success: false,
        productsSynced: 0,
        salesSynced: 0,
        returnsSynced: 0,
        errors: ['Cannot sync: offline or sync in progress']
      };
    }

    const result: SyncResult = {
      success: true,
      productsSynced: 0,
      salesSynced: 0,
      returnsSynced: 0,
      errors: []
    };

    this.syncInProgress = true;

    try {
      // Sync products from remote to local
      await this.syncProductsFromRemote(result);

      // Sync sales from remote to local
      await this.syncSalesFromRemote(result);

      // Sync returns from remote to local
      await this.syncReturnsFromRemote(result);

    } catch (error) {
      console.error('Sync from remote error:', error);
      result.success = false;
      result.errors.push(`Sync from remote failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Sync products to remote
  private async syncProductsToRemote(result: SyncResult): Promise<void> {
    try {
      const localProducts = await indexedDBService.getAllProducts();

      for (const product of localProducts) {
        try {
          const syncData: ProductSyncData = {
            productCode: product.code,
            productName: product.name,
            brand: product.brand || '',
            color: product.color,
            category: product.category,
            stockBySize: product.sizes.map(size => ({
              size: size.size,
              quantity: size.stock
            }))
          };

          // Try to add product to remote API
          await addProduct(syncData);
          result.productsSynced++;
        } catch (error) {
          console.error(`Failed to sync product ${product.code}:`, error);
          result.errors.push(`Product ${product.code}: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing products to remote:', error);
      result.errors.push(`Products sync error: ${error}`);
    }
  }

  // Sync sales to remote
  private async syncSalesToRemote(result: SyncResult): Promise<void> {
    try {
      const localSales = await indexedDBService.getAllSales();

      for (const sale of localSales) {
        try {
          const syncData: SaleSyncData = {
            customerName: sale.customerName,
            items: sale.items.map(item => ({
              productId: item.productId.toString(),
              productCode: item.productCode,
              size: item.size,
              quantity: item.quantity
            })),
            notes: sale.notes
          };

          // Try to add sale to remote API
          await addSale(syncData);
          result.salesSynced++;
        } catch (error) {
          console.error(`Failed to sync sale ${sale.id}:`, error);
          result.errors.push(`Sale ${sale.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing sales to remote:', error);
      result.errors.push(`Sales sync error: ${error}`);
    }
  }

  // Sync returns to remote
  private async syncReturnsToRemote(result: SyncResult): Promise<void> {
    try {
      const localReturns = await indexedDBService.getAllReturns();

      for (const returnItem of localReturns) {
        try {
          const syncData: ReturnSyncData = {
            saleId: returnItem.originalSaleId.toString(),
            productCode: returnItem.productCode,
            size: returnItem.size,
            quantity: returnItem.quantity,
            reason: returnItem.reason || '',
            notes: returnItem.notes
          };

          // Try to add return to remote API
          await addReturn(syncData);
          result.returnsSynced++;
        } catch (error) {
          console.error(`Failed to sync return ${returnItem.id}:`, error);
          result.errors.push(`Return ${returnItem.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing returns to remote:', error);
      result.errors.push(`Returns sync error: ${error}`);
    }
  }

  // Sync products from remote to local
  private async syncProductsFromRemote(result: SyncResult): Promise<void> {
    try {
      const remoteProductsResponse = await getProducts(1, 1000); // Get all products
      const remoteProducts = remoteProductsResponse.data;

      for (const product of remoteProducts) {
        try {
          // Check if product already exists locally
          const existingProduct = await indexedDBService.getProductByCode(product.productCode);

          if (existingProduct) {
            // Update existing product
            await indexedDBService.updateProduct(existingProduct.id!, {
              name: product.productName,
              brand: product.brand,
              color: product.color,
              category: product.category,
              sizes: product.stockBySize.map((size: any) => ({
                size: size.size,
                stock: size.quantity
              }))
            });
          } else {
            // Add new product
            await indexedDBService.addProduct({
              code: product.productCode,
              name: product.productName,
              brand: product.brand || '',
              color: product.color,
              category: product.category,
              sizes: product.stockBySize.map((size: any) => ({
                size: size.size,
                stock: size.quantity
              })),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }

          result.productsSynced++;
        } catch (error) {
          console.error(`Failed to sync product ${product.productCode} from remote:`, error);
          result.errors.push(`Product ${product.productCode} from remote: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing products from remote:', error);
      result.errors.push(`Products from remote sync error: ${error}`);
    }
  }

  // Sync sales from remote to local
  private async syncSalesFromRemote(result: SyncResult): Promise<void> {
    try {
      const remoteSalesResponse = await getLastSales(1, 1000); // Get all sales
      const remoteSales = remoteSalesResponse;

      for (const sale of remoteSales) {
        try {
          // Check if sale already exists locally
          const existingSale = sale.id ? await indexedDBService.getSale(parseInt(sale.id)) : null;

          if (!existingSale) {
            // Add new sale
            await indexedDBService.addSale({
              customerName: sale.customerName,
              items: sale.items.map((item: any) => ({
                productId: parseInt(item.productId),
                productCode: item.productCode,
                productName: item.productName,
                size: item.size,
                quantity: item.quantity,
                color: item.color
              })),
              totalItems: sale.totalItems,
              saleDate: sale.saleDate,
              notes: sale.notes,
              createdAt: sale.saleDate,
              updatedAt: sale.saleDate
            });

            result.salesSynced++;
          }
        } catch (error) {
          console.error(`Failed to sync sale ${sale.id} from remote:`, error);
          result.errors.push(`Sale ${sale.id} from remote: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing sales from remote:', error);
      result.errors.push(`Sales from remote sync error: ${error}`);
    }
  }

  // Sync returns from remote to local
  private async syncReturnsFromRemote(result: SyncResult): Promise<void> {
    try {
      const remoteReturnsResponse = await getReturns(1, 1000); // Get all returns
      const remoteReturns = remoteReturnsResponse.data;

      for (const returnItem of remoteReturns) {
        try {
          // Check if return already exists locally
          const existingReturn = returnItem.id ? await indexedDBService.getReturn(parseInt(returnItem.id)) : null;

          if (!existingReturn) {
            // Add new return
            await indexedDBService.addReturn({
              originalSaleId: parseInt(returnItem.originalSaleId),
              productId: parseInt(returnItem.productId),
              productCode: returnItem.productCode,
              productName: returnItem.productName,
              size: returnItem.size,
              quantity: returnItem.quantity,
              customerName: returnItem.customerName,
              returnDate: returnItem.returnDate,
              reason: returnItem.reason,
              notes: returnItem.notes,
              color: returnItem.color,
              createdAt: returnItem.returnDate,
              updatedAt: returnItem.returnDate
            });

            result.returnsSynced++;
          }
        } catch (error) {
          console.error(`Failed to sync return ${returnItem.id} from remote:`, error);
          result.errors.push(`Return ${returnItem.id} from remote: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing returns from remote:', error);
      result.errors.push(`Returns from remote sync error: ${error}`);
    }
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    canSync: boolean;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      canSync: this.canSync()
    };
  }

  // Force set online status (for testing)
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;