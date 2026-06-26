// components/admin-order/admin-order.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Order } from '../../../models/order'; // Use the updated Order interface
import { Products } from '../../../models/product'; // Product model
import { Supplier } from '../../../models/supplier'; // Supplier model
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user'; // User model for currentUser
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order.component.html',
  styleUrls: ['./admin-order.component.css']
})
export class AdminOrderComponent implements OnInit {
  isInvoiceVisible: boolean = false;
  isNewOrderModalVisible: boolean = false;
  showSuccessPopup: boolean = false;
  currentOrder: Order | null = null; // Holds the order being viewed/edited
  newOrderId: string = ''; // Used for success popup message
  highlightedOrder: string | null = null; // To highlight newly added/updated order in table

  // Filter variables
  fromDate: string = '';
  toDate: string = '';
  selectedStatusFilter: string = ''; // For main table filter
  searchTerm: string = ''; // New search term property

  // Dashboard stats - Will be calculated from fetched data
  lastMonthOrders: number = 0;
  topSelling = {
    product: 'N/A',
    value: '₹0',
    growth: 0,
    lastMonthValue: '₹0'
  };
  lowStockItems: number = 0; // Placeholder until inventory data is pulled
  criticalItems: number = 0; // Placeholder
  warningItems: number = 0; // Placeholder
  pendingOrdersCount: number = 0;
  newTodayOrders: number = 0;
  pendingOrdersValue: string = '₹0 total value';

  newOrder: Partial<Order> = { // Used for the modal form (create/edit)
    orderDate: this.formatDateForInput(new Date()), // Format for input type="date"
    product_id: '', // Bind to product dropdown (ID as string)
    productName: '', // Display only for newOrder form
    productCode: '', // Display only for newOrder form
    quantity: 1, // Start with 1 instead of 0
    unit: 'Packets',
    value: 0,
    supplier_id: '', // Bind to supplier dropdown (ID as string)
    supplierName: '', // Display only for newOrder form
    supplierPhone: '', // Display only for newOrder form
    category: '', // New category field
    deliveryDate: this.formatDateForInput(new Date()),
    deliveryStatus: 'On time',
    status: 'Pending',
    adminNotes: '',
    supplierNotes: ''
  };

  orders: Order[] = []; // Main array of orders
  allProducts: Products[] = []; // To populate product dropdown
  allSuppliers: Supplier[] = []; // To populate supplier dropdown

  // Track currently selected product/supplier from dropdowns for new order modal
  selectedProductFromDropdown: Products | null = null;
  selectedSupplierFromDropdown: Supplier | null = null;

  // Pagination properties for table
  currentPage: number = 1;
  itemsPerPage: number = 5;


  constructor(
    private http: HttpClient,
    public authService: AuthService // Used for role-based UI in HTML (e.g., *ngIf="authService.getUserRole() === 'admin'")
  ) { }

  ngOnInit() {
    this.loadOrders(); // Load orders first
    this.loadProductsForDropdown(); // Load products for new order modal dropdown
    this.loadSuppliersForDropdown(); // Load suppliers for new order modal dropdown
  }

  /**
   * Fetches orders from the backend. Filters by supplier_id if current user is a 'supplier'.
   */
  loadOrders() {
    const userRole = this.authService.getUserRole();
    console.log('Loading orders for user role:', userRole); // Debug log
    
    this.http.get<Order[]>(`${environment.apiUrl}/orders`, { withCredentials: true }) // Backend will filter by user's role
      .subscribe({
        next: (data) => {
          console.log('Orders loaded successfully:', data); // Debug log
          console.log('Number of orders received:', data.length); // Debug log
          
          // Ensure value is number
          this.orders = data.map(order => ({
            ...order,
            // Convert value from string to number if it comes as string
            value: typeof order.value === 'string' ? parseFloat(order.value as string) : order.value
          }));
          
          console.log('Processed orders:', this.orders); // Debug log
          this.calculateDashboardStats(); // Recalculate dashboard stats based on new data
        },
        error: (err) => {
          console.error('Failed to load orders:', err);
          console.error('Error status:', err.status);
          console.error('Error message:', err.error?.message || err.message);
          
          // Show user-friendly error message
          if (err.status === 403) {
            alert('Access denied. You do not have permission to view orders.');
          } else if (err.status === 401) {
            alert('Please log in again to view orders.');
          } else {
            alert('Failed to load orders. Please try again.');
          }
          
          // Initialize empty orders array to prevent UI errors
          this.orders = [];
          this.calculateDashboardStats();
        }
      });
  }

