import apiService from "@/api/apiService";
import { urlEndPoints } from "@/api/apiConfig";

// Stock by size structure
export interface StockBySize {
  size: string;
  quantity: number;
}

// Product structure
export interface Product {
  id?: string;
  productCode: string;
  productName: string;
  brand: string;
  color: string;
  stockBySize: StockBySize[];
}

// Add new product
export const addProduct = async (productData: Product): Promise<Product> => {
  const res = await apiService.post(urlEndPoints.addProduct, productData);
  return res.data;
};


// getProductsPaginated with search
export const getProducts = async (page = 1, limit = 10, search = ""): Promise<{data: Product[], meta: any}> => {
  const res = await apiService.get(urlEndPoints.getProducts(page, limit, search));
  return res.data; 
};

//Update product
export const updateProduct = async (
  id: string,
  productData: Partial<Product>
): Promise<Product> => {
  const res = await apiService.put(urlEndPoints.updateProduct(id), productData);
  return res.data;
};

//Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  await apiService.delete(urlEndPoints.deleteProduct(id));
};


//getAllProducts 
export const ListProducts = async (): Promise<Product[]> => {
  const res = await apiService.get(`${urlEndPoints.getAllProducts}`);
  return res.data; 
};