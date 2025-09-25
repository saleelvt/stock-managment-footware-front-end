const baseUrl =  'https://apifoot.dappssolutions.com';
export const apiUrl = `${baseUrl}`;

export const urlEndPoints = { 
  // Products
  getProducts:(page,limit,search) => `${apiUrl}/api/products?page=${page}&limit=${limit}&search=${search}`,
  addProduct: `${apiUrl}/api/products`,
  updateProduct: (id: string) => `${apiUrl}/api/products/${id}`,
  deleteProduct: (id: string) => `${apiUrl}/api/products/${id}`,


 //getAllProductsForSales
  getAllProducts:  `${apiUrl}/api/products`,

  //sales
  createSale : `${apiUrl}/api/sales`,
  getRecentSales : (page,limit) =>  `${apiUrl}/api/sales?page=${page}&limit=${limit}`,
  searchSaleByName : (name) => `${apiUrl}/api/sales/by-customer?name=${name}`,


  //return
  createReturn:`${apiUrl}/api/returns`,
  getRecentReturns: (page,limit) => `${apiUrl}/api/returns?page=${page}&limit=${limit}`
  
};



export default {
  baseUrl,
  apiUrl,
};
