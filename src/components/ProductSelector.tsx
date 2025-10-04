import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductSelectorProps {
  products: Product[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  saleItems?: Array<{ productCode: string; size: string; quantity: number }>;
}

export function ProductSelector({
  products,
  value,
  onValueChange,
  placeholder = "Search products...",
  label = "Product Selection",
  disabled = false,
  className,
  saleItems = []
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search and available stock
  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) {
      return products.filter(product => 
        product.sizes.some(size => size.stock > 0)
      );
    }

    const searchLower = searchValue.toLowerCase();
    return products.filter(product => {
      // Check if product has available stock
      const hasStock = product.sizes.some(size => size.stock > 0);
      if (!hasStock) return false;

      // Search in multiple fields
      const matchesSearch = 
        product.code.toLowerCase().includes(searchLower) ||
        product.name.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower) ||
        product.color?.toLowerCase().includes(searchLower);

      return matchesSearch;
    });
  }, [products, searchValue]);

  // Get selected product details
  const selectedProduct = products.find(product => product.code === value);

  // Calculate total remaining stock for a product
  const getTotalRemainingStock = (product: Product): number => {
    return product.sizes.reduce((total, size) => {
      const alreadySelectedInThisSize = saleItems
        .filter(saleItem => saleItem.productCode === product.code && saleItem.size === size.size)
        .reduce((sum, saleItem) => sum + saleItem.quantity, 0);
      return total + Math.max(0, size.stock - alreadySelectedInThisSize);
    }, 0);
  };

  // Handle product selection
  const handleSelect = (productCode: string) => {
    onValueChange(productCode);
    setOpen(false);
    setSearchValue('');
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearchValue('');
    }
  };

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full justify-between text-sm font-normal",
              !selectedProduct && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {selectedProduct ? (
              <div className="flex items-center space-x-2 truncate">
                <Package className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedProduct.code}</span>
                <span className="text-muted-foreground truncate hidden sm:inline">
                  - {selectedProduct.name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command onKeyDown={handleKeyDown}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                ref={inputRef}
                placeholder="Search by code, name, brand, category..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList className="max-h-[300px]">
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p>No products found.</p>
                  <p className="text-muted-foreground">Try a different search term.</p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredProducts.map((product) => {
                  const totalStock = getTotalRemainingStock(product);
                  const isSelected = product.code === value;
                  
                  return (
                    <CommandItem
                      key={product.id}
                      value={product.code}
                      onSelect={() => handleSelect(product.code)}
                      className="flex items-center space-x-3 p-3 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Package className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm truncate">
                              {product.code}
                            </span>
                            <Badge 
                              variant={totalStock > 0 ? "secondary" : "destructive"}
                              className="text-xs flex-shrink-0"
                            >
                              {totalStock} available
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="truncate">{product.name}</span>
                            {product.brand && (
                              <>
                                <span>•</span>
                                <span className="truncate">{product.brand}</span>
                              </>
                            )}
                            {product.color && (
                              <>
                                <span>•</span>
                                <span className="truncate">{product.color}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Selected Product Details */}
      {selectedProduct && (
        <Card className="p-3 bg-muted/50">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-foreground">{selectedProduct.name}</span>
              {selectedProduct.brand && (
                <Badge variant="outline" className="text-xs">
                  {selectedProduct.brand}
                </Badge>
              )}
              {selectedProduct.color && (
                <Badge variant="outline" className="text-xs">
                  {selectedProduct.color}
                </Badge>
              )}
              {selectedProduct.category && (
                <Badge variant="outline" className="text-xs">
                  {selectedProduct.category}
                </Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Available sizes: {selectedProduct.sizes
                .filter(size => size.stock > 0)
                .map(size => size.size)
                .join(', ')
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
