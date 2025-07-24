import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  threshold: number;
  expiry: string;
  supplier: string;
  contact: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-inventory.component.css']
})
export class AdminInventoryComponent implements OnInit {
  // Products data
  products: Product[] = [];
  filteredProducts: Product[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;

  // Filters
  searchTerm = '';
  selectedCategory = '';
  selectedSubcategory = '';
  selectedStatus = '';
  startDate = '';
  endDate = '';

  // Modal states
  showAddProductModal = false;
  showProductViewModal = false;
  showDeleteConfirmationModal = false;
  isEditMode = false;
  showExportDropdown = false;

  // Selected product for view/edit
  selectedProduct: Product | null = null;
  productToDeleteId: string | null = null;

  // Form data for add/edit
  newProduct: Omit<Product, 'status'> & { unit: string } = {
    id: '',
    name: '',
    category: '',
    subcategory: '',
    buyingPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    threshold: 0,
    expiry: '',
    supplier: '',
    contact: '9876543210',
    unit: ''
  };

  // Form errors
  formErrors = {
    name: false,
    id: false,
    category: false,
    buyingPrice: false,
    sellingPrice: false,
    quantity: false,
    unit: false,
    threshold: false
  };

  // Subcategories mapping
  subcategories: { [key: string]: string[] } = {
    'Dairy Products': ['Milk', 'Paneer', 'Cheese', 'Yogurt', 'Butter'],
    'Electronics': ['Mobile', 'Laptop', 'Headphones', 'TV', 'Camera'],
    'Grocery': ['Rice', 'Pulses', 'Spices', 'Oil', 'Flour'],
    'Beverages': ['Juice', 'Soda', 'Tea', 'Coffee', 'Water'],
    'Snacks': ['Chips', 'Biscuits', 'Chocolate', 'Nuts', 'Cookies']
  };

  // Categories
  categories = Object.keys(this.subcategories);

  // Units
  units = ['Pieces', 'Kilograms', 'Grams', 'Liters', 'Milliliters', 'Box', 'Pack'];

  // Suppliers
  suppliers = ['Supplier X', 'Supplier Y', 'Supplier Z'];

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  // Drag and drop state
  isDragOver = false;
Math: any;

  ngOnInit(): void {
    this.loadProducts();
    this.filterProducts();
  }

  // Load products from localStorage
  loadProducts(): void {
    const savedProducts = localStorage.getItem('inventoryProducts');
    if (savedProducts) {
      this.products = JSON.parse(savedProducts);
    } else {
      this.products = [
        {
          id: "PRD-001",
          name: "Maggi Noodles",
          category: "Snacks",
          subcategory: "Instant Noodles",
          buyingPrice: 35.00,
          sellingPrice: 43.00,
          quantity: 43,
          threshold: 12,
          expiry: "2026-04-11",
          supplier: "Supplier X",
          contact: "9876543210",
          status: "in_stock"
        },
        {
          id: "PRD-002",
          name: "Amul Milk",
          category: "Dairy Products",
          subcategory: "Milk",
          buyingPrice: 20.00,
          sellingPrice: 25.00,
          quantity: 50,
          threshold: 20,
          expiry: "2025-06-15",
          supplier: "Supplier Y",
          contact: "9876543211",
          status: "in_stock"
        },
        {
          id: "PRD-003",
          name: "Coca Cola",
          category: "Beverages",
          subcategory: "Soda",
          buyingPrice: 32.00,
          sellingPrice: 40.00,
          quantity: 15,
          threshold: 20,
          expiry: "2025-12-30",
          supplier: "Supplier Z",
          contact: "9876543212",
          status: "low_stock"
        },
        {
          id: "PRD-004",
          name: "Sunflower Oil",
          category: "Grocery",
          subcategory: "Oil",
          buyingPrice: 120.00,
          sellingPrice: 150.00,
          quantity: 3,
          threshold: 5,
          expiry: "2026-03-01",
          supplier: "Supplier X",
          contact: "9876543210",
          status: "low_stock"
        },
        {
          id: "PRD-005",
          name: "Dairy Milk Chocolate",
          category: "Snacks",
          subcategory: "Chocolate",
          buyingPrice: 45.00,
          sellingPrice: 55.00,
          quantity: 0,
          threshold: 10,
          expiry: "2025-09-30",
          supplier: "Supplier Y",
          contact: "9876543211",
          status: "out_of_stock"
        }
      ];
      this.saveProducts();
    }
    this.filteredProducts = [...this.products];
  }

  // Save products to localStorage
  saveProducts(): void {
    localStorage.setItem('inventoryProducts', JSON.stringify(this.products));
  }

  // Filter products based on selected filters
  filterProducts(): void {
    this.filteredProducts = this.products.filter(product => {
      const searchTermLower = this.searchTerm.toLowerCase();
      const matchesSearch = !this.searchTerm ||
        product.name.toLowerCase().includes(searchTermLower) ||
        product.id.toLowerCase().includes(searchTermLower) ||
        product.category.toLowerCase().includes(searchTermLower);

      const matchesCategory = !this.selectedCategory || product.category === this.selectedCategory;
      const matchesSubcategory = !this.selectedSubcategory || product.subcategory === this.selectedSubcategory;
      const matchesStatus = !this.selectedStatus ||
        (this.selectedStatus === 'in_stock' && product.quantity > product.threshold && product.quantity > 0) ||
        (this.selectedStatus === 'low_stock' && product.quantity <= product.threshold && product.quantity > 0) ||
        (this.selectedStatus === 'out_of_stock' && product.quantity === 0);
      const matchesDateRange = (!this.startDate || (product.expiry && product.expiry >= this.startDate)) &&
                               (!this.endDate || (product.expiry && product.expiry <= this.endDate));

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus && matchesDateRange;
    });
    this.currentPage = 1;
  }

  // Handle category change
  onCategoryChange(): void {
    this.selectedSubcategory = '';
    this.filterProducts();
  }

  // Clear individual filters
  clearCategoryFilter(): void {
    this.selectedCategory = '';
    this.selectedSubcategory = '';
    this.filterProducts();
  }

  clearSubcategoryFilter(): void {
    this.selectedSubcategory = '';
    this.filterProducts();
  }

  clearStatusFilter(): void {
    this.selectedStatus = '';
    this.filterProducts();
  }

  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.filterProducts();
  }

