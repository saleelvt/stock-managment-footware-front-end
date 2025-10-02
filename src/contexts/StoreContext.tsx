import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { Product, Sale, Return, StockAlert, DashboardStats } from '@/types';
import { indexedDBService } from '@/services/indexedDBService';

interface StoreState {
  products: Product[];
  sales: Sale[];
  returns: Return[];
  lowStockThreshold: number;
  isLoading: boolean;
  isInitialized: boolean;
}

type StoreAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { products: Product[]; sales: Sale[]; returns: Return[] } }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'ADD_RETURN'; payload: Return }
  | { type: 'UPDATE_STOCK'; payload: { productId: string; size: string; quantity: number } }
  | { type: 'LOAD_INITIAL_DATA'; payload: Partial<StoreState> };

const initialState: StoreState = {
  products: [],
  sales: [],
  returns: [],
  lowStockThreshold: 5,
  isLoading: true,
  isInitialized: false,
};

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        isInitialized: action.payload ? false : state.isInitialized,
      };

    case 'SET_DATA':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        isInitialized: true,
      };

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.payload],
      };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        ),
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
      }; 

    case 'ADD_SALE': 
      // Update stock when sale is added
      const updatedProductsAfterSale = state.products.map(product => {
        const saleItem = action.payload.items.find(item => item.productId === product.id);
        if (saleItem) {
          return {
            ...product,
            sizes: product.sizes.map(size => 
              size.size === saleItem.size 
                ? { ...size, stock: Math.max(0, size.stock - saleItem.quantity) }
                : size
            ),
          };
        }
        return product;
      });
 
      return {
        ...state,
        products: updatedProductsAfterSale,
        sales: [...state.sales, action.payload],
      };

    case 'ADD_RETURN':
      // Update stock when return is processed
      const updatedProductsAfterReturn = state.products.map(product => {
        if (product.id === action.payload.productId) {
          return {
            ...product,
            sizes: product.sizes.map(size =>
              size.size === action.payload.size
                ? { ...size, stock: size.stock + action.payload.quantity }
                : size
            ),
          };
        }
        return product;
      });

      return {
        ...state,
        products: updatedProductsAfterReturn,
        returns: [...state.returns, action.payload],
      };

    case 'UPDATE_STOCK':
      return {
        ...state,
        products: state.products.map(product => {
          if (product.id === action.payload.productId) {
            return {
              ...product,
              sizes: product.sizes.map(size =>
                size.size === action.payload.size
                  ? { ...size, stock: action.payload.quantity }
                  : size
              ),
            };
          }
          return product;
        }),
      };

    case 'LOAD_INITIAL_DATA':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

interface StoreContextType {
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  getStockAlerts: () => StockAlert[];
  getDashboardStats: () => DashboardStats;
  getProductByCode: (code: string) => Product | undefined;
  getSaleById: (id: string) => Sale | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  // Load data from IndexedDB on first load
  useEffect(() => {
    const initializeData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Initialize IndexedDB
        await indexedDBService.init();

        // Load all data from IndexedDB
        const [products, sales, returns] = await Promise.all([
          indexedDBService.getAllProducts(),
          indexedDBService.getAllSales(),
          indexedDBService.getAllReturns()
        ]);

        // Transform IndexedDB data to match the expected format
        const transformedProducts: Product[] = products.map(p => ({
          id: p.id?.toString() || '',
          code: p.code,
          name: p.name,
          brand: p.brand || '',
          color: p.color,
          category: p.category || '',
          sizes: p.sizes.map(s => ({ size: s.size, stock: s.stock })),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));

        const transformedSales: Sale[] = sales.map(s => ({
          id: s.id?.toString() || '',
          _id: s.id?.toString(),
          customerName: s.customerName,
          items: s.items.map((item: any) => ({
            productId: item.productId?.toString() || '',
            productCode: item.productCode,
            productName: item.productName,
            size: item.size,
            quantity: item.quantity,
            color: item.color
          })),
          totalItems: s.totalItems,
          saleDate: s.saleDate,
          notes: s.notes
        }));

        const transformedReturns: Return[] = returns.map(r => ({
          id: r.id?.toString() || '',
          originalSaleId: r.originalSaleId?.toString() || '',
          productId: r.productId?.toString() || '',
          productCode: r.productCode,
          productName: r.productName,
          size: r.size,
          quantity: r.quantity,
          customerName: r.customerName,
          returnDate: r.returnDate,
          reason: r.reason,
          notes: r.notes
        }));

        dispatch({
          type: 'SET_DATA',
          payload: {
            products: transformedProducts,
            sales: transformedSales,
            returns: transformedReturns
          }
        });
      } catch (error) {
        console.error('Error initializing data from IndexedDB:', error);
        // Set empty arrays as fallback
        dispatch({
          type: 'SET_DATA',
          payload: {
            products: [],
            sales: [],
            returns: []
          }
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeData();
  }, []);

  const getStockAlerts = (): StockAlert[] => {
    const alerts: StockAlert[] = [];
    state.products.forEach(product => {
      product.sizes.forEach(size => {
        if (size.stock <= state.lowStockThreshold) {
          alerts.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            size: size.size,
            currentStock: size.stock,
            alertThreshold: state.lowStockThreshold,
          });
        }
      });
    });
    return alerts;
  };

  const getDashboardStats = (): DashboardStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = state.sales.filter(sale => 
      sale.saleDate >= today
    ).reduce((sum, sale) => sum + sale.totalItems, 0);

    const totalStock = state.products.reduce((sum, product) => 
      sum + product.sizes.reduce((sizeSum, size) => sizeSum + size.stock, 0), 0
    );

    return {
      totalProducts: state.products.length,
      totalStock,
      lowStockAlerts: getStockAlerts().length,
      todaySales,
      totalSales: state.sales.reduce((sum, sale) => sum + sale.totalItems, 0),
      totalReturns: state.returns.reduce((sum, ret) => sum + ret.quantity, 0),
    };
  };

  const getProductByCode = (code: string): Product | undefined => {
    return state.products.find(product => product.code.toLowerCase() === code.toLowerCase());
  };

  const getSaleById = (id: string): Sale | undefined => {
    return state.sales.find(sale => sale.id === id);
  };

  const value: StoreContextType = {
    state,
    dispatch,
    getStockAlerts,
    getDashboardStats,
    getProductByCode,
    getSaleById,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}