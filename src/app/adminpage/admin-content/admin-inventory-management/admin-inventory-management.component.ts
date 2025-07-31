import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Supplier } from '../../../models/supplier';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/environment';

// Define the Products interface to match your MySQL schema
export interface Products {
  id?: number; // Changed to number and made optional for auto-increment
  name: string;
  category: string;
  subcategory?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  threshold: number;
  expiry?: string; // Stored as string (YYYY-MM-DD) for date input
  supplier?: string; // Supplier Name from backend
  contact?: string; // Supplier Contact from backend
  supplier_id?: number; // Supplier ID to link with suppliers table
  status?: 'in_stock' | 'low_stock' | 'out_of_stock'; // Stock status (derived from quantity vs threshold)
  action: 'active' | 'inactive'; // Product active/inactive status from database
  created_at?: string; // Timestamp from backend
  updated_at?: string; // Timestamp from backend
}

// Define a Category interface to match backend response
interface Category {
  id: number;
  name: string;
  action: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-admin-inventory-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-inventory-management.component.html',
  styleUrls: ['./admin-inventory-management.component.css']
})
export class AdminInventoryManagementComponent implements OnInit {
  products: Products[] = [];
  filteredProducts: Products[] = [];
  currentPage = 1;
  priceError: string = '';
  itemsPerPage = 5;
  searchTerm = '';
  selectedCategoryFilter = '';
  selectedSubcategory = '';
  selectedStatus = '';
  selectedProductStatus = '';
  startDate = '';
  endDate = '';
  selectedProduct: Products | null = null;
  showProductModal = false;
  isEditing = false;
  currentProduct: Products = this.getEmptyProduct();
  toastMessage = '';
  toastClass = '';
  toastIcon = '';
  Math = Math;
  showCategoryModal = false;
  newCategoryName = '';
  categories: Category[] = [];
  categoryToDelete: Category | null = null;
  suppliers: Supplier[] = [];
  selectedSupplierDetails: Supplier | null = null;
  currentSupplierId: string = ''; // Track current supplier ID for form binding

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadSuppliers();
  }

  loadSuppliers() {
    console.log('Loading suppliers...');
    this.http.get<Supplier[]>(`${environment.apiUrl}/supplier`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('Suppliers loaded successfully:', data);
          this.suppliers = data;
        },
        error: (err) => {
          console.error('Failed to load suppliers for dropdown:', err);
          this.showToast('Failed to load supplier list. Please try refreshing the page.', 'error');
        }
      });
  }

  onSupplierChange(supplierId: string) {
    // Convert supplierId to number for comparison if supplier.id is number
    const selectedId = Number(supplierId);
    const supplier = this.suppliers.find(s => Number(s.id) === selectedId);
    this.selectedSupplierDetails = supplier || null;
    this.currentSupplierId = supplierId; // Keep as string for select value binding

    if (this.selectedSupplierDetails) {
      this.currentProduct.contact = this.selectedSupplierDetails.contact || '';
      this.currentProduct.supplier = this.selectedSupplierDetails.name || '';
      this.currentProduct.supplier_id = Number(this.selectedSupplierDetails.id); // Set supplier_id as number

      // Also update the form fields if they're empty or need to be pre-filled
      if (!this.currentProduct.category) {
        this.currentProduct.category = this.selectedSupplierDetails.category || '';
      }
    } else {
      this.currentProduct.contact = '';
      this.currentProduct.supplier = '';
      this.currentProduct.supplier_id = undefined; // Clear supplier_id
    }
  }

  getEmptyProduct(): Products {
    return {
      id: undefined, // Set to undefined (or null) for auto-incremented ID
      name: '',
      category: '',
      subcategory: '',
      buyingPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      threshold: 5,
      expiry: '', // YYYY-MM-DD format
      supplier: '', // Supplier name
      contact: '', // Supplier contact
      supplier_id: undefined, // Initialize supplier_id as undefined
      action: 'active' // Default action - matches database field
    };
  }

  loadProducts() {
    // Fetch ALL products for admin management
    this.http.get<any[]>(`${environment.apiUrl}/product/all`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('Raw data from backend:', data); // Debug log to see exact data structure
          this.products = data.map(p => ({
            id: p.id, // ID is now a number from DB
            name: p.name,
            category: p.category,
            subcategory: p.subcategory,
            buyingPrice: Number(p.buying_price || p.buyingPrice || 0), // Handle both snake_case and camelCase
            sellingPrice: Number(p.selling_price || p.sellingPrice || 0), // Handle both snake_case and camelCase
            quantity: Number(p.quantity || 0),
            threshold: Number(p.threshold || 5),
            expiry: p.expiry ? p.expiry.toString().split('T')[0] : '', // Format expiry date for input type="date"
            supplier: p.supplier || '',
            contact: p.contact || '',
            supplier_id: p.supplier_id, // Map supplier_id
            action: p.action || 'active', // Use action field from database
            created_at: p.created_at,
            updated_at: p.updated_at
          }));
          console.log('Mapped products for frontend:', this.products); // Debug log to see mapped data
          this.filterProducts();
        },
        error: (err) => {
          console.error('Failed to load products:', err);
          this.showToast('Failed to load products.', 'error');
        }
      });
  }

  filterProducts() {
    this.filteredProducts = this.products.filter(product => {
      // Category filter (using selectedCategoryFilter)
      if (this.selectedCategoryFilter && product.category !== this.selectedCategoryFilter) return false;

      // Stock status filter
      if (this.selectedStatus) {
        const currentStatusText = this.getStatusText(product);
        if (this.selectedStatus === "in_stock" && currentStatusText !== "In Stock") return false;
        if (this.selectedStatus === "low_stock" && currentStatusText !== "Low Stock") return false;
        if (this.selectedStatus === "out_of_stock" && currentStatusText !== "Out of Stock") return false;
      }

      // Product status filter (active/inactive)
      if (this.selectedProductStatus && product.action !== this.selectedProductStatus) return false;

      // Search term
      if (this.searchTerm &&
          !product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
          !product.id?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) && // Convert ID to string for search, make it optional
          !product.category.toLowerCase().includes(this.searchTerm.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (this.startDate && product.expiry && product.expiry < this.startDate) return false;
      if (this.endDate && product.expiry && product.expiry > this.endDate) return false;

      return true;
    });

    this.currentPage = 1;
  }

  get paginatedProducts() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  getStatusClass(product: Products) {
    if (product.quantity === 0) {
      return "bg-red-100 text-red-800";
    } else if (product.quantity <= product.threshold) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-green-100 text-green-800";
    }
  }

  getStatusText(product: Products) {
    if (product.quantity === 0) {
      return "Out of Stock";
    } else if (product.quantity <= product.threshold) {
      return "Low Stock";
    } else {
      return "In Stock";
    }
  }

  getStockColor(product: Products) {
    if (product.quantity === 0) {
      return "red";
    } else if (product.quantity <= product.threshold) {
      return "yellow";
    } else {
      return "green";
    }
  }

  formatDate(dateString: string) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  }

  viewProduct(product: Products) {
    // Create a deep copy and ensure all required fields have default values
    this.selectedProduct = {
      ...product,
      buyingPrice: product.buyingPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      quantity: product.quantity || 0,
      threshold: product.threshold || 0,
      expiry: product.expiry ? product.expiry.toString().split('T')[0] : '',
      supplier: product.supplier || 'N/A',
      contact: product.contact || 'N/A',
      supplier_id: product.supplier_id // Include supplier_id in view
    };
  }

  closeProductView() {
    this.selectedProduct = null;
  }

  openAddProductModal() {
    // Check if suppliers are loaded
    if (this.suppliers.length === 0) {
      this.showToast('Suppliers are not loaded yet. Please wait and try again.', 'error');
      this.loadSuppliers(); // Try to reload suppliers
      return;
    }
    
    this.currentProduct = this.getEmptyProduct();
    this.selectedSupplierDetails = null;
    this.currentSupplierId = ''; // Reset supplier dropdown
    this.isEditing = false;
    this.showProductModal = true;
  }

  openEditProductModal(product: Products) {
    // Ensure expiry is formatted for input type="date"
    this.currentProduct = {
      ...product,
      expiry: product.expiry ? product.expiry.toString().split('T')[0] : '',
      buyingPrice: product.buyingPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      quantity: product.quantity || 0,
      threshold: product.threshold || 0
    };
    
    // Find and set the selected supplier based on supplier_id
    if (product.supplier_id) {
      const matchingSupplier = this.suppliers.find(s => Number(s.id) === Number(product.supplier_id));
      this.selectedSupplierDetails = matchingSupplier || null;
      this.currentSupplierId = matchingSupplier?.id.toString() || ''; // Set currentSupplierId for dropdown
    } else {
      this.selectedSupplierDetails = null;
      this.currentSupplierId = '';
    }
    
    this.isEditing = true;
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
  }

  submitProductForm() {
    // Frontend validation
    // ID is NOT required for NEW products (auto-incremented)
    // ID IS required for EDITING products (to identify which product to update)
    if (this.isEditing && this.currentProduct.id === undefined) {
        this.showToast('Product ID is missing for editing.', 'error');
        return;
    }

    // Detailed validation with specific error messages
    if (!this.currentProduct.name) {
      this.showToast('Product name is required.', 'error');
      return;
    }

    if (!this.currentProduct.category) {
      this.showToast('Product category is required.', 'error');
      return;
    }

    if (this.currentProduct.buyingPrice === undefined || this.currentProduct.buyingPrice <= 0) {
      this.showToast('Buying price must be greater than 0.', 'error');
      return;
    }

    if (this.currentProduct.sellingPrice === undefined || this.currentProduct.sellingPrice <= 0) {
      this.showToast('Selling price must be greater than 0.', 'error');
      return;
    }

    if (this.currentProduct.quantity === undefined || this.currentProduct.quantity < 0) {
      this.showToast('Quantity cannot be negative.', 'error');
      return;
    }

    if (this.currentProduct.threshold === undefined || this.currentProduct.threshold < 0) {
      this.showToast('Threshold cannot be negative.', 'error');
      return;
    }

    if (this.currentProduct.supplier_id === undefined || this.currentProduct.supplier_id === null) {
      this.showToast('Please select a supplier. This field is required.', 'error');
      return;
    }

    // Prepare payload for backend (match backend's expected snake_case)
    const productPayload: any = { // Use 'any' to dynamically add/remove ID
      name: this.currentProduct.name,
      category: this.currentProduct.category,
      subcategory: this.currentProduct.subcategory,
      buying_price: Number(this.currentProduct.buyingPrice),
      selling_price: Number(this.currentProduct.sellingPrice),
      quantity: Number(this.currentProduct.quantity),
      threshold: Number(this.currentProduct.threshold),
      expiry: this.currentProduct.expiry || null, // Send null if empty
      supplier: this.currentProduct.supplier,
      contact: this.currentProduct.contact,
      supplier_id: this.currentProduct.supplier_id // Always send supplier_id
    };

    // ONLY include ID in payload if we are editing
    if (this.isEditing) {
      productPayload.id = this.currentProduct.id;
    }

    console.log('Sending product payload:', productPayload); // Debug log

    if (this.isEditing) {
      // Update product via backend
      this.http.put(`${environment.apiUrl}/product/${this.currentProduct.id}`, productPayload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Product updated successfully') {
              this.showToast('Product updated successfully!', 'success');
              this.loadProducts(); // Reload products after update
              this.showProductModal = false;
            } else {
              this.showToast(response.message || 'Failed to update product.', 'error');
            }
          },
          error: (err) => {
            console.error('Update product failed:', err);
            this.showToast(err.error?.message || 'Server error occurred during product update.', 'error');
          }
        });
    } else {
      // Add product via backend
      // No ID passed in the URL for ADD
      this.http.post(`${environment.apiUrl}/product/add`, productPayload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Product added successfully') {
              this.showToast('Product added successfully!', 'success');
              this.loadProducts(); // Reload products after add
              this.showProductModal = false;
            } else {
              this.showToast(response.message || 'Failed to add product.', 'error');
            }
          },
          error: (err) => {
            console.error('Add product failed:', err);
            this.showToast(err.error?.message || 'Server error occurred during product add.', 'error');
          }
        });
    }
  }

  // ... (rest of the methods remain unchanged)
  activateProduct(product: Products) {
    if (!product || product.id === undefined) return; // Use product.id directly

    this.http.put(`${environment.apiUrl}/product/activate/${product.id}`, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message === 'Product activated successfully') {
            this.showToast('Product activated successfully!', 'success');
            this.loadProducts();
          } else {
            this.showToast(response.message || 'Failed to activate product.', 'error');
          }
        },
        error: (err) => {
          console.error('Activate product failed:', err);
          this.showToast(err.error?.message || 'Server error occurred during product activation.', 'error');
        }
      });
  }

  toggleProductStatus(product: Products) {
    if (product.id === undefined) return; // Ensure product.id exists

    if (product.action === 'active') {
      // Deactivate the product
      this.http.delete(`${environment.apiUrl}/product/${product.id}`, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            this.showToast('Product deactivated successfully!', 'success');
            this.loadProducts();
            // Close the product view modal if it's open
            if (this.selectedProduct && this.selectedProduct.id === product.id) {
              this.selectedProduct = null;
            }
          },
          error: (err) => {
            console.error('Deactivate product failed:', err);
            this.showToast(err.error?.message || 'Failed to deactivate product.', 'error');
          }
        });
    } else {
      // Activate the product
      this.activateProduct(product);
      // Close the product view modal if it's open
      if (this.selectedProduct && this.selectedProduct.id === product.id) {
        this.selectedProduct = null;
      }
    }
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCategoryFilter = '';
    this.selectedSubcategory = '';
    this.selectedStatus = '';
    this.selectedProductStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.filterProducts();
    this.currentPage = 1;
  }

  getStockWidth(product: Products) {
    if (product.threshold === undefined || product.threshold <= 0) return 0; // Handle undefined threshold
    const percentage = (product.quantity / product.threshold) * 100;
    return Math.min(percentage, 100);
  }

  trackByProductId(index: number, product: Products): number | undefined { // trackBy function should return type of id
    return product.id; // Return number or undefined
  }

  getUniqueCategories(): string[] {
    return this.categories.filter(cat => cat.action === 'active').map(cat => cat.name);
  }

  loadCategories() {
    this.http.get<Category[]>(`${environment.apiUrl}/category`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.categories = data;
        },
        error: (err) => {
          console.error('Failed to load categories:', err);
          this.showToast('Failed to load categories.', 'error');
        }
      });
  }

  openCategoryModal() {
    this.showCategoryModal = true;
    this.newCategoryName = '';
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.newCategoryName = '';
  }

  addCategory() {
    const categoryName = this.newCategoryName.trim();
    if (!categoryName) {
      this.showToast('Category name cannot be empty.', 'warning');
      return;
    }

    if (this.categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
      this.showToast('Category already exists.', 'warning');
      return;
    }

    this.http.post(`${environment.apiUrl}/category/add`, { name: categoryName }, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          this.showToast('Category added successfully!', 'success');
          this.newCategoryName = '';
          this.loadCategories();
        },
        error: (err) => {
          console.error('Add category failed:', err);
          this.showToast(err.error?.message || 'Failed to add category.', 'error');
        }
      });
  }

  confirmDeactivateCategory(category: Category) {
    this.categoryToDelete = category;
  }

  deactivateCategory() {
    if (!this.categoryToDelete || this.categoryToDelete.id === undefined) return;

    this.http.put(`${environment.apiUrl}/category/deactivate/${this.categoryToDelete.id}`, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          this.showToast('Category deactivated successfully!', 'success');
          this.categoryToDelete = null;
          this.loadCategories(); // Reload categories
          this.loadProducts(); // Reload products as some might become 'Uncategorized' if category was removed
          this.filterProducts(); // Re-apply filters
        },
        error: (err) => {
          console.error('Deactivate category failed:', err);
          this.showToast(err.error?.message || 'Failed to deactivate category.', 'error');
        }
      });
  }

  activateCategory(category: Category) {
    if (category.id === undefined) return;

    this.http.put(`${environment.apiUrl}/category/activate/${category.id}`, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          this.showToast('Category activated successfully!', 'success');
          this.loadCategories(); // Reload categories
          this.loadProducts(); // Reload products
          this.filterProducts(); // Re-apply filters
        },
        error: (err) => {
          console.error('Activate category failed:', err);
          this.showToast(err.error?.message || 'Failed to activate category.', 'error');
        }
      });
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    this.toastMessage = message;
    switch(type) {
      case 'success':
        this.toastClass = 'bg-green-100 text-green-800';
        this.toastIcon = 'fas fa-check-circle text-green-500';
        break;
      case 'error':
        this.toastClass = 'bg-red-100 text-red-800';
        this.toastIcon = 'fas fa-exclamation-circle text-red-500';
        break;
      case 'warning':
        this.toastClass = 'bg-yellow-100 text-yellow-800';
        this.toastIcon = 'fas fa-exclamation-triangle text-yellow-500';
        break;
      case 'info':
        this.toastClass = 'bg-blue-100 text-blue-800';
        this.toastIcon = 'fas fa-info-circle text-blue-500';
        break;
    }

    setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  }

  exportToExcel() {
    const data = this.filteredProducts.map(product => ({
      'Product ID': product.id,
      'Product Name': product.name,
      'Category': product.category,
      'Subcategory': product.subcategory,
      'Buying Price': product.buyingPrice,
      'Selling Price': product.sellingPrice,
      'Quantity': product.quantity,
      'Threshold': product.threshold,
      'Status': this.getStatusText(product),
      'Expiry Date': this.formatDate(product.expiry ?? ''),
      'Supplier': product.supplier,
      'Contact': product.contact,
      'Supplier ID': product.supplier_id // Include in export
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'Inventory_Report.xlsx');
    this.showToast('Excel exported successfully!', 'success');
  }
}