import { useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Product, Sale, SaleItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function Sales() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  
  // State declarations
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [showRecentSales, setShowRecentSales] = useState(false);
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
      quantity: 1,
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
          updatedItem.quantity = 1;
        } else {
          updatedItem.productId = '';
          updatedItem.productName = '';
          updatedItem.color = '';
          updatedItem.size = '';
        }
      }
      
      return updatedItem;
    }));
  };

  // Validation
  const validateSale = (): boolean => {
    if (!customerName.trim() || saleItems.length === 0) return false;
    
    return saleItems.every(item => 
      item.productCode && 
      item.size && 
      item.quantity > 0 &&
      getAvailableStock(item.productCode, item.size) >= item.quantity
    );
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
                <Label htmlFor="customerName" className="text-sm font-medium">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="h-10"
                  required
                />
              </div>

              {/* Sale Items Section */}
              <div className="space-y-4">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <Label className="text-sm font-medium">Sale Items</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSaleItem}
                    className="flex items-center justify-center space-x-2 h-9 w-full sm:w-auto"
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
                    <div className="space-y-4">
                      {/* Product Selection Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {/* Product Code Selection */}
                        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                          <Label className="text-xs font-medium mb-2 block">Product Selection</Label>
                          <Select
                            value={item.productCode}
                            onValueChange={(value) => handleUpdateSaleItem(index, 'productCode', value)}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsWithStock.map(product => (
                                <SelectItem key={product.id} value={product.code} className="text-sm">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full">
                                    <span className="font-medium">{product.code}</span>
                                    <span className="text-xs text-muted-foreground sm:ml-2">
                                      {product.name} ({product.sizes.reduce((sum, size) => sum + size.stock, 0)} in stock)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Size Selection */}
                        <div className="w-full sm:w-32 lg:w-28">
                          <Label className="text-xs font-medium mb-2 block">Size</Label>
                          <Select
                            value={item.size}
                            onValueChange={(value) => handleUpdateSaleItem(index, 'size', value)}
                            disabled={!item.productCode}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.productCode && getProductByCode(item.productCode)?.sizes
                                .filter(size => size.stock > 0)
                                .map(size => (
                                  <SelectItem key={size.size} value={size.size} className="text-sm">
                                    {size.size} ({size.stock} available)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity Input */}
                        <div className="w-full sm:w-24">
                          <Label className="text-xs font-medium mb-2 block">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            max={getAvailableStock(item.productCode, item.size)}
                            value={item.quantity}
                            onChange={(e) => handleUpdateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            disabled={!item.size}
                            className="h-10 text-center text-sm"
                          />
                        </div>

                        {/* Remove Item Button */}
                        <div className="flex justify-end sm:justify-start lg:self-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSaleItem(index)}
                            className="h-10 w-full sm:w-10 p-0"
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
                                getAvailableStock(item.productCode, item.size) >= item.quantity 
                                  ? "default" 
                                  : "destructive"
                              }
                              className="text-xs py-1"
                            >
                              Stock: {getAvailableStock(item.productCode, item.size)}
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