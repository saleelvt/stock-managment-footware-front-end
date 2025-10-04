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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RotateCcw, 
  Search,
  Package,
  Loader2,
  AlertTriangle,
  Check,
  Plus,
  X
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
    quantity: 0,
    reason: '',
    notes: '',
  });
  
   
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<{[key: string]: {
    saleId: string;
    productCode: string;
    size: string;
    quantity: number;
    reason: string;
  }}>({});
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
 
  const getAlreadyReturnedQuantity = (saleId: string, productCode: string, size: string): number => {
    if (!saleId) return 0;
    
    
    const allReturns = [...recentReturns];
    state.returns.forEach(returnItem => {
      const exists = allReturns.some(existingReturn => existingReturn.id === returnItem.id);
      if (!exists) {
        allReturns.push(returnItem);
      }
    });
    
    const returnsForThisSale = allReturns.filter(returnItem => 
      returnItem.originalSaleId === saleId && 
      returnItem.productCode === productCode && 
      String(returnItem.size) === String(size)
    );
    
    const totalReturned = returnsForThisSale.reduce((total, returnItem) => total + returnItem.quantity, 0);
    
    return totalReturned;
  };

  //  Get maximum returnable quantity considering already returned items
  const getMaxReturnableQuantity = (saleId: string, productCode: string, size: string): number => {
    console.log('getMaxReturnableQuantity called with:', { saleId, productCode, size });
    console.log('selectedSaleData:', selectedSaleData);
    console.log('searchResults:', searchResults);
    
     
    let currentSaleData = null;
    
    // First try searchResults
    if (searchResults.length > 0) {
      currentSaleData = searchResults.find(sale => sale.id === saleId);
      console.log('Found in searchResults:', currentSaleData);
    }
    
     
    if (!currentSaleData) {
      currentSaleData = getSaleById(saleId);
      console.log('Found via getSaleById:', currentSaleData);
    }
    
    // If still not found, use selectedSaleData
    if (!currentSaleData) {
      currentSaleData = selectedSaleData;
      console.log('Using selectedSaleData as fallback:', currentSaleData);
    }
    
    console.log('Final currentSaleData:', currentSaleData);
    
    if (!currentSaleData || !currentSaleData.items) {
      console.log('No currentSaleData or items, returning 0');
      return 0;
    }
    
    console.log('Looking for item in sale data:', { productCode, size });
    console.log('Available items:', currentSaleData.items.map(item => ({ 
      productCode: item.productCode, 
      size: item.size,
      quantity: item.quantity 
    })));
    
    const soldItem = currentSaleData.items.find(
      item => item.productCode === productCode && String(item.size) === String(size)
    );
    
    console.log('soldItem found in getMaxReturnableQuantity:', soldItem);
    
    if (!soldItem) {
      console.log('No soldItem found in getMaxReturnableQuantity, returning 0');
      console.log('This means the item was not found in the sale data');
      return 0;
    }
    
    const alreadyReturned = getAlreadyReturnedQuantity(saleId, productCode, size);
    const maxReturnable = soldItem.quantity - alreadyReturned;
    
    console.log('getMaxReturnableQuantity calculation:', {
      soldQuantity: soldItem.quantity,
      alreadyReturned,
      maxReturnable
    });
    
    return Math.max(0, maxReturnable); // Ensure it's not negative
  };

  // Check if product-size combination can be returned
  const canReturnProductSize = (productCode: string, size: string): boolean => {
    if (!selectedSale) return false;
    
    const maxReturnable = getMaxReturnableQuantity(selectedSale, productCode, size);
    return maxReturnable > 0;
  };

  // Generate unique key for item selection (includes sale ID for multi-sale support)
  const getItemKey = (saleId: string, productCode: string, size: string): string => {
    return `${saleId}-${productCode}-${size}`;
  };

  // Add/remove item from return selection
  const toggleItemSelection = (productCode: string, size: string) => {
    console.log('=== toggleItemSelection called ===');
    console.log('Input params:', { productCode, size, productCodeType: typeof productCode, sizeType: typeof size });
    console.log('selectedSaleData:', selectedSaleData);
    console.log('selectedSale:', selectedSale);
    
    // Ensure we have a selected sale
    if (!selectedSale) {
      toast({
        title: "No Sale Selected",
        description: "Please select a sale first.",
        variant: "destructive",
      });
      return;
    }
    
    const itemKey = getItemKey(selectedSale, productCode, size);
    console.log('Generated itemKey:', itemKey);
    
    const maxReturnable = getMaxReturnableQuantity(selectedSale, productCode, size);
    console.log('maxReturnable:', maxReturnable);
    
     
    if (maxReturnable <= 0) {
      toast({
        title: "Cannot Select Item",
        description: `This product and size combination (${productCode} - ${size}) has already been fully returned.`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedItemsToReturn(prev => {
      if (prev[itemKey]) {
        // Remove from selection
        console.log('Removing item from selection:', itemKey);
        const newSelection = { ...prev };
        delete newSelection[itemKey];
        return newSelection;
      } else {
        // Add to selection
        const newItem = {
          saleId: selectedSale,
          productCode,
          size,
          quantity: 0,
          reason: ''
        };
        console.log('Adding item to selection:', newItem);
        console.log('Full new selection will be:', { ...prev, [itemKey]: newItem });
        return {
          ...prev,
          [itemKey]: newItem
        };
      }
    });
  };

  // Update quantity for a selected item
  const updateItemQuantity = (itemKey: string, quantity: number) => {
    const item = selectedItemsToReturn[itemKey];
    if (!item) return;
    
    const maxQty = getMaxReturnableQuantity(item.saleId, item.productCode, item.size);
     
    const validQuantity = quantity === 0 ? 0 : Math.max(1, Math.min(quantity, maxQty));
    
    setSelectedItemsToReturn(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        quantity: validQuantity
      }
    }));
  };

  // Update reason for a selected item
  const updateItemReason = (itemKey: string, reason: string) => {
    setSelectedItemsToReturn(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        reason
      }
    }));
  };

  const filteredSales = searchTerm ? searchResults : state.sales.slice(0, 10);

  const selectedSaleData = selectedSale ? (
    searchResults.find(sale => sale.id === selectedSale) || 
    getSaleById(selectedSale)
  ) : null;
  
  // Debug: Log the source of selectedSaleData
  if (selectedSaleData) {
    const fromSearchResults = searchResults.find(sale => sale.id === selectedSale);
    console.log('selectedSaleData source:', fromSearchResults ? 'searchResults' : 'getSaleById');
    console.log('selectedSaleData items count:', selectedSaleData.items?.length);
  }
  

  const processReturn = async () => {
    console.log('=== processReturn called ===');
    console.log('selectedSaleData:', selectedSaleData);
    console.log('selectedSale:', selectedSale);
    console.log('selectedItemsToReturn:', selectedItemsToReturn);
    
    if (!selectedSaleData) {
      toast({
        title: "Invalid Return",
        description: "Please select a sale.",
        variant: "destructive",
      });
      return;
    }

    // Check if we have multiple items selected or single item from old form
    const selectedItemsKeys = Object.keys(selectedItemsToReturn);
    console.log('selectedItemsKeys:', selectedItemsKeys);
    
    if (selectedItemsKeys.length === 0 && (!returnData.productCode || !returnData.size)) {
      toast({
        title: "Invalid Return",
        description: "Please select at least one item to return.",
        variant: "destructive",
      });
      return;
    }

    // Validate multiple returns or convert single return to multiple format
    let itemsToProcess: Array<{
      saleId: string;
      productCode: string;
      size: string;
      quantity: number;
      reason: string;
    }> = [];

    if (selectedItemsKeys.length > 0) {
      // Multiple returns selected
      console.log('Processing multiple returns...');
      selectedItemsKeys.forEach(key => {
        const item = selectedItemsToReturn[key];
        console.log('Processing item for key:', key, 'item:', item);
        
        if (item.quantity <= 0) {
          toast({
            title: "Invalid Return",
            description: `Please enter a valid quantity for ${item.productCode} size ${item.size}.`,
            variant: "destructive",
          });
          return;
        }
        itemsToProcess.push({
          saleId: item.saleId,
          productCode: item.productCode,
          size: item.size,
          quantity: item.quantity,
          reason: item.reason
        });
      });
    } else if (returnData.productCode && returnData.size && returnData.quantity > 0) {
      // Single return from old form
      if (returnData.quantity <= 0) {
      toast({
        title: "Invalid Return",
          description: "Please enter a valid quantity (greater than 0).",
        variant: "destructive",
      });
      return;
    }

      itemsToProcess.push({
        saleId: selectedSale,
        productCode: returnData.productCode,
        size: returnData.size,
        quantity: returnData.quantity,
        reason: returnData.reason
      });
    }


    // Validate all items can be returned
    console.log('=== Starting validation ===');
    console.log('itemsToProcess:', itemsToProcess);
    
    for (const item of itemsToProcess) {
      console.log('Validating item:', item);
      console.log('Item types:', { 
        productCodeType: typeof item.productCode, 
        sizeType: typeof item.size 
      });
      
      // Get the sale data for this specific item
      const itemSaleData = searchResults.find(sale => sale.id === item.saleId) || 
                          getSaleById(item.saleId);
      
      console.log('Using itemSaleData for validation:', itemSaleData);
      console.log('itemSaleData.items:', itemSaleData?.items);
      
      if (!itemSaleData) {
        toast({
          title: "Invalid Return",
          description: `Sale data not found for item ${item.productCode} size ${item.size}.`,
          variant: "destructive",
        });
        return;
      }
      
      // Check if the item exists in the sale - use more flexible matching with type conversion
      const soldItem = itemSaleData.items.find(
        saleItem => 
          saleItem.productCode === item.productCode && 
          String(saleItem.size) === String(item.size)
      );
      
      console.log('soldItem found:', soldItem);
      
      if (!soldItem) {
        console.log('=== ITEM NOT FOUND - DEBUGGING ===');
        console.log('Looking for:', { productCode: item.productCode, size: item.size, saleId: item.saleId });
        console.log('Available items in sale:');
        itemSaleData.items.forEach((saleItem, index) => {
          console.log(`Item ${index}:`, {
            productCode: saleItem.productCode,
            size: saleItem.size,
            productCodeType: typeof saleItem.productCode,
            sizeType: typeof saleItem.size,
            productCodeMatch: saleItem.productCode === item.productCode,
            sizeMatch: String(saleItem.size) === String(item.size),
            exactMatch: saleItem.productCode === item.productCode && String(saleItem.size) === String(item.size)
          });
        });
        
        toast({
          title: "Invalid Return",
          description: `Product ${item.productCode} size ${item.size} was not found in sale ${item.saleId}.`,
          variant: "destructive",
        });
        return;
      }

      // Get the maximum returnable quantity for this item
      const maxReturnable = getMaxReturnableQuantity(item.saleId, item.productCode, item.size);
      
      if (maxReturnable <= 0) {
        toast({
          title: "Invalid Return",
          description: `This product and size combination (${item.productCode} - ${item.size}) has already been fully returned.`,
          variant: "destructive",
        });
        return;
      }

      if (item.quantity > maxReturnable) {
        toast({
          title: "Invalid Return",
          description: `Return quantity for ${item.productCode} size ${item.size} cannot exceed available returnable quantity (${maxReturnable}).`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setProcessingReturn(true);

      const processedReturns: Return[] = [];

      // Process each return item
      for (const item of itemsToProcess) {
        // Find or create product info
        let product = state.products.find(p => p.code === item.productCode);
        
    if (!product) {
      const soldItem = selectedSaleData.items.find(
            saleItem => saleItem.productCode === item.productCode && saleItem.size === item.size
      );
      
      product = {
            id: `temp-${item.productCode}-${Date.now()}`,
            code: item.productCode,
            name: soldItem?.productName || item.productCode,
        category: soldItem?.category || 'Unknown',
        brand: soldItem?.brand || 'Unknown',
        color: soldItem?.color || 'Unknown',
            sizes: [{ size: item.size, stock: 0 }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

        // Prepare return data for backend API
        const returnItemData: Omit<Return, 'id' | 'returnDate' | 'customerName' | 'productName' | 'productId'> = {
          originalSaleId: item.saleId,
          productCode: item.productCode,
          size: item.size,
          quantity: item.quantity,
          reason: item.reason.trim(),
          notes: '',
        };

      // Transform to backend request format
      const requestData: CreateReturnRequest = transformReturnToRequest(returnItemData);

      // Send to backend API
      const newReturn = await addReturn(requestData);

        // Create return object for local state
      const returnItem: Return = {
        ...newReturn,
        id: newReturn.id,
        returnDate: newReturn.returnDate,
        customerName: selectedSaleData.customerName,
        productName: product.name,
      };

      dispatch({ type: 'ADD_RETURN', payload: returnItem });
        processedReturns.push(returnItem);
      }

      // Update stock in IndexedDB for all returned items
      try {
        for (const item of itemsToProcess) {
          const idbProduct = await indexedDBService.getProductByCode(item.productCode);
        if (!idbProduct || !idbProduct.id) {
            throw new Error(`Product with code ${item.productCode} not found in IndexedDB`);
        }

          const sizeEntry = idbProduct.sizes.find(s => s.size === item.size);
        const currentStock = sizeEntry ? sizeEntry.stock : 0;
          const newStock = currentStock + item.quantity;

          await indexedDBService.updateProductStock(idbProduct.id, item.size, newStock);
          console.log(`Stock persisted to IndexedDB: ${item.productCode} (${item.size}) from ${currentStock} to ${newStock}`);
        }

        // Refresh products from IndexedDB to get updated stock values
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
        toast({
          title: "Stock Not Updated",
          description: "The product's stock could not be updated. Please sync products and try again.",
          variant: "destructive",
        });
      }
      
      // Refresh recent returns after successful return
      try {
        const updatedReturns = await getRecentReturns(4);
        setRecentReturns(updatedReturns);
      } catch (error) {
        console.error('Error refreshing recent returns:', error);
        setRecentReturns(prev => [...processedReturns, ...prev.slice(0, 9)]);
      }
      

      // Clear selections and form
      setSelectedSale('');
      setSelectedItemsToReturn({});
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
        title: "Returns Processed",
        description: `${processedReturns.length} return(s) for ${selectedSaleData.customerName} has been processed successfully.`,
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
      item => item.productCode === productCode && String(item.size) === String(size)
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
                    <span className="text-muted-foreground text-sm">Items sold (select to return):</span>
                    <div className="mt-2 space-y-2">
                      {selectedSaleData.items.map((item, index) => {
                        const returnStatus = getReturnStatus(item.productCode, item.size);
                        const itemKey = getItemKey(selectedSale, item.productCode, item.size);
                        const isSelected = !!selectedItemsToReturn[itemKey];
                        const canReturn = canReturnProductSize(item.productCode, item.size);
                        
                        return (
                          <div key={index} className={`text-sm p-3 border rounded-lg ${
                            returnStatus?.fullyReturned ? 'bg-green-50 border-green-200' : 'bg-white border-border hover:<｜tool▁sep｜>muted'
                          } ${isSelected ? 'bg-primary/10 border-primary' : ''}`}>
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleItemSelection(item.productCode, item.size)}
                                disabled={returnStatus?.fullyReturned || !canReturn}
                                className="mt-1"
                              />
                              <div className="flex-1">
                            <div className="flex justify-between items-center">
                                  <span className="font-medium">
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Multiple Returns Form */}
              {selectedSaleData && Object.keys(selectedItemsToReturn).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center space-x-2">
                    <RotateCcw className="w-4 h-4" />
                    <span>Selected Items to Return</span>
                    <Badge variant="outline">{Object.keys(selectedItemsToReturn).length} item(s)</Badge>
                  </h3>
                  
                  {/* Warning if items are from different sale */}
                  {Object.keys(selectedItemsToReturn).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-sm text-blue-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          Selected items are from sale: <strong>{selectedSaleData.customerName}</strong> 
                          ({selectedSaleData.saleDate.toLocaleDateString()})
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {(() => {
                      // Group items by sale
                      const itemsBySale = Object.entries(selectedItemsToReturn).reduce((acc, [itemKey, item]) => {
                        if (!acc[item.saleId]) {
                          acc[item.saleId] = [];
                        }
                        acc[item.saleId].push([itemKey, item]);
                        return acc;
                      }, {} as {[saleId: string]: [string, any][]});

                      return Object.entries(itemsBySale).map(([saleId, items]) => {
                        // Get sale data for this group
                        const saleData = searchResults.find(sale => sale.id === saleId) || getSaleById(saleId);
                        
                        return (
                          <div key={saleId} className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h4 className="font-medium text-blue-900">
                                Sale: {saleData?.customerName || 'Unknown Customer'} 
                                ({saleData?.saleDate?.toLocaleDateString() || 'Unknown Date'})
                              </h4>
                            </div>
                            
                            {items.map(([itemKey, item]) => (
                              <div key={itemKey} className="p-4 border border-primary rounded-lg bg-primary/5">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium flex items-center space-x-2">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span>{item.productCode} - Size {item.size}</span>
                                  </h4>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleItemSelection(item.productCode, item.size)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Remove
                                  </Button>
                                  <div className="ml-4 text-sm text-muted-foreground">
                                    Max: {getMaxReturnableQuantity(item.saleId, item.productCode, item.size)}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Return Quantity</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max={getMaxReturnableQuantity(item.saleId, item.productCode, item.size)}
                                      value={item.quantity === 0 ? '' : item.quantity}
                                      onChange={(e) => updateItemQuantity(itemKey, parseInt(e.target.value) || 0)}
                                      placeholder="Enter quantity"
                                      className="w-full"
                                    />
                                  </div>
                                  <div>
                                    <Label>Reason for Return (Optional)</Label>
                                    <Input
                                      type="text"
                                      value={item.reason}
                                      onChange={(e) => updateItemReason(itemKey, e.target.value)}
                                      placeholder="Enter reason..."
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <Button
                    onClick={processReturn}
                    className="w-full"
                    disabled={processingReturn || Object.keys(selectedItemsToReturn).length === 0}
                    size="lg"
                  >
                    {processingReturn ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Returns...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Process {Object.keys(selectedItemsToReturn).length} Return(s)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Single Return Form (Legacy) */}
              {selectedSaleData && Object.keys(selectedItemsToReturn).length === 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Legacy Single Return Form</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select items from the list above to return, or use this form for single item returns.
                  </p>
                  
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
                              quantity: 0
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
                            quantity: 0 
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
                      value={returnData.quantity === 0 ? '' : returnData.quantity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const max = returnData.productCode && returnData.size ? 
                          getMaxReturnableQuantity(selectedSale, returnData.productCode, returnData.size) : 1;
                        const parsed = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                        setReturnData(prev => ({
                          ...prev,
                          quantity: Math.min(parsed, max)
                        }));
                      }}
                      placeholder="Enter"
                    />
                  </div>

                  <div>
                    <Label>Reason for Return (Optional)</Label>
                    <Textarea
                      value={returnData.reason}
                      onChange={(e) => setReturnData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Reason for return (optional)..."
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
                    disabled={!returnData.productCode || !returnData.size || processingReturn || 
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