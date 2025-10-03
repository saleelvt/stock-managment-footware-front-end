/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Return } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Search,
  Package,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchSalesByCustomerName } from '@/services/salesService';
import { addReturn, transformReturnToRequest, CreateReturnRequest, getRecentReturns } from '@/services/returnService';
import { indexedDBService } from '@/services/indexedDBService';
import { ListProducts } from '@/services/productService';
import { Product } from '@/types';

export function Returns() {
  const { state, dispatch, getSaleById } = useStore();
  const { toast } = useToast();
  
  const [searchType, setSearchType] = useState<'customer' | 'code'>('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<string>('');
  const [returnData, setReturnData] = useState({
    productId: '',
    productCode: '',
    size: '',
    quantity: 1,
    reason: '',
    notes: '',
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [recentReturns, setRecentReturns] = useState<Return[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  const handleSearch = async (searchTerm?: any) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      let results = [];

      if (searchType === 'customer') {
        // First try API search
        try {
          results = await searchSalesByCustomerName(searchTerm);
        } catch (apiError) {
          console.error('API search failed, falling back to IndexedDB:', apiError);
          results = [];
        }

        // Also search in IndexedDB for offline customer data
        try {
          const indexedDBResults = await indexedDBService.searchSalesByCustomerName(searchTerm);
          // Combine results, avoiding duplicates by ID
          const combinedResults = [...results];
          indexedDBResults.forEach(indexedDBSale => {
            const exists = combinedResults.some(existingSale => existingSale.id === indexedDBSale.id?.toString());
            if (!exists) {
              // Convert IndexedDB sale format to match main Sale type
              const convertedSale = {
                id: indexedDBSale.id?.toString() || `indexeddb-${Date.now()}`,
                customerName: indexedDBSale.customerName,
                items: indexedDBSale.items,
                totalItems: indexedDBSale.totalItems,
                saleDate: new Date(indexedDBSale.saleDate),
                notes: indexedDBSale.notes,
              };
              combinedResults.push(convertedSale);
            }
          });
          results = combinedResults;
        } catch (indexedDBError) {
          console.error('IndexedDB search failed:', indexedDBError);
          // Continue with API results if available
        }
      } else {
        results = state.sales.filter(sale =>
          sale.items.some(item =>
            item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search sales. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const fetchRecentReturns = async () => {
      try {
        setLoadingReturns(true);
        const returns = await getRecentReturns(4); 
        console.log('Fetched returns: ', returns);
        setRecentReturns(returns);
      } catch (error) {
        console.error('Error fetching recent returns:', error);
        toast({
          title: "Error",
          description: "Failed to load recent returns.",
          variant: "destructive",
        });
        setRecentReturns(state.returns.slice(-10).reverse());
      } finally {
        setLoadingReturns(false);
      }
    };

    fetchRecentReturns();
  }, [state.returns]);

  // Calculate already returned quantities for each product-size combination
  const getAlreadyReturnedQuantity = (saleId: string, productCode: string, size: string): number => {
    if (!saleId) return 0;
    
    // Combine returns from API and local state to get all returns
    const allReturns = [...recentReturns, ...state.returns];
    
    const returnsForThisSale = allReturns.filter(returnItem => 
      returnItem.originalSaleId === saleId && 
      returnItem.productCode === productCode && 
      returnItem.size === size
    );
    
    return returnsForThisSale.reduce((total, returnItem) => total + returnItem.quantity, 0);
  };

  //  Get maximum returnable quantity considering already returned items
  const getMaxReturnableQuantity = (saleId: string, productCode: string, size: string): number => {
    if (!selectedSaleData) return 0;
    
    const soldItem = selectedSaleData.items.find(
      item => item.productCode === productCode && item.size === size
    );
    
    if (!soldItem) return 0;
    
    const alreadyReturned = getAlreadyReturnedQuantity(saleId, productCode, size);
    const maxReturnable = soldItem.quantity - alreadyReturned;
    
    return Math.max(0, maxReturnable); // Ensure it's not negative
  };

  // Check if product-size combination can be returned
  const canReturnProductSize = (productCode: string, size: string): boolean => {
    if (!selectedSale) return false;
    
    const maxReturnable = getMaxReturnableQuantity(selectedSale, productCode, size);
    return maxReturnable > 0;
  };

  const filteredSales = searchTerm ? searchResults : state.sales.slice(0, 10);

  const selectedSaleData = selectedSale ? (
    searchResults.find(sale => sale.id === selectedSale) || 
    getSaleById(selectedSale)
  ) : null;

  const processReturn = async () => {
    if (!selectedSaleData) {
      toast({
        title: "Invalid Return",
        description: "Please select a sale.",
        variant: "destructive",
      });
      return;
    }

    if (!returnData.productCode || !returnData.size) {
      toast({
        title: "Invalid Return",
        description: "Please select both product and size.",
        variant: "destructive",
      });
      return;
    }

    if (returnData.quantity <= 0) {
      toast({
        title: "Invalid Return",
        description: "Please enter a valid quantity (greater than 0).",
        variant: "destructive",
      });
      return;
    }

    if (!returnData.reason.trim()) {
      toast({
        title: "Invalid Return",
        description: "Please provide a reason for the return.",
        variant: "destructive",
      });
      return;
    }

    // Check if product can still be returned
    if (!canReturnProductSize(returnData.productCode, returnData.size)) {
      toast({
        title: "Invalid Return",
        description: "This product and size combination has already been fully returned.",
        variant: "destructive",
      });
      return;
    }

    // Check if quantity exceeds available returnable quantity
     const maxReturnable = getMaxReturnableQuantity(selectedSale, returnData.productCode, returnData.size);
     if (returnData.quantity > maxReturnable) {
       toast({
         title: "Invalid Return",
         description: `Return quantity cannot exceed available returnable quantity (${maxReturnable}).`,
         variant: "destructive",
       });
       return;
     }

     // Additional validation for return quantity
     if (returnData.quantity <= 0) {
       toast({
         title: "Invalid Return",
         description: "Return quantity must be greater than 0.",
         variant: "destructive",
       });
       return;
     }

    // Find product in state
    let product = state.products.find(p => p.code === returnData.productCode);
    
    // If product not found, use sale item data to create necessary product info
    if (!product) {
      const soldItem = selectedSaleData.items.find(
        item => item.productCode === returnData.productCode && item.size === returnData.size
      );
      
      product = {
        id: `temp-${returnData.productCode}-${Date.now()}`,
        code: returnData.productCode,
        name: soldItem?.productName || returnData.productCode,
        category: soldItem?.category || 'Unknown',
        brand: soldItem?.brand || 'Unknown',
        color: soldItem?.color || 'Unknown',
        sizes: [{ size: returnData.size, stock: 0 }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    try {
      setProcessingReturn(true);

      // Prepare return data for backend API
      const returnItemData: Omit<Return, 'id' | 'returnDate' | 'customerName' | 'productName' | 'productId'> = {
        originalSaleId: selectedSale,
        productCode: returnData.productCode,
        size: returnData.size,
        quantity: returnData.quantity,
        reason: returnData.reason.trim(),
        notes: returnData.notes.trim() || undefined,
      };

      // Transform to backend request format
      const requestData: CreateReturnRequest = transformReturnToRequest(returnItemData);

      // Send to backend API
      const newReturn = await addReturn(requestData);

      // Also dispatch to local state
      const returnItem: Return = {
        ...newReturn,
        id: newReturn.id,
        returnDate: newReturn.returnDate,
        customerName: selectedSaleData.customerName,
        productName: product.name,
      };

      dispatch({ type: 'ADD_RETURN', payload: returnItem });

      // Update stock in IndexedDB for the returned item
      try {
        const currentStock = product.sizes.find(s => s.size === returnData.size)?.stock || 0;
        const newStock = currentStock + returnData.quantity;

        await indexedDBService.updateProductStock(parseInt(product.id), returnData.size, newStock);
        console.log(`Stock persisted to IndexedDB: ${returnData.productCode} (${returnData.size}) from ${currentStock} to ${newStock}`);

        // Refresh products from IndexedDB to get updated stock values
        // Note: We need access to fetchProducts function from Sales component or create our own
        const response = await ListProducts();
        const source = Array.isArray(response)
          ? response
          : Array.isArray((response as any)?.data)
            ? (response as any).data
            : [];

        const formattedProducts: Product[] = source.map((productData: any) => ({
          id: productData.id,
          code: productData.productCode,
          name: productData.productName,
          brand: productData.brand,
          color: productData.color,
          category: productData.category,
          sizes: productData.stockBySize.map((sizeStock: any) => ({
            size: sizeStock.size,
            stock: sizeStock.quantity
          })),
          createdAt: new Date(productData.createdAt),
          updatedAt: new Date(productData.updatedAt)
        }));

        // Update the products in state through context
        dispatch({
          type: 'SET_DATA',
          payload: {
            products: formattedProducts,
            sales: state.sales,
            returns: state.returns
          }
        });
      } catch (error) {
        console.error('Failed to update stock in IndexedDB for return:', error);
        // Continue with success flow even if IndexedDB update fails
      }
      
      // Refresh recent returns after successful return
      try {
        const updatedReturns = await getRecentReturns(4);
        setRecentReturns(updatedReturns);
      } catch (error) {
        console.error('Error refreshing recent returns:', error);
        setRecentReturns(prev => [returnItem, ...prev.slice(0, 9)]);
      }
      

      setSelectedSale('');
      setReturnData({
        productId: '',
        productCode: '',
        size: '',
        quantity: 1,
        reason: '',
        notes: '',
      });
      setSearchTerm('');
      setSearchResults([]);
      
      toast({
        title: "Return Processed",
        description: `Return for ${selectedSaleData.customerName} has been processed successfully.`,
      });
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        title: "Error",
        description: "Failed to process return. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingReturn(false);
    }
  };

  const getReturnableItems = () => {
    if (!selectedSaleData) return [];
    
    // Filter out items that have been fully returned
    return selectedSaleData.items.filter(item => 
      canReturnProductSize(item.productCode, item.size)
    );
  };

  //  Get return status for display
  const getReturnStatus = (productCode: string, size: string) => {
    if (!selectedSale) return null;
    
    const soldItem = selectedSaleData?.items.find(
      item => item.productCode === productCode && item.size === size
    );
    
    if (!soldItem) return null;
    
    const alreadyReturned = getAlreadyReturnedQuantity(selectedSale, productCode, size);
    const maxReturnable = getMaxReturnableQuantity(selectedSale, productCode, size);
    
    return {
      sold: soldItem.quantity,
      returned: alreadyReturned,
      remaining: maxReturnable,
      fullyReturned: maxReturnable === 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Returns</h1>
        <p className="text-muted-foreground">Process product returns and manage inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5" />
                <span>Process Return</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Search Sales */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label>Search Method</Label>
                    <Select value={searchType} onValueChange={(value: 'customer' | 'code') => {
                      setSearchType(value);
                      setSearchResults([]);
                      setSearchTerm('');
                      setSelectedSale('');
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">By Customer Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Search Term</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={searchType === 'customer' ? 'Customer number...' : 'Product code...'}
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value); 
                            handleSearch(e.target.value);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleSearch(); 
                          }}
                          className="pl-10"
                        />
                      </div>
                      <Button 
                        onClick={handleSearch} 
                        disabled={searching || !searchTerm.trim()}
                        variant="outline"
                      >
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchTerm && (
                  <div className="space-y-2">
                    <Label>
                      Search Results {searching && '(Searching...)'}
                      {!searching && searchResults.length > 0 && ` (${searchResults.length} found)`}
                    </Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {searching ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : filteredSales.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No sales found
                        </div>
                      ) : (
                        filteredSales.map(sale => (
                          <div
                            key={sale.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedSale === sale.id 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:bg-muted'
                            }`}
                            onClick={() => setSelectedSale(sale.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{sale.customerName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sale.saleDate.toLocaleDateString()} • {sale.totalItems} items
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Items: {sale.items.map(item => `${item.productCode}`).join(', ')}
                                </p>
                              </div>
                              <Badge variant="outline">{sale.items.length} products</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Return Details */}
              {selectedSaleData && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium">Sale Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-medium">{selectedSaleData.customerName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{selectedSaleData.saleDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground text-sm">Items sold:</span>
                    <div className="mt-2 space-y-2">
                      {selectedSaleData.items.map((item, index) => {
                        const returnStatus = getReturnStatus(item.productCode, item.size);
                        return (
                          <div key={index} className={`text-sm p-2 rounded ${
                            returnStatus?.fullyReturned ? 'bg-green-50 border border-green-200' : 'bg-white'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span>
                                {item.productCode} - Size {item.size} - Qty {item.quantity} ({item.color})
                              </span>
                              {returnStatus && (
                                <Badge variant={returnStatus.fullyReturned ? "default" : "outline"} className="text-xs">
                                  {returnStatus.fullyReturned ? "Fully Returned" : `${returnStatus.returned}/${returnStatus.sold} returned`}
                                </Badge>
                              )}
                            </div>
                            {returnStatus && !returnStatus.fullyReturned && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Can return: {returnStatus.remaining} more
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Return Form */}
              {selectedSaleData && (
                <div className="space-y-4">
                  <h3 className="font-medium">Return Item</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Product</Label>
                      <Select
                        value={returnData.productCode}
                        onValueChange={(value) => {
                          const item = selectedSaleData.items.find(i => i.productCode === value);
                          if (item) {
                            const product = state.products.find(p => p.code === value);
                            const returnStatus = getReturnStatus(value, item.size);
                            
                            setReturnData(prev => ({
                              ...prev,
                              productId: product ? product.id : `temp-${value}`,
                              productCode: value,
                              size: '',
                              quantity: 1
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReturnableItems().map((item, index) => (
                            <SelectItem key={index} value={item.productCode}>
                              {item.productCode} - {item.productName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Size</Label>
                      <Select
                        value={returnData.size}
                        onValueChange={(value) => {
                          setReturnData(prev => ({ 
                            ...prev, 
                            size: value,
                            quantity: 1 
                          }));
                        }}
                        disabled={!returnData.productCode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {returnData.productCode && 
                            selectedSaleData.items
                              .filter(item => 
                                item.productCode === returnData.productCode && 
                                canReturnProductSize(item.productCode, item.size)
                              )
                              .map((item, index) => {
                                const returnStatus = getReturnStatus(item.productCode, item.size);
                                return (
                                  <SelectItem key={index} value={item.size}>
                                    Size {item.size} (Available: {returnStatus?.remaining || 0})
                                  </SelectItem>
                                );
                              })
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {returnData.productCode && returnData.size && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-800">
                          You can return up to {getMaxReturnableQuantity(selectedSale, returnData.productCode, returnData.size)} units
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Return Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      max={returnData.productCode && returnData.size ? 
                        getMaxReturnableQuantity(selectedSale, returnData.productCode, returnData.size) : 1
                      }
                      value={returnData.quantity}
                      onChange={(e) => setReturnData(prev => ({ 
                        ...prev, 
                        quantity: Math.min(
                          parseInt(e.target.value) || 1, 
                          returnData.productCode && returnData.size ? 
                            getMaxReturnableQuantity(selectedSale, returnData.productCode, returnData.size) : 1
                        )
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Reason for Return *</Label>
                    <Textarea
                      value={returnData.reason}
                      onChange={(e) => setReturnData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Reason for return (required)..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={returnData.notes}
                      onChange={(e) => setReturnData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={processReturn}
                    className="w-full"
                    disabled={!returnData.productCode || !returnData.size || !returnData.reason.trim() || processingReturn || 
                      !canReturnProductSize(returnData.productCode, returnData.size)
                    }
                  >
                    {processingReturn ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Process Return
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Returns */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingReturns ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading returns...</p>
                  </div>
                ) : recentReturns.length > 0 ? (
                  recentReturns.map(returnItem => (
                    <div key={returnItem.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{returnItem.customerName}</span>
                        <Badge variant="outline">{returnItem.quantity} returned</Badge>
                      </div>
                      <div className="text-sm">
                        <p>{returnItem.productCode} - Size {returnItem.size}</p>
                        <p className="text-muted-foreground">
                          {returnItem.returnDate.toLocaleDateString()}
                        </p>
                        {returnItem.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {returnItem.reason}
                          </p>
                        )}
                        {returnItem.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Notes: {returnItem.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No returns yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}