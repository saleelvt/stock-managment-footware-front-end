import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Product, Sale, Return, StockAlert, DashboardStats } from '@/types';
import { sampleProducts, sampleSales, sampleReturns } from '@/data/sampleData';

interface StoreState {
  products: Product[]; 
  sales: Sale[]; 
  returns: Return[];
  lowStockThreshold: number; 
}

type StoreAction =
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
};

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
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

  // Load sample data on first load
  useEffect(() => {
    dispatch({
      type: 'LOAD_INITIAL_DATA',
      payload: {
        products: sampleProducts,
        sales: sampleSales,
        returns: sampleReturns,
      },
    });
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