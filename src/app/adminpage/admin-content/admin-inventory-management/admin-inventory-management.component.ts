import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { Products } from '../../../models/product';
import { Supplier } from '../../../models/supplier';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/environment';

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
  itemsPerPage = 5;
  searchTerm = '';
  selectedCategoryFilter = '';
  selectedSubcategory = '';
  selectedStatus = '';
  startDate = '';
  endDate = '';
  isLoading = false;
  hasError = false;
  errorMessage = '';
  selectedProduct: Products | null = null;
  productToDelete: Products | null = null; // Changed to hold full product object for delete
  showProductModal = false;
  isEditing = false;
  currentProduct: Products = this.getEmptyProduct();
  toastMessage = '';
  toastClass = '';
  toastIcon = '';
  Math = Math;
  showCategoryModal = false;
  newCategoryName = ''; // Renamed to avoid conflict with newCategory in form
  categories: Category[] = []; // Array of Category objects
  categoryToDelete: Category | null = null; // Holds the Category object to be deactivated
  suppliers: Supplier[] = [];
  selectedSupplierDetails: Supplier | null = null;

  constructor(private http: HttpClient) {} // Inject HttpClient

  ngOnInit() {
    this.loadProducts();
    this.loadCategories(); // Load all categories for management
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.http.get<Supplier[]>(`${environment.apiUrl}/supplier`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.suppliers = data;
        },
        error: (err) => {
          console.error('Failed to load suppliers for dropdown:', err);
          this.showToast('Failed to load supplier list.', 'error');
        }
      });
  }

  onSupplierChange(supplierId: string) {
    this.selectedSupplierDetails = this.suppliers.find(s => String(s.id) === supplierId) || null;
    if (this.selectedSupplierDetails) {
      this.currentProduct.contact = this.selectedSupplierDetails.contact;
      this.currentProduct.supplier = this.selectedSupplierDetails.name; // Set supplier name for product
    } else {
      this.currentProduct.contact = '';
      this.currentProduct.supplier = '';
    }
  }

  getEmptyProduct(): Products {
    return {
      id: '',
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
      status: 'in_stock' // Default stock status
    };
  }

  loadProducts() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    this.http.get<Products[]>(`${environment.apiUrl}/product/all`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.products = data.map(p => ({
            ...p,
            expiry: p.expiry ? p.expiry.toString().split('T')[0] : '',
            status: this.determineProductStatus(p)
          }));
          this.filterProducts();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load products:', err);
          this.hasError = true;
          this.errorMessage = err.error?.message || 'Failed to load products.';
          this.showToast(this.errorMessage, 'error');
          this.isLoading = false;
        }
      });
  }

  filterProducts() {
    this.filteredProducts = this.products.filter(product => {
      // Category filter (using selectedCategoryFilter)
      if (this.selectedCategoryFilter && product.category !== this.selectedCategoryFilter) return false;

      // Status filter
      if (this.selectedStatus) {
        const currentStatusText = this.getStatusText(product);
        if (this.selectedStatus === "in_stock" && currentStatusText !== "In Stock") return false;
        if (this.selectedStatus === "low_stock" && currentStatusText !== "Low Stock") return false;
        if (this.selectedStatus === "out_of_stock" && currentStatusText !== "Out of Stock") return false;
      }

      // Search term
      if (this.searchTerm &&
          !product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
          !product.id.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
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

  determineProductStatus(product: Products): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (product.quantity === 0) {
      return 'out_of_stock';
    } else if (product.quantity <= product.threshold) {
      return 'low_stock';
    } else {
      return 'in_stock';
    }
  }

  formatDate(dateString: string) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  }

  viewProduct(product: Products) {
    this.selectedProduct = {...product};
  }

  closeProductView() {
    this.selectedProduct = null;
  }

  openAddProductModal() {
    this.currentProduct = this.getEmptyProduct();
    this.isEditing = false;
    this.showProductModal = true;
  }

  openEditProductModal(product: Products) {
    this.currentProduct = {...product};
    this.isEditing = true;
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
  }

  validateProduct(product: Products): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!product.id?.trim()) errors.push('Product ID is required');
    if (!product.name?.trim()) errors.push('Product name is required');
    if (!product.category?.trim()) errors.push('Category is required');
    if (product.buyingPrice <= 0) errors.push('Buying price must be greater than 0');
    if (product.sellingPrice <= 0) errors.push('Selling price must be greater than 0');
    if (product.sellingPrice <= product.buyingPrice) errors.push('Selling price must be greater than buying price');
    if (product.quantity < 0) errors.push('Quantity cannot be negative');
    if (product.threshold < 0) errors.push('Threshold cannot be negative');
    if (!product.supplier?.trim()) errors.push('Supplier is required');
    if (!product.contact?.trim()) errors.push('Contact is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  submitProductForm() {
    const validation = this.validateProduct(this.currentProduct);
    if (!validation.isValid) {
      this.showToast(validation.errors[0], 'error');
      return;
    }

    this.isLoading = true;
    const productPayload = {
      id: this.currentProduct.id.trim(),
      name: this.currentProduct.name.trim(),
      category: this.currentProduct.category.trim(),
      subcategory: this.currentProduct.subcategory?.trim() || '',
      buying_price: this.currentProduct.buyingPrice,
      selling_price: this.currentProduct.sellingPrice,
      quantity: this.currentProduct.quantity,
      threshold: this.currentProduct.threshold,
      expiry: this.currentProduct.expiry || null,
      supplier: this.currentProduct.supplier.trim(),
      contact: this.currentProduct.contact.trim(),
      status: this.determineProductStatus(this.currentProduct)
    };


    if (this.isEditing) {
      this.http.put(`${environment.apiUrl}/product/${this.currentProduct.id}`, productPayload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Product updated successfully') {
              this.showToast('Product updated successfully!', 'success');
              this.loadProducts();
              this.showProductModal = false;
            } else {
              this.showToast(response.message || 'Failed to update product.', 'error');
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Update product failed:', err);
            const errorMessage = err.error?.message || 
              (err.status === 404 ? 'Product not found.' :
               err.status === 403 ? 'Not authorized to update product.' :
               'Server error occurred during product update.');
            this.showToast(errorMessage, 'error');
            this.isLoading = false;
          }
        });
    } else {
      this.http.post(`${environment.apiUrl}/product/add`, productPayload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Product added successfully') {
              this.showToast('Product added successfully!', 'success');
              this.loadProducts();
              this.showProductModal = false;
              this.currentProduct = this.getEmptyProduct(); // Reset form
            } else {
              this.showToast(response.message || 'Failed to add product.', 'error');
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Add product failed:', err);
            const errorMessage = err.error?.message || 
              (err.status === 409 ? 'Product ID already exists.' :
               err.status === 403 ? 'Not authorized to add products.' :
               'Server error occurred during product add.');
            this.showToast(errorMessage, 'error');
            this.isLoading = false;
          }
        });
    }
  }

  confirmDelete(product: Products) {
    this.productToDelete = product;
  }

  closeDeleteModal() {
    this.productToDelete = null;
  }

  // Changed from deleteProduct to deactivateProduct (soft delete)
  deactivateProduct() {
    if (!this.productToDelete || !this.productToDelete.id) return;

    this.http.delete(`${environment.apiUrl}/product/${this.productToDelete.id}`, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message === 'Product deactivated successfully') { // Check for backend's new message
            this.showToast('Product deactivated successfully!', 'success');
            this.loadProducts(); // Reload products after deactivate
            this.productToDelete = null;
            this.selectedProduct = null;
          } else {
            this.showToast(response.message || 'Failed to deactivate product.', 'error');
          }
        },
        error: (err) => {
          console.error('Deactivate product failed:', err);
          this.showToast(err.error?.message || 'Server error occurred during product deactivation.', 'error');
        }
      });
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCategoryFilter = ''; // Use the renamed filter variable
    this.selectedSubcategory = '';
    this.selectedStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.filterProducts(); // Call filterProducts to reset filtered list
    this.currentPage = 1;
  }

  getStockWidth(product: Products) {
    if (product.threshold <= 0) return 0;
    const percentage = (product.quantity / product.threshold) * 100;
    return Math.min(percentage, 100);
  }

  trackByProductId(index: number, product: Products): string {
    return product.id;
  }

  // Get only active category names for product form dropdown
  getUniqueCategories(): string[] {
    return this.categories.filter(cat => cat.action === 'active').map(cat => cat.name);
  }

  // Load all categories from backend for management
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
    this.newCategoryName = ''; // Clear input when opening
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
          this.loadCategories(); // Reload categories from backend
        },
        error: (err) => {
          console.error('Add category failed:', err);
          this.showToast(err.error?.message || 'Failed to add category.', 'error');
        }
      });
  }

  confirmDeactivateCategory(category: Category) { // Changed name to reflect soft delete
    this.categoryToDelete = category;
  }

  deactivateCategory() { // Renamed from deleteCategory
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

  activateCategory(category: Category) { // NEW method to activate category
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

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info') { // Added 'info' type
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
      case 'warning': // Added warning toast style
        this.toastClass = 'bg-yellow-100 text-yellow-800';
        this.toastIcon = 'fas fa-exclamation-triangle text-yellow-500';
        break;
      case 'info': // Added info toast style
        this.toastClass = 'bg-blue-100 text-blue-800';
        this.toastIcon = 'fas fa-info-circle text-blue-500';
        break;
    }

    setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  }

  // Ensure exportToPDF has jsPDF and autoTable imported or declared globally if using them.
  // For jsPDF, you might need to add these scripts to your index.html or angular.json scripts array
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>

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
      'Expiry Date': this.formatDate(product.expiry),
      'Supplier': product.supplier,
      'Contact': product.contact
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'Inventory_Report.xlsx');
    this.showToast('Excel exported successfully!', 'success');
  }

  // exportToPDF() { // Uncomment and use if jsPDF is properly configured
  //   const doc = new jsPDF();
  //   const title = 'Inventory Report';
  //   const headers = [
  //     ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Expiry']
  //   ];

  //   const data = this.filteredProducts.map(product => [
  //     product.id,
  //     product.name,
  //     product.category,
  //     '₹' + product.sellingPrice.toFixed(2),
  //     product.quantity,
  //     this.getStatusText(product),
  //     this.formatDate(product.expiry)
  //   ]);

  //   (doc as any).autoTable({
  //     head: headers,
  //     body: data,
  //     startY: 20,
  //     theme: 'grid',
  //     headStyles: {
  //       fillColor: [41, 128, 185],
  //       textColor: 255,
  //       fontStyle: 'bold'
  //     },
  //     alternateRowStyles: {
  //       fillColor: [245, 245, 245]
  //     },
  //     margin: { top: 30 }
  //   });

  //   doc.text(title, 14, 15);
  //   doc.save('Inventory_Report.pdf');
  //   this.showToast('PDF exported successfully!', 'success');
  // }
}

// declare const jsPDF: any; // Uncomment if using jsPDF
// declare const autoTable: any; // Uncomment if using jsPDF