  /**
   * Fetches all products from the backend for the product selection dropdown in the order modal.
   */
  loadProductsForDropdown() {
    // Uses '/product/all' to get all products (active/inactive) for order creation flexibility
    this.http.get<Products[]>(`${environment.apiUrl}/product/all`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.allProducts = data;
        },
        error: (err) => {
          console.error('Failed to load products for dropdown:', err);
          // this.showToast('Failed to load products for order creation.', 'error');
        }
      });
  }

  /**
   * Fetches all suppliers from the backend for the supplier selection dropdown in the order modal.
   */
  loadSuppliersForDropdown() {
    this.http.get<Supplier[]>(`${environment.apiUrl}/supplier`, { withCredentials: true }) // Assuming GET /supplier returns all suppliers
      .subscribe({
        next: (data) => {
          this.allSuppliers = data;
        },
        error: (err) => {
          console.error('Failed to load suppliers for dropdown:', err);
          // this.showToast('Failed to load suppliers for order creation.', 'error');
        }
      });
  }

  /**
   * Handles selection of a product from the dropdown in the new order modal.
   * Auto-fills product name, code, category, and suggests supplier info if available.
   * @param event The change event from the select element.
   */
  onProductSelect(event: Event) {
    const productId = (event.target as HTMLSelectElement).value; // Keep as string
    this.selectedProductFromDropdown = this.allProducts.find(p => p.id === productId) || null;
    
    console.log('Product selected:', productId, this.selectedProductFromDropdown); // Debug log
    
    if (this.selectedProductFromDropdown) {
      this.newOrder.product_id = this.selectedProductFromDropdown.id; // Use string ID
      this.newOrder.productName = this.selectedProductFromDropdown.name;
      this.newOrder.productCode = this.selectedProductFromDropdown.id; // Store product ID as string code
      this.newOrder.category = this.selectedProductFromDropdown.category; // Set category from product
      
      // Calculate value if quantity is already set
      if (this.newOrder.quantity && this.selectedProductFromDropdown.sellingPrice) {
          this.newOrder.value = this.newOrder.quantity * this.selectedProductFromDropdown.sellingPrice;
      } else if (this.selectedProductFromDropdown.sellingPrice) {
          // If no quantity set yet, set a default quantity of 1 to show a value
          this.newOrder.quantity = this.newOrder.quantity || 1;
          this.newOrder.value = this.newOrder.quantity * this.selectedProductFromDropdown.sellingPrice;
      } else {
          this.newOrder.value = 0; // Reset value if price is missing
      }

      // Optionally suggest supplier name from product data (user can still modify manually)
      if (this.selectedProductFromDropdown.supplier && !this.newOrder.supplierName) {
          console.log('Suggesting supplier from product:', this.selectedProductFromDropdown.supplier);
          this.newOrder.supplierName = this.selectedProductFromDropdown.supplier;
          
          // Try to find matching supplier contact if available
          const linkedSupplier = this.allSuppliers.find(s => 
            s.name && this.selectedProductFromDropdown?.supplier &&
            s.name.toLowerCase() === this.selectedProductFromDropdown.supplier.toLowerCase()
          );
          if (linkedSupplier && !this.newOrder.supplierPhone) {
              this.newOrder.supplierPhone = linkedSupplier.contact;
          }
      }
    } else {
      // Reset relevant fields if no product is selected
      this.newOrder.product_id = '';
      this.newOrder.productName = '';
      this.newOrder.productCode = '';
      this.newOrder.category = '';
      this.newOrder.value = 0;
    }
  }

  /**
   * Auto-calculates the order value when the quantity input changes.
   */
  onQuantityChange() {
      if (this.newOrder.quantity && this.selectedProductFromDropdown?.sellingPrice) {
          this.newOrder.value = this.newOrder.quantity * this.selectedProductFromDropdown.sellingPrice;
      } else if (this.newOrder.quantity && this.newOrder.quantity > 0) {
          // If no product selected but quantity is entered, keep value as is or set to 0
          this.newOrder.value = this.newOrder.value || 0;
      } else {
          this.newOrder.value = 0;
      }
  }

  /**
   * Applies filters (date range, status) to the orders list.
   * @returns The filtered and paginated list of orders.
   */
  get filteredOrders(): Order[] {
    let filtered = this.orders;

    // Filter by search term (names or words)
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order =>
        order.productName?.toLowerCase().includes(searchLower) ||
        order.supplierName?.toLowerCase().includes(searchLower) ||
        order.productCode?.toLowerCase().includes(searchLower) ||
        order.category?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower) ||
        order.order_id?.toString().includes(searchLower) ||
        order.deliveryStatus?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (this.fromDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const fromDate = new Date(this.fromDate);
        return orderDate >= fromDate;
      });
    }

    if (this.toDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const toDate = new Date(this.toDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of day for inclusive date range
        return orderDate <= toDate;
      });
    }

    // Filter by status
    if (this.selectedStatusFilter) {
      filtered = filtered.filter(order =>
        order.status.toLowerCase() === this.selectedStatusFilter.toLowerCase()
      );
    }

    // Pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  /**
   * Calculates the total number of pages for pagination.
   */
  get totalPages(): number {
    // Get filtered orders without pagination applied
    let filtered = this.orders;

    // Apply same filters as in filteredOrders getter (without pagination)
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order =>
        order.productName?.toLowerCase().includes(searchLower) ||
        order.supplierName?.toLowerCase().includes(searchLower) ||
        order.productCode?.toLowerCase().includes(searchLower) ||
        order.category?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower) ||
        order.order_id?.toString().includes(searchLower) ||
        order.deliveryStatus?.toLowerCase().includes(searchLower)
      );
    }

    if (this.fromDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const fromDate = new Date(this.fromDate);
        return orderDate >= fromDate;
      });
    }

    if (this.toDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const toDate = new Date(this.toDate);
        toDate.setHours(23, 59, 59, 999);
        return orderDate <= toDate;
      });
    }

    if (this.selectedStatusFilter) {
      filtered = filtered.filter(order =>
        order.status.toLowerCase() === this.selectedStatusFilter.toLowerCase()
      );
    }

    return Math.ceil(filtered.length / this.itemsPerPage);
  }

  // Handle search input changes
  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.calculateDashboardStats(); // Recalculate stats based on filtered data
  }

  // Clear search and reset filters
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.calculateDashboardStats(); // Recalculate stats when clearing search
  }

  /**
   * Calculates the starting index for current page display.
   */
  get showingFrom(): number {
      const totalFiltered = this.getTotalFilteredCount();
      return totalFiltered > 0 ? Math.min((this.currentPage - 1) * this.itemsPerPage + 1, totalFiltered) : 0;
  }
  /**
   * Calculates the ending index for current page display.
   */
  get showingTo(): number {
      const totalFiltered = this.getTotalFilteredCount();
      return Math.min(this.currentPage * this.itemsPerPage, totalFiltered);
  }
  /**
   * Gets the total number of orders currently displayed after filtering.
   */
  get totalOrdersDisplayed(): number {
      return this.getTotalFilteredCount();
  }

  /**
   * Helper method to get total filtered count without pagination
   */
  private getTotalFilteredCount(): number {
    let filtered = this.orders;

    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order =>
        order.productName?.toLowerCase().includes(searchLower) ||
        order.supplierName?.toLowerCase().includes(searchLower) ||
        order.productCode?.toLowerCase().includes(searchLower) ||
        order.category?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower) ||
        order.order_id?.toString().includes(searchLower) ||
        order.deliveryStatus?.toLowerCase().includes(searchLower)
      );
    }

    if (this.fromDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const fromDate = new Date(this.fromDate);
        return orderDate >= fromDate;
      });
    }

    if (this.toDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        const toDate = new Date(this.toDate);
        toDate.setHours(23, 59, 59, 999);
        return orderDate <= toDate;
      });
    }

    if (this.selectedStatusFilter) {
      filtered = filtered.filter(order =>
        order.status.toLowerCase() === this.selectedStatusFilter.toLowerCase()
      );
    }

    return filtered.length;
  }
  /**
   * Changes the current page for pagination.
   * @param page The page number to navigate to.
   */
  changePage(page: number): void {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
  }

  /**
   * Go to the next page.
   */
  nextPage(): void {
      if (this.currentPage < this.totalPages) {
          this.currentPage++;
      }
  }

  /**
   * Go to the previous page.
   */
  prevPage(): void {
      if (this.currentPage > 1) {
          this.currentPage--;
      }
  }

  /**
   * Formats a Date object into a YYYY-MM-DD string for HTML input type="date".
   * @param date The Date object to format.
   * @returns A YYYY-MM-DD string.
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculates various dashboard statistics (e.g., total orders, pending orders).
   */
  calculateDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthOrders = this.orders.filter(o => {
      const orderDate = new Date(o.orderDate);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const lastMonthOrdersArray = this.orders.filter(o => {
      const orderDate = new Date(o.orderDate);
      return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
    });

    this.lastMonthOrders = lastMonthOrdersArray.length;
    this.pendingOrdersCount = this.orders.filter(o => o.status === 'Pending').length;
    this.newTodayOrders = this.orders.filter(o => {
      const orderDate = new Date(o.orderDate);
      return orderDate.toDateString() === now.toDateString();
    }).length;

    const pendingOrdersValueNum = this.orders
      .filter(o => o.status === 'Pending')
      .reduce((sum, order) => sum + (typeof order.value === 'number' ? order.value : 0), 0);
    this.pendingOrdersValue = `₹${pendingOrdersValueNum.toFixed(2)} total value`;

    // Calculate top selling product (simplified)
    const productSales: { [key: string]: number } = {};
    this.orders.forEach(order => {
        productSales[order.productName] = (productSales[order.productName] || 0) + (typeof order.value === 'number' ? order.value : 0);
    });
    const topProduct = Object.entries(productSales).sort(([, a], [, b]) => (b as number) - (a as number))[0];
    if (topProduct) {
        this.topSelling.product = topProduct[0];
        this.topSelling.value = `₹${(topProduct[1] as number).toFixed(2)}`;
        this.topSelling.growth = 15.2; // Placeholder
        this.topSelling.lastMonthValue = '₹21,700'; // Placeholder
    } else {
        this.topSelling = { product: 'N/A', value: '₹0', growth: 0, lastMonthValue: '₹0' };
    }
  }

  /**
   * Calculates order growth percentage for the dashboard card.
   * @returns Growth percentage.
   */
  getOrderGrowth(): number {
    if (this.lastMonthOrders === 0) return this.orders.length > 0 ? 100 : 0; // If no last month orders, and current orders exist, 100% growth
    return Math.round(((this.orders.length - this.lastMonthOrders) / this.lastMonthOrders) * 100);
  }

  /**
   * Opens the invoice modal for a selected order.
   * @param order The order to display in the invoice.
   */
  showInvoice(order: Order) {
    this.currentOrder = order;
    this.isInvoiceVisible = true;
  }

  /**
   * Closes the invoice modal.
   */
  closeInvoice() {
    this.isInvoiceVisible = false;
  }

  /**
   * Triggers the browser's print functionality for the invoice modal content.
   */
  printInvoice() {
    // Hide action buttons and modal background for printing
    const printContent = this.getPrintableContent();
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore Angular bindings
  }

  /**
   * Downloads the invoice content as a PDF file with proper formatting.
   */
  async downloadInvoice() {
    try {
      // Get the invoice content element
      const invoiceElement = document.querySelector('.invoice-content') as HTMLElement;
      if (!invoiceElement) {
        alert('Invoice content not found. Please try again.');
        return;
      }

      // Create a temporary container with print styles
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = this.getPrintableContent();
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      document.body.appendChild(tempContainer);

      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20; // Account for margins

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`invoice_${this.currentOrder?.order_id || 'order'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Generates printable HTML content with proper styling.
   */
  private getPrintableContent(): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${this.currentOrder?.order_id || 'N/A'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
          }
          
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20px;
          }
          
          .company-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .company-logo {
            width: 60px;
            height: 60px;
            margin-right: 20px;
            border-radius: 8px;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          
          .company-info h1 {
            font-size: 28px;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .company-info p {
            color: #6b7280;
            font-size: 14px;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          .bill-to, .company-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .bill-to h3, .company-details h3 {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .bill-to p, .company-details p {
            margin-bottom: 5px;
            color: #4b5563;
          }
          
          .order-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          
          .info-item {
            text-align: center;
          }
          
          .info-item .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .info-item .value {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
          }
          
          .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .status-pending { background: #dbeafe; color: #1d4ed8; }
          .status-confirmed { background: #d1fae5; color: #065f46; }
          .status-shipped { background: #e0e7ff; color: #3730a3; }
          .status-delivered { background: #f3e8ff; color: #6b21a8; }
          .status-cancelled { background: #f3f4f6; color: #374151; }
          .status-delayed { background: #fee2e2; color: #dc2626; }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .items-table th {
            background: #2563eb;
            color: white;
            padding: 15px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          
          .items-table td {
            padding: 15px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          
          .items-table tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          
          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }
          
          .totals-table td {
            padding: 8px 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .totals-table .total-row {
            background: #f3f4f6;
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #2563eb;
          }
          
          .payment-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #10b981;
          }
          
          .payment-info h3 {
            color: #1f2937;
            margin-bottom: 15px;
            font-size: 16px;
          }
          
          .payment-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .payment-item .label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 3px;
          }
          
          .payment-item .value {
            font-weight: 600;
            color: #1f2937;
          }
          
          .notes-section {
            background: #fef7cd;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          }
          
          .notes-section h3 {
            color: #92400e;
            margin-bottom: 10px;
          }
          
          .notes-section p {
            color: #78350f;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
            }
            .invoice-container {
              padding: 0;
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Company Header -->
          <div class="company-header">
            <div class="company-logo">IMS</div>
            <div class="company-info">
              <h1>StockEasy</h1>
              <p>Inventory Management System</p>
              <p>123 Business Street, Bangalore, KA 560001, India</p>
              <p>Phone: +91 9876543210 | Email: info@stockeasy.com</p>
            </div>
          </div>

          <!-- Invoice Header -->
          <div class="invoice-header">
            <div>
              <div class="invoice-title">INVOICE</div>
              <p><strong>Invoice #:</strong> ${this.currentOrder?.order_id || 'N/A'}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Status:</strong> 
                <span class="status-badge status-${this.currentOrder?.status?.toLowerCase() || 'pending'}">
                  ${this.currentOrder?.status || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          <!-- Billing Details -->
          <div class="invoice-details">
            <div class="company-details">
              <h3>From</h3>
              <p><strong>StockEasy Pvt Ltd</strong></p>
              <p>123 Business Street</p>
              <p>Bangalore, KA 560001</p>
              <p>India</p>
              <p><strong>GSTIN:</strong> 22ABCDE1234F1Z5</p>
              <p><strong>Phone:</strong> +91 9876543210</p>
              <p><strong>Email:</strong> accounts@stockeasy.com</p>
            </div>
            
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>${this.currentOrder?.supplierName || 'N/A'}</strong></p>
              <p>${this.getSupplierAddress()}</p>
              <p>India</p>
              <p><strong>GSTIN:</strong> ${this.getSupplierGstin()}</p>
              <p><strong>Phone:</strong> ${this.currentOrder?.supplierPhone || 'N/A'}</p>
              <p><strong>Email:</strong> ${this.getSupplierEmail()}</p>
            </div>
          </div>

          <!-- Order Information -->
          <div class="order-info">
            <div class="info-item">
              <div class="label">Order Date</div>
              <div class="value">${this.currentOrder?.orderDate || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Delivery Date</div>
              <div class="value">${this.currentOrder?.deliveryDate || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Category</div>
              <div class="value">${this.currentOrder?.category || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Delivery Status</div>
              <div class="value">${this.currentOrder?.deliveryStatus || 'N/A'}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${this.currentOrder?.productCode || 'N/A'}</td>
                <td>
                  <strong>${this.currentOrder?.productName || 'N/A'}</strong><br>
                  <small>Category: ${this.currentOrder?.category || 'N/A'}</small>
                </td>
                <td>${this.currentOrder?.quantity || '0'} ${this.currentOrder?.unit || 'N/A'}</td>
                <td>${this.getUnitPrice()}</td>
                <td>₹${(this.currentOrder?.value || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>SHIP001</td>
                <td><strong>Shipping & Handling</strong></td>
                <td>1</td>
                <td>₹250.00</td>
                <td>₹250.00</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">${this.getSubtotal()}</td>
              </tr>
              <tr>
                <td>Shipping:</td>
                <td style="text-align: right;">₹250.00</td>
              </tr>
              <tr>
                <td>Tax (18%):</td>
                <td style="text-align: right;">${this.getTax()}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td style="text-align: right;">${this.getTotal()}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Information -->
          <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="payment-grid">
              <div class="payment-item">
                <div class="label">Payment Method</div>
                <div class="value">Bank Transfer</div>
              </div>
              <div class="payment-item">
                <div class="label">Account Number</div>
                <div class="value">1234567890</div>
              </div>
              <div class="payment-item">
                <div class="label">Bank Name</div>
                <div class="value">Business Bank</div>
              </div>
              <div class="payment-item">
                <div class="label">IFSC Code</div>
                <div class="value">BUSI0123456</div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="notes-section">
            <h3>Terms & Conditions</h3>
            <p>Thank you for your business. Please make payment within 15 days of receiving this invoice. For any questions regarding this invoice, please contact our accounts department at accounts@stockeasy.com or call +91 9876543210.</p>
            ${this.currentOrder?.adminNotes ? `<p><strong>Admin Notes:</strong> ${this.currentOrder.adminNotes}</p>` : ''}
            ${this.currentOrder?.supplierNotes ? `<p><strong>Supplier Notes:</strong> ${this.currentOrder.supplierNotes}</p>` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>Generated on ${currentDate} | StockEasy Inventory Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates the plain text content for the invoice.
   * @returns Formatted invoice text.
   */
  generateInvoiceContent(): string {
    let content = `Invoice #${this.currentOrder?.order_id || 'N/A'}\n`; // Use order_id
    content += `Date: ${this.currentOrder?.orderDate || 'N/A'}\n`;
    content += `Product: ${this.currentOrder?.productName || 'N/A'} (Code: ${this.currentOrder?.productCode || 'N/A'})\n`;
    content += `Category: ${this.currentOrder?.category || 'N/A'}\n`; // Include category
    content += `Quantity: ${this.currentOrder?.quantity || '0'} ${this.currentOrder?.unit || ''}\n`;
    content += `Value: ₹${(this.currentOrder?.value || 0).toFixed(2)}\n`; // Value changed to number
    content += `Supplier: ${this.currentOrder?.supplierName || 'N/A'}\n`; // Use supplierName
    content += `Supplier Phone: ${this.currentOrder?.supplierPhone || 'N/A'}\n`; // Use supplierPhone
    content += `Delivery Date: ${this.currentOrder?.deliveryDate || 'N/A'}\n`;
    content += `Status: ${this.currentOrder?.status || 'N/A'}\n`;
    content += `Delivery Status: ${this.currentOrder?.deliveryStatus || 'N/A'}\n`;
    content += `Admin Notes: ${this.currentOrder?.adminNotes || 'N/A'}\n`;
    content += `Supplier Notes: ${this.currentOrder?.supplierNotes || 'N/A'}\n`;
    return content;
  }

  /**
   * Opens the new order modal, clearing the form for a new entry.
   */
  openNewOrderModal() {
    this.isNewOrderModalVisible = true;
    this.currentOrder = null; // Clear current order if creating new
    // Reset form for new order
    this.newOrder = {
      orderDate: this.formatDateForInput(new Date()),
      product_id: '', // Reset to empty string
      productName: '',
      productCode: '',
      quantity: 1, // Start with quantity 1 instead of 0
      unit: 'Packets',
      value: 0, // Will be calculated when product is selected
      supplierName: '', // Reset supplier name
      supplierPhone: '', // Reset supplier phone
      category: '', // Reset category
      deliveryDate: this.formatDateForInput(new Date()),
      deliveryStatus: 'On time',
      status: 'Pending',
      adminNotes: '',
      supplierNotes: ''
    };
    this.selectedProductFromDropdown = null; // Clear dropdown selection
    this.selectedSupplierFromDropdown = null;
  }

  /**
   * Closes the new order modal.
   */
  closeNewOrderModal() {
    this.isNewOrderModalVisible = false;
  }

  /**
   * Submits the new order form (either creates a new order or updates an existing one).
   */
  submitNewOrder() {
    // Frontend validation: Check required fields manually
    if (!this.newOrder.product_id) {
        alert('Please select a product');
        return;
    }
    if (!this.newOrder.quantity || this.newOrder.quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    if (!this.newOrder.supplierName || this.newOrder.supplierName.trim() === '') {
        alert('Please enter supplier name');
        return;
    }
    if (!this.newOrder.supplierPhone || this.newOrder.supplierPhone.trim() === '') {
        alert('Please enter supplier phone number');
        return;
    }
    if (!this.newOrder.orderDate) {
        alert('Please select order date');
        return;
    }
    if (!this.newOrder.deliveryDate) {
        alert('Please select delivery date');
        return;
    }
    if (!this.newOrder.category) {
        alert('Category is required');
        return;
    }

    console.log('Submitting order with data:', this.newOrder); // Debug log

    // Payload matches your Postman example exactly
    const orderPayload = {
        product_id: this.newOrder.product_id,
        quantity: this.newOrder.quantity,
        unit: this.newOrder.unit || 'Packets',
        supplier_id: this.newOrder.supplier_id || '', // Include supplier_id (can be empty for manual entry)
        supplier: this.newOrder.supplierName?.trim(), // Manual supplier name
        supplier_phone: this.newOrder.supplierPhone?.trim(), // Manual supplier phone
        delivery_date: this.newOrder.deliveryDate,
        category: this.newOrder.category,
        admin_notes: this.newOrder.adminNotes || '',
        supplier_notes: this.newOrder.supplierNotes || ''
    };

    console.log('Order payload before validation:', orderPayload); // Debug log

    // Additional validation: Ensure all required fields are present and not empty
    const requiredFields = {
        'product_id': orderPayload.product_id, 
        'quantity': orderPayload.quantity,
        'unit': orderPayload.unit,
        'supplier': orderPayload.supplier,
        'delivery_date': orderPayload.delivery_date,
        'category': orderPayload.category
    };

    console.log('Required fields check:', requiredFields); // Debug log

    const missingFields = [];
    for (const [fieldName, fieldValue] of Object.entries(requiredFields)) {
        if (fieldName === 'quantity') {
            // Special handling for quantity - must be > 0
            if (!fieldValue || Number(fieldValue) <= 0) {
                missingFields.push(fieldName + ' (must be > 0)');
            }
        } else {
            // For other fields, check if empty or null
            if (!fieldValue || fieldValue === '') {
                missingFields.push(fieldName);
            }
        }
    }
    
    if (missingFields.length > 0) {
        console.error('Missing or empty required fields:', missingFields);
        alert(`Missing or empty required fields: ${missingFields.join(', ')}\n\nPlease fill all required fields before submitting.`);
        return;
    }

    console.log('Final order payload being sent:', orderPayload); // Debug log

    let requestObservable;
    let successMessage = '';
    let errorMessage = '';

    if (this.currentOrder?.order_id) { // If currentOrder.order_id exists, it's an edit operation (PUT)
      requestObservable = this.http.put(`${environment.apiUrl}/orders/${this.currentOrder.order_id}`, orderPayload, { withCredentials: true });
      successMessage = 'Order updated successfully!';
      errorMessage = 'Failed to update order.';
    } else { // Otherwise, it's a new order (POST)
      requestObservable = this.http.post(`${environment.apiUrl}/orders/add`, orderPayload, { withCredentials: true });
      successMessage = 'Order created successfully!';
      errorMessage = 'Failed to create order.';
    }

    requestObservable.subscribe({
      next: (response: any) => {
        console.log('Order creation response:', response); // Debug log
        if (response.message && response.message.includes('successfully')) {
          this.newOrderId = response.orderId || this.currentOrder?.order_id || ''; // Get new ID if created, or use existing
          this.showSuccessPopup = true;
          this.highlightedOrder = this.newOrderId;
          this.loadOrders(); // Refresh orders after successful operation
          this.closeNewOrderModal();
          alert(successMessage); // Show success message

          setTimeout(() => { // Hide success popup after 5 seconds
            this.showSuccessPopup = false;
            this.highlightedOrder = null;
          }, 5000);
        } else {
          console.error(errorMessage, response);
          alert(errorMessage + ': ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error(errorMessage, err);
        alert(errorMessage + ': ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  /**
   * Opens the order view modal for a selected order.
   * @param order The order to view.
   */
  viewOrder(order: Order) {
    this.currentOrder = order;
    this.isInvoiceVisible = true;
  }

  /**
   * Opens the new order modal and pre-fills it with data from an existing order for editing.
   * @param order The order to edit.
   */
  editOrder(order: Order) {
    this.currentOrder = order; // Store original order for ID reference
    // Create a copy for the form, converting dates to YYYY-MM-DD for input type="date"
    this.newOrder = {
        ...order,
        orderDate: this.formatDateForInput(new Date(order.orderDate)),
        deliveryDate: this.formatDateForInput(new Date(order.deliveryDate)),
        value: order.value // Value is already number
    };
    // Pre-select product and supplier dropdowns based on their IDs (strings)
    this.selectedProductFromDropdown = this.allProducts.find(p => p.id === this.newOrder.product_id) || null;
    this.selectedSupplierFromDropdown = this.allSuppliers.find(s => s.id === this.newOrder.supplier_id) || null;
    // Set display names and contacts for the form's disabled inputs from currentOrder
    this.newOrder.productName = order.productName;
    this.newOrder.productCode = order.productCode;
    this.newOrder.supplierName = order.supplierName;
    this.newOrder.supplierPhone = order.supplierPhone;

    this.isNewOrderModalVisible = true;
  }

  /**
   * Changes the status of an order (used for actions like Confirm, Ship, Cancel, Return).
   * @param order The order to update.
   * @param newStatus The new order status.
   * @param newDeliveryStatus Optional new delivery status.
   */
  changeOrderStatus(order: Order, newStatus: Order['status'], newDeliveryStatus?: Order['deliveryStatus']) {
    if (!order.order_id) return; // Ensure order has an ID

    // Confirm action if it's a critical status change
    if ((newStatus === 'Cancelled' || newStatus === 'Returned') && !confirm(`Are you sure you want to change status of order #${order.order_id} to ${newStatus}?`)) {
      return;
    }

    const updatePayload: Partial<Order> = { status: newStatus };
    if (newDeliveryStatus) {
        updatePayload.deliveryStatus = newDeliveryStatus;
    }
    // For supplier user, they can also update supplierNotes when they change status
    if (this.authService.getUserRole() === 'supplier' && this.newOrder.supplierNotes !== order.supplierNotes) {
        updatePayload.supplierNotes = this.newOrder.supplierNotes;
    }


    this.http.put(`${environment.apiUrl}/orders/${order.order_id}`, updatePayload, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message.includes('successfully')) {
            this.loadOrders(); // Refresh orders after successful update
            // Show success toast
          } else {
            // Show error toast
          }
        },
        error: (err) => {
          console.error('Order status update failed:', err);
          // Show error toast
        }
      });
  }

  /**
   * Exports filtered orders to a CSV file.
   */
  exportOrders() {
    const csvContent = this.convertToCSV(this.filteredOrders);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Converts an array of orders to CSV format.
   * @param orders The array of orders to convert.
   * @returns CSV string.
   */
  convertToCSV(orders: Order[]): string {
    const headers = ['Order ID', 'Product', 'Quantity', 'Unit', 'Value', 'Supplier', 'Order Date', 'Delivery Date', 'Status', 'Delivery Status', 'Admin Notes', 'Supplier Notes'];
    const rows = orders.map(order => [
      order.order_id,
      order.productName,
      order.quantity,
      order.unit,
      (typeof order.value === 'number' ? order.value.toFixed(2) : order.value),
      order.supplierName, // Use supplierName for CSV
      order.orderDate,
      order.deliveryDate,
      order.status,
      order.deliveryStatus,
      order.adminNotes || '',
      order.supplierNotes || ''
    ]);

    let csv = headers.map(h => `"${h}"`).join(',') + '\n'; // Quote headers
    rows.forEach(row => {
      csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n'; // Quote fields and escape inner quotes
    });

    return csv;
  }

  /**
   * Placeholder for fetching supplier address (requires supplier address in DB and backend).
   * @returns Dummy supplier address string.
   */
  getSupplierAddress(): string {
    // This will now try to find the address from loaded suppliers
    const supplier = this.allSuppliers.find(s => s.id === this.currentOrder?.supplier_id);
    // You might need to add address fields to your Supplier model and backend
    return supplier?.contact || 'N/A'; // Using contact as a placeholder for address or phone
  }

  /**
   * Placeholder for fetching supplier GSTIN (requires GSTIN in DB and backend).
   * @returns Dummy GSTIN string.
   */
  getSupplierGstin(): string {
    return 'N/A'; // Placeholder
  }

  /**
   * Placeholder for fetching supplier email (requires email in DB and backend).
   * @returns Dummy email string.
   */
  getSupplierEmail(): string {
    if (!this.currentOrder) return 'N/A';
    const supplier = this.allSuppliers.find(s => s.id === this.currentOrder?.supplier_id);
    return supplier?.email || 'N/A';
  }

  /**
   * Calculates the unit price for the current order.
   * @returns Formatted unit price string.
   */
  getUnitPrice(): string {
    if (!this.currentOrder || typeof this.currentOrder.value !== 'number' || this.currentOrder.quantity === 0) return '₹0.00';
    const unitPrice = this.currentOrder.value / this.currentOrder.quantity;
    return `₹${unitPrice.toFixed(2)}`;
  }

  /**
   * Gets the subtotal value for the current order.
   * @returns Formatted subtotal string.
   */
  getSubtotal(): string {
    if (!this.currentOrder || typeof this.currentOrder.value !== 'number') return '₹0.00';
    return `₹${this.currentOrder.value.toFixed(2)}`;
  }

  /**
   * Calculates the tax for the current order.
   * @returns Formatted tax string.
   */
  getTax(): string {
    if (!this.currentOrder || typeof this.currentOrder.value !== 'number') return '₹0.00';
    const tax = this.currentOrder.value * 0.18;
    return `₹${tax.toFixed(2)}`;
  }

  /**
   * Calculates the total value for the current order including shipping and tax.
   * @returns Formatted total string.
   */
  getTotal(): string {
    if (!this.currentOrder || typeof this.currentOrder.value !== 'number') return '₹0.00';
    const subtotal = this.currentOrder.value;
    const tax = subtotal * 0.18;
    const shipping = 250; // Fixed shipping cost
    const total = subtotal + tax + shipping;
    return `₹${total.toFixed(2)}`;
  }

  /**
   * Gets current date in a formatted string.
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Gets the CSS class for an order status badge.
   * @param status The order status string.
   * @returns CSS class string.
   */
  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
        case "pending": return "bg-blue-100 text-blue-800";
        case "confirmed": return "bg-green-100 text-green-800";
        case "shipped": return "bg-indigo-100 text-indigo-800";
        case "delivered": return "bg-purple-100 text-purple-800";
        case "delayed": return "bg-red-100 text-red-800 animate-pulse";
        case "cancelled": return "bg-gray-100 text-gray-800";
        case "returned": return "bg-orange-100 text-orange-800";
        default: return "bg-gray-100 text-gray-800";
    }
  }
}