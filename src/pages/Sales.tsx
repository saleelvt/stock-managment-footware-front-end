/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Product, Sale, SaleItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductSelector } from '@/components/ProductSelector';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Receipt,
  Search,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ListProducts } from '@/services/productService';
import { addSale, transformSaleToRequest, CreateSaleRequest, getLastSales } from '@/services/salesService';
import { indexedDBService } from '@/services/indexedDBService';

export function Sales() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();

  // State declarations
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [showRecentSales, setShowRecentSales] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Constants
  const RECENT_SALES_LIMIT = 4;
  const RECENT_SALES_PAGE = 1;

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await ListProducts();

      const source = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];

      const formattedProducts: Product[] = source.map((productData: any) => ({
        id: productData.id, // Always use backend ID
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

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products from server.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch recent sales from backend
  const fetchRecentSales = async () => {
    try {
      setIsLoadingRecentSales(true);
      const salesResponse = await getLastSales(RECENT_SALES_PAGE, RECENT_SALES_LIMIT);
      setRecentSales(salesResponse);
    } catch (error) {
      console.error("Error fetching recent sales:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recent sales from server.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecentSales(false);
    }
  };

  useEffect(() => {
    if (showRecentSales) {
      fetchRecentSales();
    }
  }, [])

  // Toggle recent sales visibility
  const handleToggleRecentSales = async () => {
    const willShowRecentSales = !showRecentSales;
    setShowRecentSales(willShowRecentSales);

    if (willShowRecentSales) {
      await fetchRecentSales();
    }
  };

  // Refresh recent sales
  const handleRefreshRecentSales = async () => {
    await fetchRecentSales();
    toast({
      title: "Refreshed",
      description: "Recent sales have been updated.",
    });
  };

  // Initialize component
  useEffect(() => {
    fetchProducts();
  }, []);

  // Product utility functions
  const getProductByCode = (productCode: string): Product | undefined => {
    return products.find(product => product.code === productCode);
  };

  const getAvailableStock = (productCode: string, size: string): number => {
    const product = getProductByCode(productCode);
    if (!product) return 0;

    const sizeData = product.sizes.find(sizeItem => sizeItem.size === size);
    return sizeData ? sizeData.stock : 0;
  };

  // Get remaining stock for a product-size combination, accounting for items already in the sale
  const getRemainingStock = (productCode: string, size: string, excludeIndex?: number): number => {
    const originalStock = getAvailableStock(productCode, size);

    // Calculate total quantity of this product-size already in the sale (excluding current item if editing)
    const alreadySelectedQuantity = saleItems
      .filter((item, index) =>
        item.productCode === productCode &&
        item.size === size &&
        (excludeIndex === undefined || index !== excludeIndex)
      )
      .reduce((total, item) => total + item.quantity, 0);

    return Math.max(0, originalStock - alreadySelectedQuantity);
  };

  const getProductsWithStock = (): Product[] => {
    return products.filter(product =>
      product.sizes.some(size => size.stock > 0)
    );
  };

  // Sale items management
  const handleAddSaleItem = () => {
    const newSaleItem: SaleItem = {
      productId: '',
      productCode: '',
      productName: '',
      size: '',
      quantity: 0,
      color: '',
    };

    setSaleItems(prevItems => [...prevItems, newSaleItem]);
  };

  const handleRemoveSaleItem = (index: number) => {
    setSaleItems(prevItems => prevItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpdateSaleItem = (index: number, field: keyof SaleItem, value: string | number) => {
    setSaleItems(prevItems => prevItems.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      const updatedItem = { ...item, [field]: value };

      // Auto-populate product details when product code changes
      if (field === 'productCode' && typeof value === 'string') {
        const product = getProductByCode(value);
        if (product) {
          updatedItem.productId = product.id;
          updatedItem.productName = product.name;
          updatedItem.color = product.color;
          updatedItem.size = '';
          updatedItem.quantity = 0;
        } else {
          updatedItem.productId = '';
          updatedItem.productName = '';
          updatedItem.color = '';
          updatedItem.size = '';
        }
      }

      // Validate quantity against remaining stock when quantity changes
      if (field === 'quantity' && typeof value === 'number' && updatedItem.productCode && updatedItem.size) {
        const remainingStock = getRemainingStock(updatedItem.productCode, updatedItem.size, index);
        if (value > remainingStock) {
          console.warn(`Quantity ${value} exceeds remaining stock ${remainingStock} for ${updatedItem.productCode} (${updatedItem.size})`);
          updatedItem.quantity = remainingStock; // Auto-correct to maximum allowed
        } else if (value < 1) {
          // Allow 0 during editing so the input can be cleared; validation will enforce >= 1 on submit
          updatedItem.quantity = 0;
        }
      }

      return updatedItem;
    }));
  };

  // Validation
  const validateSale = (): boolean => {
    if (!customerName.trim() || saleItems.length === 0) return false;

    return saleItems.every((item, index) => {
      if (!item.productCode || !item.size || item.quantity <= 0) return false;

      // Compute remaining stock EXCLUDING this item's own quantity
      const remainingStockExcludingCurrent = getRemainingStock(item.productCode, item.size, index);
      if (remainingStockExcludingCurrent < item.quantity) {
        console.warn(`Insufficient stock for ${item.productCode} (${item.size}). Available: ${remainingStockExcludingCurrent}, Requested: ${item.quantity}`);
        return false;
      }

      return true;
    });
  };

  const isSaleValid = validateSale();

  // Process sale
  const handleProcessSale = async () => {
    if (!isSaleValid) {
      toast({
        title: "Invalid Sale",
        description: "Please check all items and ensure sufficient stock.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessingSale(true);

      // Prepare sale data for backend
      const saleData: Omit<Sale, 'id' | 'saleDate' | 'totalItems'> = {
        customerName: customerName.trim(),
        items: saleItems,
        notes: notes.trim() || undefined,
      };

      // Transform to backend request format
      const requestData: CreateSaleRequest = transformSaleToRequest(saleData);

      const newSaleResponse = await addSale(requestData);

      const newSale: Sale = {
        id: newSaleResponse.id,
        customerName: newSaleResponse.customerName,
        items: newSaleResponse.items.map((itemData: any) => ({
          productId: itemData.productId,
          productCode: itemData.productCode,
          productName: itemData.productName,
          size: itemData.size,
          quantity: itemData.quantity,
          color: itemData.color,
        })),
        saleDate: new Date(newSaleResponse.saleDate),
        totalItems: newSaleResponse.totalItems,
        notes: newSaleResponse.notes,
      };

      // Update local state
      dispatch({
        type: 'ADD_SALE',
        payload: newSale
      });

      // Update stock in IndexedDB for each unique product-size combination
      try {
        // Group items by product and size to calculate total quantity per combination
        const stockUpdates = new Map<string, { productCode: string; size: string; totalQuantity: number }>();

        for (const item of saleItems) {
          const key = `${item.productCode}-${item.size}`;
          const existing = stockUpdates.get(key);

          if (existing) {
            existing.totalQuantity += item.quantity;
          } else {
            stockUpdates.set(key, {
              productCode: item.productCode,
              size: item.size,
              totalQuantity: item.quantity
            });
          }
        }

        // Update stock for each unique product-size combination
        for (const update of stockUpdates.values()) {
          const product = getProductByCode(update.productCode);
          if (product) {
            const currentStock = getAvailableStock(update.productCode, update.size);
            const newStock = Math.max(0, currentStock - update.totalQuantity);

            await indexedDBService.updateProductStock(parseInt(product.id), update.size, newStock);
            console.log(`Stock persisted to IndexedDB: ${update.productCode} (${update.size}) from ${currentStock} to ${newStock} (reduced by ${update.totalQuantity})`);
          }
        }

        // Refresh products from IndexedDB to get updated stock values
        await fetchProducts();
      } catch (error) {
        console.error('Failed to update stock in IndexedDB:', error);
        // Continue with success flow even if IndexedDB update fails
      }

      // Refresh recent sales to include the new sale
      if (showRecentSales) {
        await fetchRecentSales();
      }

      // Reset form
      setSaleItems([]);
      setCustomerName('');
      setNotes('');

      toast({
        title: "Sale Recorded Successfully",
        description: `Sale for ${customerName} has been processed.`,
      });
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        title: "Error",
        description: "Failed to process sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Calculations
  const totalItemsCount = saleItems.reduce((total, item) => total + item.quantity, 0);
  const productsWithStock = getProductsWithStock();
  const displaySales = showRecentSales ? recentSales : state.sales.slice(-10).reverse();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Record new sales and manage transactions</p>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={fetchProducts}
            disabled={isLoadingProducts}
            className="w-full sm:w-auto"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoadingProducts ? 'Refreshing...' : 'Refresh Products'}
          </Button>

          <Button
            variant="outline"
            onClick={handleToggleRecentSales}
            disabled={isLoadingRecentSales}
            className="w-full sm:w-auto"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {isLoadingRecentSales ? 'Loading...' : (showRecentSales ? 'Hide' : 'Show')} Recent Sales
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Form Section */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>New Sale</span>
                </div>
                <Badge variant="secondary" className="self-start sm:self-auto">
                  {products.length} products available
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6">
              {/* Customer Information */}
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium">Customer Number *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer number"
                  className="h-10"
                  required
                />
              </div>

              {/* Sale Items Section */}
              <div className="space-y-4">
                {/* Header row: Sale Items + Add Button */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-sm font-medium">Sale Items</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSaleItem}
                    className="flex items-center justify-center gap-2 h-9 w-full sm:w-auto"
                    disabled={products.length === 0}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </Button>
                </div>

                {/* Loading State */}
                {isLoadingProducts && (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading products...
                  </div>
                )}

                {/* Empty Products State */}
                {products.length === 0 && !isLoadingProducts && (
                  <div className="text-center py-4 text-muted-foreground">
                    No products available. Please refresh or check your connection.
                  </div>
                )}

                {/* Sale Items List */}
                {saleItems.map((item, index) => (
                  <Card key={index} className="p-3 sm:p-4 border">
                    <div className="space-y-6">
                      {/* Product Selection Row */}
                      <div
                        className="
            grid grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-5
            xl:grid-cols-5
            gap-3
          "
                      >
                        {/* Product Selection */}
                        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                          <ProductSelector
                            products={products}
                            value={item.productCode}
                            onValueChange={(value) => handleUpdateSaleItem(index, 'productCode', value)}
                            placeholder="Search products..."
                            label="Product Selection"
                            saleItems={saleItems}
                            className="w-full"
                          />
                        </div>

                        {/* Size and Quantity Row (responsive flex) */}
                        <div className="flex flex-col sm:flex-row gap-3 =rounded-lg  w-full sm:w-auto lg:col-span-2">
                          {/* Size Selection */}
                          <div className=" rounded-lg  flex-1">
                            <Label className="text-xs font-medium mb-2 block">Size</Label>
                            <Select
                              value={item.size}
                              onValueChange={(value) => handleUpdateSaleItem(index, 'size', value)}
                              disabled={!item.productCode}
                            >
                              <SelectTrigger className="h-10 text-sm w-full">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                {item.productCode && getProductByCode(item.productCode)?.sizes
                                  .filter(size => getRemainingStock(item.productCode, size.size, index) > 0)
                                  .map(size => (
                                    <SelectItem key={size.size} value={size.size} className="text-sm">
                                      {size.size} ({getRemainingStock(item.productCode, size.size, index)} available)
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Quantity Input */}
                          <div className=" rounded-lg  flex-1">
                            <Label className="text-xs font-medium  mb-2  block">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              max={getRemainingStock(item.productCode, item.size, index)}
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                                handleUpdateSaleItem(index, 'quantity', parsed);
                              }}
                              disabled={!item.size}
                              placeholder="Enter"
                              className="h-10 text-center text-sm w-full"
                            />
                          </div>
                        </div>

                        {/* Remove Item Button */}
                        <div className="flex justify-end items-center lg:col-span-1 xl:col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSaleItem(index)}
                            className="h-10 w-full sm:w-10 p-0 flex items-center"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="ml-2 sm:hidden">Remove</span>
                          </Button>
                        </div>
                      </div>

                      {/* Product Information Display */}
                      {item.productCode && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {item.productName && (
                            <span className="text-muted-foreground font-medium">{item.productName}</span>
                          )}
                          {item.color && (
                            <Badge variant="outline" className="text-xs py-1">
                              Color: {item.color}
                            </Badge>
                          )}
                          {item.size && (
                            <Badge
                              variant={
                                getRemainingStock(item.productCode, item.size, index) >= item.quantity
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs py-1"
                            >
                              Available: {getRemainingStock(item.productCode, item.size, index)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>


              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes or comments..."
                  className="h-10"
                />
              </div>

              {/* Sale Summary */}
              {saleItems.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Items:</span>
                    <span className="text-lg font-bold">{totalItemsCount}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {saleItems.length} product(s) in this sale
                  </div>
                </div>
              )}

              {/* Process Sale Button */}
              <Button
                onClick={handleProcessSale}
                disabled={!isSaleValid || isProcessingSale}
                className="w-full h-11"
                size="lg"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isProcessingSale ? 'Processing Sale...' : `Process Sale (${totalItemsCount} items)`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales Sidebar */}
        {showRecentSales && (
          <div className="xl:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">Recent Sales</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshRecentSales}
                  disabled={isLoadingRecentSales}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRecentSales ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoadingRecentSales ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading recent sales...
                    </div>
                  ) : displaySales.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent sales found
                    </div>
                  ) : (
                    displaySales.map(sale => (
                      <div key={sale.id} className="p-3 bg-muted rounded-lg border">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-2">
                          <span className="font-medium text-sm truncate">{sale.customerName}</span>
                          <Badge variant="secondary" className="self-start sm:self-auto">{sale.totalItems} items</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {sale.saleDate.toLocaleDateString()} at {sale.saleDate.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground break-words">
                          Products: {sale.items.map(item => `${item.productCode} (${item.size})`).join(', ')}
                        </div>
                        {sale.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic break-words">
                            Note: {sale.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}