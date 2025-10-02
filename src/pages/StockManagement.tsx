import { useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Product, ProductSize } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/services/productService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  AlertTriangle,
  Package,
  Trash,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";

export function StockManagement() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const ITEMS_PER_PAGE = 9;

  // Debounced search function
  const debouncedSearch = debounce((searchValue: string) => {
    setCurrentPage(1);
    fetchProducts(1, searchValue);
  }, 500);

  const fetchProducts = async (page = 1, search = "") => {
    try {
      setIsLoading(true);
      const response = await getProducts(page, ITEMS_PER_PAGE, search);
      const { data: productsData, meta: paginationMeta } = response;

      const formattedProducts: Product[] = productsData.map((product: any) => ({
        id: product.id,
        code: product.productCode,
        name: product.productName,
        brand: product.brand,
        color: product.color,
        category: product.category,
        sizes: product.stockBySize.map((sizeStock: any) => ({
          size: sizeStock.size,
          stock: sizeStock.quantity,
        })),
        createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
        updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      }));

      setProducts(formattedProducts);
      setCurrentPage(paginationMeta.page);
      setTotalPages(Math.ceil(paginationMeta.total / ITEMS_PER_PAGE));
      setTotalProducts(paginationMeta.total);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage, searchTerm);
  }, [currentPage]);

  // Handle search input change with debouncing
  useEffect(() => {
    if (searchTerm.trim() === "") {
      debouncedSearch("");
    } else {
      debouncedSearch(searchTerm);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm]);

  const handleAddProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      setIsAddingProduct(true);
      const payload = {
        productCode: productData.code,
        productName: productData.name,
        brand: productData.brand,
        color: productData.color,
        category: productData.category,
        stockBySize: productData.sizes
          .filter((size) => size.size && size.stock > 0)
          .map((size) => ({
            size: size.size,
            quantity: size.stock,
          })),
      };

      const response = await addProduct(payload);
      
      // Refresh the products list to maintain consistency with backend
      fetchProducts(currentPage, searchTerm);

      toast({
        title: "Product Added",
        description: `${productData.name} has been added to inventory.`,
      });

      setIsAddingProduct(false);
    } catch (error: any) {
      console.error("Failed to add product:", error);
      setIsAddingProduct(false);
      throw error;
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      setIsUpdatingProduct(true);
      const payload = {
        productCode: updatedProduct.code,
        productName: updatedProduct.name,
        brand: updatedProduct.brand,
        color: updatedProduct.color,
        category: updatedProduct.category,
        stockBySize: updatedProduct.sizes.map((size) => ({
          size: size.size,
          quantity: size.stock,
        })),
      };

      await updateProduct(updatedProduct.id, payload);

      // Refresh the products list to maintain consistency with backend
      fetchProducts(currentPage, searchTerm);

      setEditingProduct(null);
      toast({
        title: "Stock Updated",
        description: `Stock levels for ${updatedProduct.code} have been updated.`,
      });
    } catch (error) {
      console.error("Failed to update product:", error);
      toast({
        title: "Error",
        description: "Failed to update the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!productToDelete) return;

    try {
      setIsDeletingProduct(true);
      await deleteProduct(productId);

      // Check if this was the last product on the current page
      if (products.length === 1 && currentPage > 1) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        fetchProducts(newPage, searchTerm);
      } else {
        fetchProducts(currentPage, searchTerm);
      }

      toast({
        title: "Product Deleted",
        description: `${productToDelete.code} has been removed from inventory.`,
      });
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({
        title: "Error",
        description: "Failed to delete the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProductToDelete(null);
      setIsDeletingProduct(false);
    }
  };

  const getTotalStock = (product: Product) => {
    return product.sizes.reduce((total, size) => total + size.stock, 0);
  };

  const getLowStockSizes = (product: Product) => {
    return product.sizes.filter((size) => size.stock <= 5);
  };

  const openDeleteConfirmation = (product: Product) => {
    setProductToDelete(product);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Stock Management
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your inventory and track stock levels
          </p>
        </div>

        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              disabled={isAddingProduct || isLoading}
            >
              {isAddingProduct ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isAddingProduct ? "Adding..." : "Add Product"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <ProductForm
              onSubmit={handleAddProduct}
              onCancel={() => setIsAddingProduct(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products by code, name, or color..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 w-full"
            disabled={isLoading}
          />
        </div>
        {searchTerm && (
          <Button 
            variant="outline" 
            onClick={() => setSearchTerm("")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 sm:py-12">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading products...</p>
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
          {products.map((product) => {
            const totalStock = getTotalStock(product);
            const lowStockSizes = getLowStockSizes(product);
            const hasLowStock = lowStockSizes.length > 0;

            return (
              <Card key={product.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{product.code}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {product.name}
                      </p>
                      <Badge variant="outline" className="w-fit">
                        {product.color}
                      </Badge>
                    </div>
                    {hasLowStock && (
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 ml-2" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Total Stock */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Stock:</span>
                    <span className="text-lg font-bold">{totalStock}</span>
                  </div>

                  {/* Size Stock Details */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      Stock by Size:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {product.sizes.map((size, index) => (
                        <div
                          key={index}
                          className={`text-center p-2 rounded-md text-sm ${
                            size.stock <= 5
                              ? "bg-warning-light text-warning border border-warning/30"
                              : "bg-muted"
                          }`}
                        >
                          <div className="font-medium text-xs sm:text-sm">{size.size}</div>
                          <div className="text-xs">{size.stock}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  {hasLowStock && (
                    <div className="bg-warning-light p-3 rounded-lg">
                      <p className="text-sm text-warning font-medium">
                        Low stock:{" "}
                        {lowStockSizes.map((size) => size.size).join(", ")}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => setEditingProduct(product)}
                      disabled={isUpdatingProduct || isDeletingProduct}
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Edit Stock
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-10 sm:p-0 text-xs sm:text-sm"
                          onClick={() => openDeleteConfirmation(product)}
                          disabled={isUpdatingProduct || isDeletingProduct}
                        >
                          <Trash className="w-3 h-3 sm:w-4 sm:h-4 sm:mx-0 mr-2 sm:mr-0" />
                          <span className="sm:hidden">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-4 sm:mx-0">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Confirm Deletion
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>
                              {product.code} - {product.name}
                            </strong>
                            ? This action cannot be undone and will
                            permanently remove the product from inventory.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <AlertDialogCancel disabled={isDeletingProduct} className="w-full sm:w-auto">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center w-full sm:w-auto"
                            disabled={isDeletingProduct}
                          >
                            {isDeletingProduct ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Deleting...
                              </>
                            ) : (
                              "Delete Product"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="flex flex-col items-center space-y-3 mt-6">
          <span className="text-sm text-muted-foreground text-center px-4">
            Showing {products.length} of {totalProducts} products
            {searchTerm && " matching your search"}
          </span>
          <div className="flex justify-center items-center space-x-2 sm:space-x-4 w-full">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Previous"}
            </Button>
            <span className="text-sm px-2 sm:px-4 text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || isLoading}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No products found" : "No products available"}
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {searchTerm
              ? "Try adjusting your search terms or clear the search to see all products."
              : "Add your first product to get started."}
          </p>
        </div>
      )}

      {/* Edit Stock Dialog */}
      {editingProduct && (
        <Dialog
          open={!!editingProduct}
          onOpenChange={() => setEditingProduct(null)}
        >
          <DialogContent className="mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Edit Stock - {editingProduct.code}</DialogTitle>
            </DialogHeader>
            <EditStockForm
              product={editingProduct}
              onClose={() => setEditingProduct(null)}
              onUpdate={handleUpdateProduct}
              isUpdating={isUpdatingProduct}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface ProductFormProps {
  onSubmit: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initialData?: Partial<Product>;
}

function ProductForm({ onSubmit, onCancel, initialData }: ProductFormProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSizeValue, setNewSizeValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ code?: string }>({});

  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    name: initialData?.name || "",
    brand: initialData?.brand || "",
    color: initialData?.color || "",
    category: initialData?.category || "",
  });

  const [sizes, setSizes] = useState<ProductSize[]>(
    initialData?.sizes || [
      { size: "34", stock: 0 },
      { size: "35", stock: 0 },
      { size: "36", stock: 0 },
      { size: "37", stock: 0 },
      { size: "38", stock: 0 },
      { size: "39", stock: 0 },
      { size: "40", stock: 0 },
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    if (!formData.code || !formData.name || !formData.color) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const productData = {
      ...formData,
      sizes: sizes.filter((size) => size.stock > 0),
    };

    try {
      await onSubmit(productData);
    } catch (error: any) {
      if (
        error.response?.data?.message?.includes("already exists") ||
        error.response?.data?.error?.includes("already exists") ||
        error.message?.includes("already exists")
      ) {
        setFormErrors({
          code: "This product code already exists. Please use a different code.",
        });

        toast({
          title: "Duplicate Product Code",
          description:
            "This product code already exists. Please use a different code.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSizeStock = (index: number, stock: number) => {
    setSizes((prev) =>
      prev.map((size, i) =>
        i === index ? { ...size, stock: Math.max(0, stock) } : size
      )
    );
  };

  const addNewSize = () => {
    const trimmedSize = newSizeValue.trim();
    if (!trimmedSize) return;

    if (sizes.some((size) => size.size === trimmedSize)) {
      toast({
        title: "Duplicate Size",
        description: `Size ${trimmedSize} already exists.`,
        variant: "destructive",
      });
      setNewSizeValue("");
      setIsDialogOpen(false);
      return;
    }

    setSizes((prev) => [...prev, { size: trimmedSize, stock: 0 }]);
    setNewSizeValue("");
    setIsDialogOpen(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, code: e.target.value }));
    if (formErrors.code) {
      setFormErrors({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Product Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={handleCodeChange}
            placeholder="H64, H65, etc."
            required
            className={formErrors.code ? "border-destructive" : ""}
          />
          {formErrors.code && (
            <p className="text-sm text-destructive mt-1">{formErrors.code}</p>
          )}
        </div>
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Product name"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, brand: e.target.value }))
            }
            placeholder="Brand name"
          />
        </div>
        <div>
          <Label htmlFor="color">Color *</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, color: e.target.value }))
            }
            placeholder="Black, Brown, etc."
            required
          />
        </div>
      </div>

      <div>
        <Label>Stock by Size</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {sizes.map((size, index) => (
            <div key={index}>
              <Label className="text-xs">Size {size.size}</Label>
              <Input
                type="number"
                min="0"
                value={size.stock}
                onChange={(e) =>
                  updateSizeStock(index, parseInt(e.target.value) || 0)
                }
                className="text-center text-sm"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full sm:w-auto"
          onClick={() => setIsDialogOpen(true)}
        >
          + Add Size
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Add New Size</DialogTitle>
          </DialogHeader>
          <Input
            value={newSizeValue}
            onChange={(e) => setNewSizeValue(e.target.value)}
            placeholder="Enter size (e.g., 46)"
          />
          <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={addNewSize} className="w-full sm:w-auto">Add Size</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Adding...
            </>
          ) : (
            "Add Product"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface EditStockFormProps {
  product: Product;
  onClose: () => void;
  onUpdate: (updatedProduct: Product) => void;
  isUpdating?: boolean;
}

function EditStockForm({ product, onClose, onUpdate, isUpdating = false }: EditStockFormProps) {
  const [sizes, setSizes] = useState<ProductSize[]>([...product.sizes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProduct: Product = {
      ...product,
      sizes,
      updatedAt: new Date(),
    };

    onUpdate(updatedProduct);
  };

  const updateSizeStock = (index: number, stock: number) => {
    setSizes((prev) =>
      prev.map((size, i) =>
        i === index ? { ...size, stock: Math.max(0, stock) } : size
      )
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {sizes.map((size, index) => (
          <div key={index}>
            <Label>Size {size.size}</Label>
            <Input
              type="number"
              min="0"
              value={size.stock}
              onChange={(e) =>
                updateSizeStock(index, parseInt(e.target.value) || 0)
              }
              className="text-center"
              disabled={isUpdating}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Updating...
            </>
          ) : (
            "Update Stock"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isUpdating}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}