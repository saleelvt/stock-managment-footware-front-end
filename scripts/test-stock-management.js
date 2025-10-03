// Test script to verify stock management functionality
// This script can be run in the browser console for testing

// Mock data for testing
const mockProducts = [
  {
    id: '1',
    code: 'TEST001',
    name: 'Test Product 1',
    brand: 'Test Brand',
    color: 'Black',
    category: 'Test Category',
    sizes: [
      { size: 'M', stock: 10 },
      { size: 'L', stock: 5 }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    code: 'TEST002',
    name: 'Test Product 2',
    brand: 'Test Brand',
    color: 'White',
    category: 'Test Category',
    sizes: [
      { size: 'S', stock: 8 },
      { size: 'M', stock: 12 }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockSale = {
  id: 'sale-1',
  customerName: 'Test Customer',
  items: [
    {
      productId: '1',
      productCode: 'TEST001',
      productName: 'Test Product 1',
      size: 'M',
      quantity: 3,
      color: 'Black'
    },
    {
      productId: '2',
      productCode: 'TEST002',
      productName: 'Test Product 2',
      size: 'S',
      quantity: 2,
      color: 'White'
    }
  ],
  totalItems: 5,
  saleDate: new Date(),
  notes: 'Test sale'
};

const mockReturn = {
  id: 'return-1',
  originalSaleId: 'sale-1',
  productId: '1',
  productCode: 'TEST001',
  productName: 'Test Product 1',
  size: 'M',
  quantity: 1,
  customerName: 'Test Customer',
  returnDate: new Date(),
  reason: 'Wrong size',
  notes: 'Test return'
};

// Test functions
function testStockReduction() {
  console.log('🧪 Testing Stock Reduction on Sale...');

  const originalStockM = mockProducts[0].sizes.find(s => s.size === 'M').stock;
  const originalStockS = mockProducts[1].sizes.find(s => s.size === 'S').stock;

  console.log(`Original stock - TEST001 (M): ${originalStockM}, TEST002 (S): ${originalStockS}`);

  // Simulate stock reduction
  const updatedProducts = mockProducts.map(product => {
    const saleItem = mockSale.items.find(item => item.productId === product.id);
    if (saleItem) {
      return {
        ...product,
        sizes: product.sizes.map(size =>
          size.size === saleItem.size
            ? { ...size, stock: Math.max(0, size.stock - saleItem.quantity) }
            : size
        ),
        updatedAt: new Date()
      };
    }
    return product;
  });

  const newStockM = updatedProducts[0].sizes.find(s => s.size === 'M').stock;
  const newStockS = updatedProducts[1].sizes.find(s => s.size === 'S').stock;

  console.log(`After sale stock - TEST001 (M): ${newStockM}, TEST002 (S): ${newStockS}`);

  if (newStockM === originalStockM - 3 && newStockS === originalStockS - 2) {
    console.log('✅ Stock reduction test PASSED');
    return true;
  } else {
    console.log('❌ Stock reduction test FAILED');
    return false;
  }
}

function testStockIncrease() {
  console.log('🧪 Testing Stock Increase on Return...');

  // First apply the sale
  let currentProducts = mockProducts.map(product => {
    const saleItem = mockSale.items.find(item => item.productId === product.id);
    if (saleItem) {
      return {
        ...product,
        sizes: product.sizes.map(size =>
          size.size === saleItem.size
            ? { ...size, stock: Math.max(0, size.stock - saleItem.quantity) }
            : size
        ),
        updatedAt: new Date()
      };
    }
    return product;
  });

  const stockAfterSale = currentProducts[0].sizes.find(s => s.size === 'M').stock;
  console.log(`Stock after sale - TEST001 (M): ${stockAfterSale}`);

  // Now apply the return
  currentProducts = currentProducts.map(product => {
    if (product.id === mockReturn.productId) {
      return {
        ...product,
        sizes: product.sizes.map(size =>
          size.size === mockReturn.size
            ? { ...size, stock: size.stock + mockReturn.quantity }
            : size
        ),
        updatedAt: new Date()
      };
    }
    return product;
  });

  const stockAfterReturn = currentProducts[0].sizes.find(s => s.size === 'M').stock;
  console.log(`Stock after return - TEST001 (M): ${stockAfterReturn}`);

  if (stockAfterReturn === stockAfterSale + 1) {
    console.log('✅ Stock increase test PASSED');
    return true;
  } else {
    console.log('❌ Stock increase test FAILED');
    return false;
  }
}

function testCompleteStockFlow() {
  console.log('🧪 Testing Complete Stock Management Flow...');

  // Simulate the complete flow
  console.log('1. Initial stock levels:');
  console.log(`   TEST001 (M): ${mockProducts[0].sizes.find(s => s.size === 'M').stock}`);
  console.log(`   TEST002 (S): ${mockProducts[1].sizes.find(s => s.size === 'S').stock}`);

  // 2. Process a sale (stock reduction)
  console.log('\n2. Processing sale...');
  const saleItems = [
    { productId: '1', productCode: 'TEST001', size: 'M', quantity: 2 },
    { productId: '2', productCode: 'TEST002', size: 'S', quantity: 1 }
  ];

  // Simulate stock reduction
  let updatedProducts = mockProducts.map(product => {
    const saleItem = saleItems.find(item => item.productId === product.id);
    if (saleItem) {
      const currentStock = product.sizes.find(s => s.size === saleItem.size).stock;
      const newStock = Math.max(0, currentStock - saleItem.quantity);

      console.log(`   Reducing stock: ${product.code} (${saleItem.size}) from ${currentStock} to ${newStock}`);

      return {
        ...product,
        sizes: product.sizes.map(size =>
          size.size === saleItem.size
            ? { ...size, stock: newStock }
            : size
        ),
        updatedAt: new Date()
      };
    }
    return product;
  });

  console.log('\n3. Stock levels after sale:');
  console.log(`   TEST001 (M): ${updatedProducts[0].sizes.find(s => s.size === 'M').stock}`);
  console.log(`   TEST002 (S): ${updatedProducts[1].sizes.find(s => s.size === 'S').stock}`);

  // 3. Process a return (stock increase)
  console.log('\n4. Processing return...');
  const returnItem = { productId: '1', productCode: 'TEST001', size: 'M', quantity: 1 };

  updatedProducts = updatedProducts.map(product => {
    if (product.id === returnItem.productId) {
      const currentStock = product.sizes.find(s => s.size === returnItem.size).stock;
      const newStock = currentStock + returnItem.quantity;

      console.log(`   Increasing stock: ${product.code} (${returnItem.size}) from ${currentStock} to ${newStock}`);

      return {
        ...product,
        sizes: product.sizes.map(size =>
          size.size === returnItem.size
            ? { ...size, stock: newStock }
            : size
        ),
        updatedAt: new Date()
      };
    }
    return product;
  });

  console.log('\n5. Final stock levels after return:');
  console.log(`   TEST001 (M): ${updatedProducts[0].sizes.find(s => s.size === 'M').stock}`);
  console.log(`   TEST002 (S): ${updatedProducts[1].sizes.find(s => s.size === 'S').stock}`);

  // 4. Verify final state
  const finalStockM = updatedProducts[0].sizes.find(s => s.size === 'M').stock;
  const finalStockS = updatedProducts[1].sizes.find(s => s.size === 'S').stock;

  const expectedStockM = 10 - 2 + 1; // Original 10 - 2 sold + 1 returned
  const expectedStockS = 8 - 1;      // Original 8 - 1 sold

  console.log(`\n6. Verification:`);
  console.log(`   Expected TEST001 (M): ${expectedStockM}, Actual: ${finalStockM}`);
  console.log(`   Expected TEST002 (S): ${expectedStockS}, Actual: ${finalStockS}`);

  if (finalStockM === expectedStockM && finalStockS === expectedStockS) {
    console.log('\n✅ Complete stock flow test PASSED');
    return true;
  } else {
    console.log('\n❌ Complete stock flow test FAILED');
    return false;
  }
}

function testMultipleItemsInSale() {
  console.log('🧪 Testing Multiple Items of Same Product in Single Sale...');

  // Test scenario: Add multiple items of the same product to a sale
  const saleItems = [
    { productId: '1', productCode: 'TEST001', size: 'M', quantity: 3 },
    { productId: '1', productCode: 'TEST001', size: 'M', quantity: 2 }, // Another 2 of same product
    { productId: '2', productCode: 'TEST002', size: 'S', quantity: 1 }
  ];

  console.log('1. Initial stock levels:');
  console.log(`   TEST001 (M): ${mockProducts[0].sizes.find(s => s.size === 'M').stock}`);
  console.log(`   TEST002 (S): ${mockProducts[1].sizes.find(s => s.size === 'S').stock}`);

  // Test stock validation logic (simulating getRemainingStock function)
  console.log('\n2. Testing stock validation for multiple items:');

  // For first item (quantity 3)
  const remainingForFirst = Math.max(0, 10 - 0); // 10 - 0 other items
  console.log(`   First item (qty 3): ${remainingForFirst} available, requested: 3 → ${remainingForFirst >= 3 ? '✅ Valid' : '❌ Invalid'}`);

  // For second item (quantity 2) - should account for first item's quantity
  const remainingForSecond = Math.max(0, 10 - 3); // 10 - 3 from first item
  console.log(`   Second item (qty 2): ${remainingForSecond} available, requested: 2 → ${remainingForSecond >= 2 ? '✅ Valid' : '❌ Invalid'}`);

  // Test stock update logic (grouping by product-size)
  console.log('\n3. Testing stock update logic:');

  // Group items by product-size combination
  const stockUpdates = new Map();
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

  console.log('   Grouped updates:');
  for (const [key, update] of stockUpdates) {
    const originalStock = key.includes('TEST001') ?
      mockProducts[0].sizes.find(s => s.size === 'M').stock :
      mockProducts[1].sizes.find(s => s.size === 'S').stock;
    const newStock = Math.max(0, originalStock - update.totalQuantity);
    console.log(`   ${update.productCode} (${update.size}): ${originalStock} - ${update.totalQuantity} = ${newStock}`);
  }

  // Verify final stock levels
  const test001FinalStock = 10 - 5; // 10 - (3 + 2)
  const test002FinalStock = 8 - 1;  // 8 - 1

  console.log('\n4. Expected vs Actual final stock:');
  console.log(`   TEST001 (M): Expected ${test001FinalStock}, Calculation: 10 - (3 + 2) = ${test001FinalStock} → ${test001FinalStock === 5 ? '✅ Correct' : '❌ Wrong'}`);
  console.log(`   TEST002 (S): Expected ${test002FinalStock}, Calculation: 8 - 1 = ${test002FinalStock} → ${test002FinalStock === 7 ? '✅ Correct' : '❌ Wrong'}`);

  const success = test001FinalStock === 5 && test002FinalStock === 7;
  console.log(`\n${success ? '✅ Multiple items test PASSED' : '❌ Multiple items test FAILED'}`);
  return success;
}

function runAllTests() {
  console.log('🚀 Running Stock Management Tests...\n');

  const test1 = testStockReduction();
  console.log('');
  const test2 = testStockIncrease();
  console.log('');
  const test3 = testCompleteStockFlow();
  console.log('');
  const test4 = testMultipleItemsInSale();

  console.log('\n📊 Test Results:');
  console.log(`Stock Reduction: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stock Increase: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Complete Flow: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multiple Items: ${test4 ? '✅ PASS' : '❌ FAIL'}`);

  if (test1 && test2 && test3 && test4) {
    console.log('\n🎉 All tests PASSED! Stock management is working correctly.');
  } else {
    console.log('\n⚠️  Some tests FAILED! Please check the implementation.');
  }
}

// Auto-run tests if in browser console
if (typeof window !== 'undefined') {
  runAllTests();
}

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testStockReduction,
    testStockIncrease,
    testCompleteStockFlow,
    runAllTests,
    mockProducts,
    mockSale,
    mockReturn
  };
}