  // Reset all filters
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedSubcategory = '';
    this.selectedStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.filterProducts();
  }

  // Pagination methods
  get paginatedProducts(): Product[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  goToPrevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Get product status
  getProductStatus(product: Product): { text: string, class: string } {
    if (product.quantity === 0) {
      return { text: 'Out of Stock', class: 'bg-red-100 text-red-800' };
    } else if (product.quantity <= product.threshold) {
      return { text: 'Low Stock', class: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'In Stock', class: 'bg-green-100 text-green-800' };
    }
  }

  // Get stock color
  getStockColor(product: Product): string {
    if (product.quantity === 0) return 'red';
    if (product.quantity <= product.threshold) return 'yellow';
    return 'green';
  }

  // Get stock width for progress bar
  getStockWidth(product: Product): number {
    return product.threshold > 0 ? Math.min((product.quantity / product.threshold) * 100, 100) : 0;
  }

  // Format date
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Toggle add product modal
  toggleAddProductModal(): void {
    this.showAddProductModal = !this.showAddProductModal;
    if (!this.showAddProductModal) {
      this.resetNewProductForm();
    }
  }

  // Reset new product form
  resetNewProductForm(): void {
    this.newProduct = {
      id: '',
      name: '',
      category: '',
      subcategory: '',
      buyingPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      threshold: 0,
      expiry: '',
      supplier: '',
      contact: '9876543210',
      unit: ''
    };
    this.resetFormErrors();
  }

  // Reset form errors
  resetFormErrors(): void {
    this.formErrors = {
      name: false,
      id: false,
      category: false,
      buyingPrice: false,
      sellingPrice: false,
      quantity: false,
      unit: false,
      threshold: false
    };
  }

  // Add new product
  addProduct(): void {
    this.resetFormErrors();
    let isValid = true;

    if (!this.newProduct.name.trim()) {
      this.formErrors.name = true;
      isValid = false;
    }

    if (!this.newProduct.id.trim()) {
      this.formErrors.id = true;
      isValid = false;
    } else if (this.products.some(p => p.id === this.newProduct.id)) {
      this.formErrors.id = true;
      this.showToastMessage('Product ID already exists!', 'error');
      isValid = false;
    }

    if (!this.newProduct.category) {
      this.formErrors.category = true;
      isValid = false;
    }

    if (this.newProduct.buyingPrice <= 0) {
      this.formErrors.buyingPrice = true;
      isValid = false;
    }

    if (this.newProduct.sellingPrice <= 0) {
      this.formErrors.sellingPrice = true;
      isValid = false;
    }

    if (this.newProduct.sellingPrice < this.newProduct.buyingPrice) {
      this.formErrors.sellingPrice = true;
      this.showToastMessage('Selling price must be greater than buying price!', 'error');
      isValid = false;
    }

    if (this.newProduct.quantity < 0) {
      this.formErrors.quantity = true;
      isValid = false;
    }

    if (!this.newProduct.unit) {
      this.formErrors.unit = true;
      isValid = false;
    }

    if (this.newProduct.threshold < 0) {
      this.formErrors.threshold = true;
      isValid = false;
    }

    if (!isValid) {
      this.showToastMessage('Please fill all required fields correctly!', 'error');
      return;
    }

    const status = this.newProduct.quantity === 0 ? 'out_of_stock' :
                   this.newProduct.quantity <= this.newProduct.threshold ? 'low_stock' : 'in_stock';

    const product: Product = {
      ...this.newProduct,
      status
    };

    this.products.unshift(product);
    this.saveProducts();
    this.resetNewProductForm();
    this.toggleAddProductModal();
    this.filterProducts();
    this.showToastMessage('Product added successfully!');
  }

  // Show product view modal
  openProductView(product: Product): void {
    this.selectedProduct = { ...product };
    this.showProductViewModal = true;
    this.isEditMode = false;
  }

  // Close product view modal
  closeProductView(): void {
    this.showProductViewModal = false;
    this.selectedProduct = null;
    this.isEditMode = false;
  }

  // Toggle edit mode
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  // Save edited product
  saveEditedProduct(): void {
    if (!this.selectedProduct) {
      this.showToastMessage('No product selected!', 'error');
      return;
    }

    if (!this.selectedProduct.name.trim() ||
        !this.selectedProduct.id.trim() ||
        !this.selectedProduct.category ||
        this.selectedProduct.buyingPrice <= 0 ||
        this.selectedProduct.sellingPrice <= 0 ||
        this.selectedProduct.quantity < 0 ||
        this.selectedProduct.threshold < 0) {
      this.showToastMessage('Please fill all required fields correctly!', 'error');
      return;
    }

    if (this.selectedProduct.sellingPrice < this.selectedProduct.buyingPrice) {
      this.showToastMessage('Selling price must be greater than buying price!', 'error');
      return;
    }

    const originalProduct = this.products.find(p => p.id === this.selectedProduct?.id);
    if (!originalProduct) {
      this.showToastMessage('Product not found!', 'error');
      return;
    }

    if (this.selectedProduct.id !== originalProduct.id &&
        this.products.some(p => p.id === this.selectedProduct?.id && p !== originalProduct)) {
      this.showToastMessage('Product ID already exists!', 'error');
      return;
    }

    this.selectedProduct.status = this.selectedProduct.quantity === 0 ? 'out_of_stock' :
                                 this.selectedProduct.quantity <= this.selectedProduct.threshold ? 'low_stock' : 'in_stock';

    const index = this.products.indexOf(originalProduct);
    if (index !== -1) {
      this.products[index] = { ...this.selectedProduct };
      this.saveProducts();
      const filteredIndex = this.filteredProducts.indexOf(originalProduct);
      if (filteredIndex !== -1) {
        this.filteredProducts[filteredIndex] = { ...this.selectedProduct };
      }
      this.isEditMode = false;
      this.showToastMessage('Product updated successfully!');
    }
  }

  // Confirm product deletion
  confirmDeleteProduct(): void {
    if (!this.selectedProduct) return;
    this.productToDeleteId = this.selectedProduct.id;
    this.showDeleteConfirmationModal = true;
  }

  // Close delete confirmation modal
  closeDeleteModal(): void {
    this.showDeleteConfirmationModal = false;
    this.productToDeleteId = null;
  }

  // Delete product
  deleteProduct(): void {
    if (!this.productToDeleteId) return;

    this.products = this.products.filter(product => product.id !== this.productToDeleteId);
    this.saveProducts();
    this.filteredProducts = this.filteredProducts.filter(product => product.id !== this.productToDeleteId);
    this.closeDeleteModal();
    this.closeProductView();
    this.showToastMessage('Product deleted successfully!');
  }

  // Show toast message
  showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  // Export data
  exportData(format: 'pdf' | 'excel' | 'csv'): void {
    this.showToastMessage(`Export to ${format.toUpperCase()} would be implemented here!`);
    this.showExportDropdown = false;
  }

  // Toggle export dropdown
  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('productImage') as HTMLInputElement;
    fileInput.click();
  }

  handleFile(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      this.showToastMessage('File size exceeds 2MB limit!', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.showToastMessage('Only image files are allowed!', 'error');
      return;
    }
    this.showToastMessage('Image uploaded successfully!', 'success');
    // In a real app, handle file upload here (e.g., store in state or upload to server)
  }
}