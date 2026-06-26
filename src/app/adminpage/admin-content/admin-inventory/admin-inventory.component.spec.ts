import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { AdminInventoryComponent } from './admin-inventory.component';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AdminInventoryComponent', () => {
  let component: AdminInventoryComponent;
  let fixture: ComponentFixture<AdminInventoryComponent>;

  const mockProducts = [
    {
      id: "PRD-001",
      name: "Test Product 1",
      category: "Electronics",
      subcategory: "Mobile",
      buyingPrice: 100,
      sellingPrice: 150,
      quantity: 50,
      threshold: 10,
      expiry: "2025-12-31",
      supplier: "Test Supplier",
      contact: "9876543210",
      status: "in_stock" as const
    },
    {
      id: "PRD-002",
      name: "Test Product 2",
      category: "Grocery",
      subcategory: "Rice",
      buyingPrice: 50,
      sellingPrice: 70,
      quantity: 5,
      threshold: 10,
      expiry: "2025-06-30",
      supplier: "Test Supplier 2",
      contact: "9876543211",
      status: "low_stock" as const
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminInventoryComponent, FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminInventoryComponent);
    component = fixture.componentInstance;
    
    // Reset localStorage mock
    localStorageMock.clear();
    spyOn(localStorageMock, 'getItem').and.returnValue(null);
    spyOn(localStorageMock, 'setItem');
    
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentPage).toBe(1);
      expect(component.itemsPerPage).toBe(5);
      expect(component.searchTerm).toBe('');
      expect(component.selectedCategory).toBe('');
      expect(component.showAddProductModal).toBe(false);
    });

    it('should load products on initialization', () => {
      expect(component.products).toBeDefined();
      expect(component.filteredProducts).toBeDefined();
    });

    it('should have default product categories', () => {
      expect(component.categories.length).toBeGreaterThan(0);
      expect(component.categories).toContain('Dairy Products');
      expect(component.categories).toContain('Electronics');
    });
  });

  describe('Local Storage Operations', () => {
    it('should load products from localStorage if available', () => {
      const mockStoredProducts = JSON.stringify(mockProducts);
      (localStorageMock.getItem as jasmine.Spy).and.returnValue(mockStoredProducts);
      
      component.loadProducts();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('inventoryProducts');
      expect(component.products).toEqual(mockProducts);
    });

    it('should load default products if localStorage is empty', () => {
      (localStorageMock.getItem as jasmine.Spy).and.returnValue(null);
      
      component.loadProducts();
      
      expect(component.products.length).toBe(5);
      expect(component.products[0].id).toBe("PRD-001");
    });

    it('should save products to localStorage', () => {
      component.products = mockProducts;
      
      component.saveProducts();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'inventoryProducts',
        JSON.stringify(mockProducts)
      );
    });
  });

  describe('Product Filtering', () => {
    beforeEach(() => {
      component.products = mockProducts;
    });

    it('should filter products by search term', () => {
      component.searchTerm = 'Test Product 1';
      component.filterProducts();
      
      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Test Product 1');
    });

    it('should filter products by category', () => {
      component.selectedCategory = 'Electronics';
      component.filterProducts();
      
      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].category).toBe('Electronics');
    });

    it('should filter products by status', () => {
      component.selectedStatus = 'low_stock';
      component.filterProducts();
      
      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].status).toBe('low_stock');
    });

    it('should filter products by date range', () => {
      component.startDate = '2025-01-01';
      component.endDate = '2025-07-01';
      component.filterProducts();
      
      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].expiry).toBe('2025-06-30');
    });

    it('should reset to page 1 after filtering', () => {
      component.currentPage = 2;
      component.filterProducts();
      
      expect(component.currentPage).toBe(1);
    });
  });

  describe('Filter Management', () => {
    beforeEach(() => {
      component.products = mockProducts;
      component.selectedCategory = 'Electronics';
      component.selectedSubcategory = 'Mobile';
      component.selectedStatus = 'in_stock';
      component.startDate = '2025-01-01';
      component.endDate = '2025-12-31';
      component.searchTerm = 'test';
    });

    it('should clear category filter and subcategory', () => {
      spyOn(component, 'filterProducts');
      
      component.clearCategoryFilter();
      
      expect(component.selectedCategory).toBe('');
      expect(component.selectedSubcategory).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });

    it('should clear subcategory filter', () => {
      spyOn(component, 'filterProducts');
      
      component.clearSubcategoryFilter();
      
      expect(component.selectedSubcategory).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });

    it('should clear status filter', () => {
      spyOn(component, 'filterProducts');
      
      component.clearStatusFilter();
      
      expect(component.selectedStatus).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });

    it('should clear date filter', () => {
      spyOn(component, 'filterProducts');
      
      component.clearDateFilter();
      
      expect(component.startDate).toBe('');
      expect(component.endDate).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });

    it('should reset all filters', () => {
      spyOn(component, 'filterProducts');
      
      component.resetFilters();
      
      expect(component.searchTerm).toBe('');
      expect(component.selectedCategory).toBe('');
      expect(component.selectedSubcategory).toBe('');
      expect(component.selectedStatus).toBe('');
      expect(component.startDate).toBe('');
      expect(component.endDate).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });

    it('should clear subcategory when category changes', () => {
      spyOn(component, 'filterProducts');
      component.selectedSubcategory = 'Mobile';
      
      component.onCategoryChange();
      
      expect(component.selectedSubcategory).toBe('');
      expect(component.filterProducts).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create enough products for pagination testing
      component.filteredProducts = Array.from({ length: 12 }, (_, i) => ({
        ...mockProducts[0],
        id: `PRD-${i + 1}`,
        name: `Product ${i + 1}`
      }));
      component.itemsPerPage = 5;
    });

    it('should calculate total pages correctly', () => {
      expect(component.totalPages).toBe(3);
    });

    it('should return correct paginated products', () => {
      component.currentPage = 1;
      const paginatedProducts = component.paginatedProducts;
      
      expect(paginatedProducts.length).toBe(5);
      expect(paginatedProducts[0].name).toBe('Product 1');
    });

    it('should generate correct page numbers', () => {
      const pageNumbers = component.getPageNumbers();
      
      expect(pageNumbers).toEqual([1, 2, 3]);
    });

    it('should navigate to specific page', () => {
      component.goToPage(2);
      
      expect(component.currentPage).toBe(2);
    });

    it('should not navigate to invalid page numbers', () => {
      component.currentPage = 1;
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
      
      component.goToPage(10);
      expect(component.currentPage).toBe(1);
    });

    it('should navigate to previous page', () => {
      component.currentPage = 2;
      component.goToPrevPage();
      
      expect(component.currentPage).toBe(1);
    });

    it('should not navigate to previous page if on first page', () => {
      component.currentPage = 1;
      component.goToPrevPage();
      
      expect(component.currentPage).toBe(1);
    });

    it('should navigate to next page', () => {
      component.currentPage = 1;
      component.goToNextPage();
      
      expect(component.currentPage).toBe(2);
    });

    it('should not navigate to next page if on last page', () => {
      component.currentPage = 3;
      component.goToNextPage();
      
      expect(component.currentPage).toBe(3);
    });
  });

  describe('Product Status Management', () => {
    it('should return correct status for out of stock product', () => {
      const product = { ...mockProducts[0], quantity: 0 };
      const status = component.getProductStatus(product);
      
      expect(status.text).toBe('Out of Stock');
      expect(status.class).toBe('bg-red-100 text-red-800');
    });

    it('should return correct status for low stock product', () => {
      const product = { ...mockProducts[0], quantity: 5, threshold: 10 };
      const status = component.getProductStatus(product);
      
      expect(status.text).toBe('Low Stock');
      expect(status.class).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return correct status for in stock product', () => {
      const product = { ...mockProducts[0], quantity: 50, threshold: 10 };
      const status = component.getProductStatus(product);
      
      expect(status.text).toBe('In Stock');
      expect(status.class).toBe('bg-green-100 text-green-800');
    });

    it('should return correct stock color', () => {
      expect(component.getStockColor({ ...mockProducts[0], quantity: 0 })).toBe('red');
      expect(component.getStockColor({ ...mockProducts[0], quantity: 5, threshold: 10 })).toBe('yellow');
      expect(component.getStockColor({ ...mockProducts[0], quantity: 50, threshold: 10 })).toBe('green');
    });

    it('should calculate stock width correctly', () => {
      const product = { ...mockProducts[0], quantity: 25, threshold: 50 };
      expect(component.getStockWidth(product)).toBe(50);
    });

    it('should cap stock width at 100%', () => {
      const product = { ...mockProducts[0], quantity: 100, threshold: 50 };
      expect(component.getStockWidth(product)).toBe(100);
    });

    it('should return 0 width for zero threshold', () => {
      const product = { ...mockProducts[0], quantity: 25, threshold: 0 };
      expect(component.getStockWidth(product)).toBe(0);
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const dateString = '2025-12-31';
      const formatted = component.formatDate(dateString);
      
      expect(formatted).toBe('31 Dec 2025');
    });

    it('should return N/A for empty date', () => {
      expect(component.formatDate('')).toBe('N/A');
    });

    it('should return N/A for undefined date', () => {
      expect(component.formatDate(undefined as any)).toBe('N/A');
    });
  });

  describe('Modal Management', () => {
    it('should toggle add product modal', () => {
      spyOn(component, 'resetNewProductForm');
      
      component.showAddProductModal = false;
      component.toggleAddProductModal();
      
      expect(component.showAddProductModal).toBe(true);
      
      component.toggleAddProductModal();
      
      expect(component.showAddProductModal).toBe(false);
      expect(component.resetNewProductForm).toHaveBeenCalled();
    });

    it('should open product view modal', () => {
      const product = mockProducts[0];
      component.openProductView(product);
      
      expect(component.showProductViewModal).toBe(true);
      expect(component.selectedProduct).toEqual(product);
      expect(component.isEditMode).toBe(false);
    });

    it('should close product view modal', () => {
      component.showProductViewModal = true;
      component.selectedProduct = mockProducts[0];
      component.closeProductView();
      
      expect(component.showProductViewModal).toBe(false);
      expect(component.selectedProduct).toBeNull();
    });

    it('should toggle edit mode', () => {
      component.isEditMode = false;
      component.toggleEditMode();
      
      expect(component.isEditMode).toBe(true);
    });
  });

  describe('Product Addition', () => {
    beforeEach(() => {
      component.newProduct = {
        id: 'PRD-TEST',
        name: 'Test Product',
        category: 'Electronics',
        subcategory: 'Mobile',
        buyingPrice: 100,
        sellingPrice: 150,
        quantity: 10,
        threshold: 5,
        expiry: '2025-12-31',
        supplier: 'Test Supplier',
        contact: '9876543210',
        unit: 'Pieces'
      };
    });

    it('should add product successfully with valid data', () => {
      spyOn(component, 'showToastMessage');
      spyOn(component, 'saveProducts');
      spyOn(component, 'resetNewProductForm');
      spyOn(component, 'toggleAddProductModal');
      spyOn(component, 'filterProducts');
      
      const initialLength = component.products.length;
      component.addProduct();
      
      expect(component.products.length).toBe(initialLength + 1);
      expect(component.products[0].name).toBe('Test Product');
      expect(component.showToastMessage).toHaveBeenCalledWith('Product added successfully!');
    });

    it('should validate required fields', () => {
      component.newProduct.name = '';
      spyOn(component, 'showToastMessage');
      
      component.addProduct();
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Please fill all required fields correctly!', 'error');
    });

    it('should validate unique product ID', () => {
      component.products = [{ ...mockProducts[0], id: 'PRD-TEST' }];
      component.newProduct.id = 'PRD-TEST';
      spyOn(component, 'showToastMessage');
      
      component.addProduct();
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Product ID already exists!', 'error');
    });

    it('should validate selling price greater than buying price', () => {
      component.newProduct.buyingPrice = 150;
      component.newProduct.sellingPrice = 100;
      spyOn(component, 'showToastMessage');
      
      component.addProduct();
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Selling price must be greater than buying price!', 'error');
    });

    it('should set correct product status based on quantity', () => {
      component.newProduct.quantity = 0;
      spyOn(component, 'showToastMessage');
      spyOn(component, 'saveProducts');
      spyOn(component, 'resetNewProductForm');
      spyOn(component, 'toggleAddProductModal');
      spyOn(component, 'filterProducts');
      
      component.addProduct();
      
      expect(component.products[0].status).toBe('out_of_stock');
    });
  });

  describe('Toast Messages', () => {
    it('should display toast message with default success type', () => {
      component.showToastMessage('Test message');
      
      expect(component.toastMessage).toBe('Test message');
      expect(component.toastType).toBe('success');
      expect(component.showToast).toBe(true);
    });

    it('should display toast message with error type', () => {
      component.showToastMessage('Error message', 'error');
      
      expect(component.toastMessage).toBe('Error message');
      expect(component.toastType).toBe('error');
      expect(component.showToast).toBe(true);
    });
  });

  describe('File Handling', () => {
    it('should handle file size validation', () => {
      const largeFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 }); // 3MB
      
      spyOn(component, 'showToastMessage');
      component.handleFile(largeFile);
      
      expect(component.showToastMessage).toHaveBeenCalledWith('File size exceeds 2MB limit!', 'error');
    });

    it('should handle file type validation', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      spyOn(component, 'showToastMessage');
      component.handleFile(textFile);
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Only image files are allowed!', 'error');
    });

    it('should handle valid image file', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(imageFile, 'size', { value: 1024 * 1024 }); // 1MB
      
      spyOn(component, 'showToastMessage');
      component.handleFile(imageFile);
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Image uploaded successfully!', 'success');
    });
  });

  describe('Export Functionality', () => {
    it('should show export success message', () => {
      spyOn(component, 'showToastMessage');
      
      component.exportData('pdf');
      
      expect(component.showToastMessage).toHaveBeenCalledWith('Export to PDF would be implemented here!');
      expect(component.showExportDropdown).toBe(false);
    });

    it('should toggle export dropdown', () => {
      component.showExportDropdown = false;
      component.toggleExportDropdown();
      
      expect(component.showExportDropdown).toBe(true);
    });
  });

  describe('Form Reset', () => {
    it('should reset new product form', () => {
      component.newProduct.name = 'Test';
      component.formErrors.name = true;
      
      component.resetNewProductForm();
      
      expect(component.newProduct.name).toBe('');
      expect(component.formErrors.name).toBe(false);
    });

    it('should reset form errors', () => {
      component.formErrors.name = true;
      component.formErrors.id = true;
      
      component.resetFormErrors();
      
      expect(component.formErrors.name).toBe(false);
      expect(component.formErrors.id).toBe(false);
    });
  });
});
