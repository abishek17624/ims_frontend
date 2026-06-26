import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Invoice } from '../../../models/invoice';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-supplier-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-invoice.component.html',
  styleUrl: './supplier-invoice.component.css'
})
export class SupplierInvoiceComponent implements OnInit {

  // Real invoice data from backend
  invoiceData: Invoice[] = [];

  // Current user
  currentUser: User | null = null;
  currentSupplierId: string | null = null;

  // Filter variables
  fromDate: string = '';
  toDate: string = '';
  statusFilter: string = '';
  searchTerm: string = ''; // New search term property

  // Pagination variables
  currentPage: number = 1;
  recordsPerPage: number = 5;
  filteredInvoices: Invoice[] = [];
  paginatedInvoices: Invoice[] = [];
  totalPages: number = 1;

  // Stats variables
  totalInvoices: number = 0;
  paidInvoices: number = 0;
  pendingInvoices: number = 0;
  overdueInvoices: number = 0;
  totalRevenue: number = 0;

  // Modal variables
  selectedInvoice: Invoice | null = null;

  // Debug properties
  debugInfo = {
    token: '',
    userId: '',
    userRole: '',
    apiUrl: environment.apiUrl
  };

  constructor(private http: HttpClient, private authService: AuthService) { 
    console.log('SupplierInvoiceComponent - Constructor called');
    console.log('SupplierInvoiceComponent - Environment API URL:', environment.apiUrl);
  }

  ngOnInit(): void {
    console.log('SupplierInvoiceComponent - ngOnInit called');
    
    // Update debug info
    this.updateDebugInfo();
    
    // Get current user and load invoices
    this.loadCurrentUser();
  }

  updateDebugInfo(): void {
    this.debugInfo = {
      token: this.authService.getToken() || 'No token',
      userId: this.currentUser?.id?.toString() || 'No user ID',
      userRole: this.currentUser?.role || 'No role',
      apiUrl: environment.apiUrl
    };
  }

  loadCurrentUser(): void {
    console.log('SupplierInvoiceComponent - Fetching current user...');
    
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('SupplierInvoiceComponent - User fetched:', user);
        this.currentUser = user;
        if (user && user.role === 'supplier') {
          this.currentSupplierId = String(user.id);
          this.updateDebugInfo();
          this.fetchInvoices();
          this.checkForConfirmedOrders();
        } else {
          this.showToast('You are not authorized to view supplier invoices.', 'error');
        }
      },
      error: (err) => {
        
        console.error('SupplierInvoiceComponent - Failed to fetch user:', err);
        this.showToast('Authentication failed. Please login again.', 'error');
      }
    });
  }

  // Method to check if there are confirmed orders without invoices
  checkForConfirmedOrders(): void {
    console.log('Checking for confirmed orders that might need invoices...');
    
    this.http.get<any[]>(`${environment.apiUrl}/orders`, { withCredentials: true })
      .subscribe({
        next: (orders) => {
          console.log('Orders for current supplier:', orders);
          const confirmedOrders = orders.filter(order => order.status === 'Confirmed');
          console.log('Confirmed orders:', confirmedOrders);
          
          if (confirmedOrders.length > 0) {
            console.log(`Found ${confirmedOrders.length} confirmed orders. These should have invoices generated.`);
            console.log('If no invoices are showing, there might be an issue with the auto-generation process.');
          }
        },
        error: (err) => {
          console.error('Failed to fetch orders for invoice check:', err);
        }
      });
  }

  // --- API Interaction ---

  fetchInvoices(): void {
    console.log('SupplierInvoiceComponent - fetchInvoices called for supplier ID:', this.currentSupplierId);
    console.log('SupplierInvoiceComponent - Making request to:', `${environment.apiUrl}/invoice`);
    console.log('SupplierInvoiceComponent - Current user:', this.currentUser);
    console.log('SupplierInvoiceComponent - Current user ID:', this.currentUser?.id);
    console.log('SupplierInvoiceComponent - Current user role:', this.currentUser?.role);
    
    // Check if token is available
    const token = this.authService.getToken();
    console.log('SupplierInvoiceComponent - Token available:', !!token);
    console.log('SupplierInvoiceComponent - Token value:', token ? 'Token exists' : 'No token');
    
    // Use withCredentials for cookie-based auth (consistent with orders component)
    this.http.get<Invoice[]>(`${environment.apiUrl}/invoice`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('SupplierInvoiceComponent - Raw invoice data received:', data);
          console.log('SupplierInvoiceComponent - Number of invoices received:', data?.length || 0);
          
          if (data && Array.isArray(data)) {
            this.invoiceData = data.map(invoice => ({
              ...invoice,
              // Ensure amounts are numbers
              amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount as string) : invoice.amount,
              orderValue: typeof invoice.orderValue === 'string' ? parseFloat(invoice.orderValue as string) : invoice.orderValue
            }));
            
            console.log('SupplierInvoiceComponent - Processed invoice data:', this.invoiceData);
            
            this.updateStats();
            this.filterInvoices(); // Apply filters and pagination after fetching
            
            if (this.invoiceData.length === 0) {
              console.log('SupplierInvoiceComponent - No invoices found - this might be because:');
              console.log('1. No orders have been confirmed by this supplier yet');
              console.log('2. Invoice auto-generation failed when orders were confirmed');
              console.log('3. Database connection issues or wrong supplier mapping');
              this.showToast('No invoices found for your supplier account. Invoices are automatically generated when you confirm orders.', 'info');
            } else {
              console.log(`SupplierInvoiceComponent - Loaded ${this.invoiceData.length} invoices successfully`);
              this.showToast(`Loaded ${this.invoiceData.length} invoices successfully!`, 'success');
            }
          } else {
            console.error('SupplierInvoiceComponent - Invalid response format:', data);
            this.showToast('Invalid response format from server.', 'error');
          }
        },
        error: (err) => {
          console.error('SupplierInvoiceComponent - Failed to fetch invoices:', err);
          console.error('SupplierInvoiceComponent - Error status:', err.status);
          console.error('SupplierInvoiceComponent - Error message:', err.message);
          console.error('SupplierInvoiceComponent - Error details:', err.error);
          
          let errorMessage = 'Failed to load invoices.';
          if (err.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (err.status === 403) {
            errorMessage = 'You are not authorized to view these invoices.';
          } else if (err.status === 0) {
            errorMessage = 'Cannot connect to server. Please check if the backend is running.';
          } else if (err.error?.message) {
            errorMessage += ' Error: ' + err.error.message;
          }
          
          this.showToast(errorMessage, 'error');
        }
      });
  }

  // --- Filtering & Pagination ---

  // Filter invoices based on selected filters
  filterInvoices(): void {
    this.filteredInvoices = this.invoiceData.filter(invoice => {
      // Filter by search term (names or words)
      if (this.searchTerm && this.searchTerm.trim()) {
        const searchLower = this.searchTerm.toLowerCase().trim();
        const matchesSearch = 
          invoice.invoice_id?.toString().toLowerCase().includes(searchLower) ||
          invoice.supplierName?.toLowerCase().includes(searchLower) ||
          invoice.productName?.toLowerCase().includes(searchLower) ||
          invoice.order_id?.toString().toLowerCase().includes(searchLower) ||
          invoice.invoiceStatus?.toLowerCase().includes(searchLower) ||
          invoice.productCategory?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filter by date range (using invoiceDate from backend)
      if (this.fromDate && invoice.invoiceDate < this.fromDate) return false;
      if (this.toDate && invoice.invoiceDate > this.toDate) return false;

      // Filter by status (using invoiceStatus from backend)
      if (this.statusFilter && invoice.invoiceStatus !== this.statusFilter) return false;

      // Note: Customer filter removed since supplier only sees their own invoices
      // Backend already filters by supplier_id, so no need for client-side supplier filtering

      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.showToast(`Filtered ${this.filteredInvoices.length} invoices`, 'info');
  }

  // Reset all filters
  resetFilters(): void {
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';

    this.filteredInvoices = [...this.invoiceData];
    this.currentPage = 1;
    this.updatePagination();
    this.showToast('Filters reset', 'success');
  }

  // Update pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredInvoices.length / this.recordsPerPage);
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = Math.min(startIndex + this.recordsPerPage, this.filteredInvoices.length);
    this.paginatedInvoices = this.filteredInvoices.slice(startIndex, endIndex);
  }

  // Get pages for pagination
  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Go to specific page
  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  // Handle search input changes
  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.filterInvoices(); // Apply filters immediately
  }

  // Clear search and reset filters
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.filterInvoices();
  }

  // Go to previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  // Go to next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // Get showing from number
  get showingFrom(): number {
    return (this.currentPage - 1) * this.recordsPerPage + 1;
  }

  // Get showing to number
  get showingTo(): number {
    return Math.min(this.currentPage * this.recordsPerPage, this.filteredInvoices.length);
  }

  // --- Stats & Actions ---

  // Update stats based on filtered (or all) invoices
  updateStats(): void {
    this.totalInvoices = this.invoiceData.length;
    this.paidInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'paid').length;
    this.pendingInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'pending').length;

    // Calculate overdue invoices based on current date
    const today = new Date();
    this.overdueInvoices = this.invoiceData.filter(inv =>
      inv.invoiceStatus === 'pending' && new Date(inv.dueDate) < today
    ).length;

    this.totalRevenue = this.invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
  }

  // View invoice details
  viewInvoice(invoiceId: number): void {
    this.selectedInvoice = this.invoiceData.find(inv => inv.invoice_id === invoiceId) || null;
  }

  // Close invoice modal
  closeInvoiceModal(): void {
    this.selectedInvoice = null;
  }

  // Print invoice
  printInvoice(): void {
    // Hide action buttons and modal background for printing
    const printContent = this.getPrintableInvoiceContent();
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore Angular bindings
  }

  // Download invoice as PDF with enhanced functionality
  async downloadInvoicePDF(): Promise<void> {
    if (!this.selectedInvoice) {
      this.showToast('No invoice selected for download', 'error');
      return;
    }

    try {
      this.showToast(`Preparing invoice ${this.selectedInvoice.invoice_id} for download...`, 'info');
      
      // Create a temporary container with print styles
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = this.getPrintableInvoiceContent();
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

      pdf.save(`invoice_${this.selectedInvoice.invoice_id}.pdf`);
      this.showToast(`Invoice ${this.selectedInvoice.invoice_id} downloaded successfully!`, 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.showToast('Failed to generate PDF. Please try again.', 'error');
    }
  }

  // Download invoice as Excel
  downloadInvoiceExcel(): void {
    if (!this.selectedInvoice) {
      this.showToast('No invoice selected for download', 'error');
      return;
    }

    const excelContent = this.generateExcelContent();
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${this.selectedInvoice.invoice_id}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.showToast(`Invoice ${this.selectedInvoice.invoice_id} Excel downloaded`, 'success');
  }

  // Email invoice
  emailInvoice(): void {
    if (!this.selectedInvoice) {
      this.showToast('No invoice selected for email', 'error');
      return;
    }

    // Create email content
    const subject = `Invoice #${this.selectedInvoice.invoice_id} from StockEasy`;
    const body = `Dear Customer,

Please find attached the invoice #${this.selectedInvoice.invoice_id} for your recent order.

Invoice Details:
- Invoice ID: ${this.selectedInvoice.invoice_id}
- Amount: ${this.formatCurrency(this.selectedInvoice.amount)}
- Status: ${this.selectedInvoice.invoiceStatus}
- Due Date: ${this.formatDate(this.selectedInvoice.dueDate)}

Thank you for your business!

Best regards,
StockEasy Team`;

    // Open email client
    const mailtoLink = `mailto:${this.selectedInvoice.supplierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
    
    this.showToast('Email client opened with invoice details', 'info');
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
   * Generates printable HTML content for invoice with professional styling.
   */
  private getPrintableInvoiceContent(): string {
    if (!this.selectedInvoice) return '';
    
    const currentDate = this.getCurrentDate();
    const taxAmount = this.selectedInvoice.amount - this.selectedInvoice.orderValue;
    const unitPrice = this.selectedInvoice.orderValue / (this.selectedInvoice.quantity || 1);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${this.selectedInvoice.invoice_id}</title>
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
          
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #dbeafe; color: #1d4ed8; }
          .status-overdue { background: #fee2e2; color: #dc2626; }
          .status-cancelled { background: #f3f4f6; color: #374151; }
          
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
              <p>Phone: +91 9876543210 | Email: info&#64;stockeasy.com</p>
            </div>
          </div>

          <!-- Invoice Header -->
          <div class="invoice-header">
            <div>
              <div class="invoice-title">INVOICE</div>
              <p><strong>Invoice #:</strong> ${this.selectedInvoice.invoice_id}</p>
              <p><strong>Order #:</strong> ${this.selectedInvoice.order_id}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Status:</strong> 
                <span class="status-badge status-${this.selectedInvoice.invoiceStatus?.toLowerCase() || 'pending'}">
                  ${this.getStatusText(this.selectedInvoice.invoiceStatus)}
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
              <p><strong>Email:</strong> accounts&#64;stockeasy.com</p>
            </div>
            
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>${this.selectedInvoice.supplierName || 'N/A'}</strong></p>
              <p>Supplier ID: ${this.selectedInvoice.supplier_id}</p>
              <p>India</p>
              <p><strong>Phone:</strong> ${this.selectedInvoice.supplierPhone || 'N/A'}</p>
              <p><strong>Email:</strong> ${this.selectedInvoice.supplierEmail || 'N/A'}</p>
            </div>
          </div>

          <!-- Order Information -->
          <div class="order-info">
            <div class="info-item">
              <div class="label">Invoice Date</div>
              <div class="value">${this.formatDate(this.selectedInvoice.invoiceDate)}</div>
            </div>
            <div class="info-item">
              <div class="label">Due Date</div>
              <div class="value">${this.formatDate(this.selectedInvoice.dueDate)}</div>
            </div>
            <div class="info-item">
              <div class="label">Category</div>
              <div class="value">${this.selectedInvoice.productCategory || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Payment Status</div>
              <div class="value">${this.getStatusText(this.selectedInvoice.invoiceStatus)}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PRD-${(this.selectedInvoice.product_id || 1).toString().padStart(3, '0')}</td>
                <td>
                  <strong>${this.selectedInvoice.productName || 'N/A'}</strong><br>
                  <small>Category: ${this.selectedInvoice.productCategory || 'N/A'}</small>
                </td>
                <td>${this.selectedInvoice.quantity || '0'} ${this.selectedInvoice.unit || 'Units'}</td>
                <td>₹${unitPrice.toFixed(2)}</td>
                <td>₹${(this.selectedInvoice.orderValue || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Order Value:</td>
                <td style="text-align: right;">₹${(this.selectedInvoice.orderValue || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax (18%):</td>
                <td style="text-align: right;">₹${taxAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount:</td>
                <td style="text-align: right;">₹${this.selectedInvoice.amount.toFixed(2)}</td>
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
            <p>Thank you for your business. Please make payment within 15 days of receiving this invoice. For any questions regarding this invoice, please contact our accounts department at accounts&#64;stockeasy.com or call +91 9876543210.</p>
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

  // Generate PDF content (simplified version)
  private generatePDFContent(): string {
    if (!this.selectedInvoice) return '';
    
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(INVOICE #${this.selectedInvoice.invoice_id}) Tj
0 -20 Td
(Amount: ${this.formatCurrency(this.selectedInvoice.amount)}) Tj
0 -20 Td
(Status: ${this.selectedInvoice.invoiceStatus}) Tj
0 -20 Td
(Date: ${this.formatDate(this.selectedInvoice.invoiceDate)}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000525 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
625
%%EOF`;
  }

  // Generate Excel content
  private generateExcelContent(): string {
    if (!this.selectedInvoice) return '';
    
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
</head>
<body>
<table>
<tr><td><strong>INVOICE</strong></td></tr>
<tr><td></td></tr>
<tr><td>Invoice ID:</td><td>${this.selectedInvoice.invoice_id}</td></tr>
<tr><td>Date:</td><td>${this.formatDate(this.selectedInvoice.invoiceDate)}</td></tr>
<tr><td>Due Date:</td><td>${this.formatDate(this.selectedInvoice.dueDate)}</td></tr>
<tr><td>Status:</td><td>${this.selectedInvoice.invoiceStatus}</td></tr>
<tr><td>Amount:</td><td>${this.selectedInvoice.amount}</td></tr>
<tr><td>Supplier:</td><td>${this.selectedInvoice.supplierName}</td></tr>
<tr><td>Product:</td><td>${this.selectedInvoice.productName}</td></tr>
<tr><td>Quantity:</td><td>${this.selectedInvoice.quantity}</td></tr>
</table>
</body>
</html>`;
  }

  // Quick action methods for table buttons
  quickPrintInvoice(invoice: Invoice): void {
    const previousSelection = this.selectedInvoice;
    this.selectedInvoice = invoice;
    this.printInvoice();
    this.selectedInvoice = previousSelection;
  }

  quickDownloadPDF(invoice: Invoice): void {
    const previousSelection = this.selectedInvoice;
    this.selectedInvoice = invoice;
    this.downloadInvoicePDF();
    this.selectedInvoice = previousSelection;
  }

  quickDownloadExcel(invoice: Invoice): void {
    const previousSelection = this.selectedInvoice;
    this.selectedInvoice = invoice;
    this.downloadInvoiceExcel();
    this.selectedInvoice = previousSelection;
  }

  quickEmailInvoice(invoice: Invoice): void {
    const previousSelection = this.selectedInvoice;
    this.selectedInvoice = invoice;
    this.emailInvoice();
    this.selectedInvoice = previousSelection;
  }

  // Download current invoice shown in modal (Legacy method - keeping for compatibility)
  downloadCurrentInvoice(): void {
    if (this.selectedInvoice) {
      this.downloadInvoicePDF();
    } else {
      this.showToast('No invoice selected for download', 'error');
    }
  }

  // Download invoice as PDF (Legacy method - updated to use new functionality)
  downloadInvoice(invoiceId: string): void {
    const invoice = this.invoiceData.find(inv => inv.invoice_id.toString() === invoiceId);
    if (invoice) {
      const previousSelection = this.selectedInvoice;
      this.selectedInvoice = invoice;
      this.downloadInvoicePDF();
      this.selectedInvoice = previousSelection;
    } else {
      this.showToast(`Invoice ${invoiceId} not found`, 'error');
    }
  }

  // Mark invoice as paid
  markAsPaid(): void {
    if (this.selectedInvoice) {
      const invoiceIdToUpdate = this.selectedInvoice.invoice_id.toString();
      
      console.log('=== MARK AS PAID ===');
      console.log('Invoice ID to update:', invoiceIdToUpdate);
      console.log('Current user:', this.currentUser);
      console.log('Selected invoice:', this.selectedInvoice);
      console.log('Making PUT request to:', `${environment.apiUrl}/invoice/${invoiceIdToUpdate}`);

      // Make a PUT request to update the invoice status (using withCredentials)
      this.http.put(`${environment.apiUrl}/invoice/${invoiceIdToUpdate}`, 
        { status: 'paid' }, 
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          },
          observe: 'response'
        })
        .subscribe({
          next: (response) => {
            console.log('Mark as paid - Success response:', response);
            console.log('Response status:', response.status);
            console.log('Response body:', response.body);
            
            this.showToast(`Invoice ${invoiceIdToUpdate} marked as paid successfully!`, 'success');
            // Refresh the invoices after successful update
            this.fetchInvoices();
            this.closeInvoiceModal();
          },
          error: (err) => {
            console.error('Mark as paid - Error:', err);
            console.error('Error status:', err.status);
            console.error('Error message:', err.message);
            console.error('Error details:', err.error);
            
            let errorMessage = 'Failed to update invoice status.';
            if (err.status === 401) {
              errorMessage = 'Authentication failed. Please login again.';
            } else if (err.status === 403) {
              errorMessage = 'You are not authorized to update this invoice.';
            } else if (err.status === 404) {
              errorMessage = 'Invoice not found.';
            } else if (err.status === 0) {
              errorMessage = 'Cannot connect to server. Please check if the backend is running.';
            } else if (err.error?.message) {
              errorMessage = err.error.message;
            }
            
            if (err.error?.debug) {
              console.log('Debug info from server:', err.error.debug);
            }
            
            this.showToast(`${errorMessage} Please try again.`, 'error');
          }
        });
    } else {
      this.showToast('No invoice selected to mark as paid.', 'error');
    }
  }

  // Send payment reminder
  sendReminder(): void {
    if (this.selectedInvoice) {
      // In a real application, this would call a backend endpoint to send a reminder
      this.showToast(`Reminder sent for invoice ${this.selectedInvoice.invoice_id}`, 'success');
    }
  }

  // Get status text for display
  getStatusText(status: string): string {
    switch (status?.toLowerCase() || 'pending') {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  }

  // Get client info for modal using fetched data
  getClientInfo(invoice: Invoice): string {
    if (!invoice) return '';
    return `
      <p class="font-medium">${invoice.supplierName || 'Unknown Supplier'}</p>
      <p class="text-gray-600">Supplier ID: ${invoice.supplier_id}</p>
      <p class="text-gray-600">Phone: ${invoice.supplierPhone || 'N/A'}</p>
      <p class="text-gray-600">Email: ${invoice.supplierEmail || 'N/A'}</p>
    `;
  }

  // Show toast notification with better UI
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `download-progress ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
    
    // Also show browser alert as fallback
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  // Bulk download all invoices as ZIP
  downloadAllInvoicesZip(): void {
    if (this.invoiceData.length === 0) {
      this.showToast('No invoices available for download', 'error');
      return;
    }

    this.showToast('Preparing bulk download...', 'info');
    
    // Create a simple text file with all invoice data
    let csvContent = 'Invoice ID,Supplier,Order ID,Date,Due Date,Amount,Status,Product,Quantity\n';
    
    this.invoiceData.forEach(invoice => {
      csvContent += `${invoice.invoice_id},${invoice.supplierName || 'N/A'},${invoice.order_id},${this.formatDate(invoice.invoiceDate)},${this.formatDate(invoice.dueDate)},${invoice.amount},${invoice.invoiceStatus},${invoice.productName || 'N/A'},${invoice.quantity || 'N/A'}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.showToast(`Downloaded ${this.invoiceData.length} invoices as CSV`, 'success');
  }

  // Debug helper method
  getApiUrl(): string {
    return environment.apiUrl;
  }

  // Test method to check current user and API connectivity
  testUserAndApi(): void {
    console.log('=== TESTING USER AND API ===');
    console.log('Current user:', this.currentUser);
    console.log('Auth token:', this.authService.getToken());
    
    // Test the me endpoint to see what user we get
    this.http.get(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          console.log('Auth/me response:', user);
          this.showToast(`Current user: ID=${(user as any)?.id}, Role=${(user as any)?.role}, Email=${(user as any)?.email}`, 'info');
        },
        error: (err) => {
          console.error('Auth/me failed:', err);
          this.showToast('Authentication check failed. Please login again.', 'error');
        }
      });
    
    // Test the invoice API with additional headers
    console.log('Testing invoice API...');
    this.http.get(`${environment.apiUrl}/invoice`, { 
      withCredentials: true,
      observe: 'response' // Get full response including headers
    }).subscribe({
      next: (response) => {
        console.log('Invoice API - Full response:', response);
        console.log('Invoice API - Status:', response.status);
        console.log('Invoice API - Data:', response.body);
        this.showToast(`Invoice API test: ${response.status} - ${Array.isArray(response.body) ? response.body.length : 0} invoices`, 'info');
      },
      error: (err) => {
        console.error('Invoice API test failed:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error details:', err.error);
        this.showToast(`Invoice API test failed: ${err.status} - ${err.message}`, 'error');
      }
    });
  }

  // Test the mark as paid functionality
  testMarkAsPaidEndpoint(): void {
    if (!this.selectedInvoice) {
      this.showToast('Please select an invoice first to test mark as paid', 'error');
      return;
    }

    const invoiceId = this.selectedInvoice.invoice_id.toString();
    console.log('=== TESTING MARK AS PAID ENDPOINT ===');
    console.log('Testing invoice ID:', invoiceId);
    console.log('Current status:', this.selectedInvoice.invoiceStatus);

    // Test the PUT endpoint
    this.http.put(`${environment.apiUrl}/invoice/${invoiceId}`, 
      { status: 'paid' }, 
      { 
        withCredentials: true,
        observe: 'response'
      })
      .subscribe({
        next: (response) => {
          console.log('Test PUT response:', response);
          this.showToast(`PUT endpoint test successful! Status: ${response.status}`, 'success');
        },
        error: (err) => {
          console.error('Test PUT failed:', err);
          this.showToast(`PUT endpoint test failed: ${err.status} - ${err.error?.message || err.message}`, 'error');
        }
      });
  }

  // Alternative method to fetch invoices with better error handling
  fetchInvoicesWithFallback(): void {
    console.log('=== FETCH INVOICES WITH FALLBACK ===');
    
    // First, verify user authentication
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('User verified:', user);
        if (user && user.role === 'supplier') {
          this.currentUser = user;
          this.currentSupplierId = String(user.id);
          this.updateDebugInfo();
          
          // Now try to fetch invoices
          this.http.get<Invoice[]>(`${environment.apiUrl}/invoice`, { withCredentials: true })
            .subscribe({
              next: (data) => {
                console.log('Invoices fetched successfully:', data);
                this.handleInvoiceData(data);
              },
              error: (err) => {
                console.error('Invoice fetch failed:', err);
                this.handleInvoiceError(err);
                
                // Try alternative approach - fetch all invoices for admin and filter client-side
                if (err.status === 403 || err.status === 401) {
                  console.log('Trying to fetch invoices with admin privileges...');
                  this.tryAdminFallback();
                }
              }
            });
        } else {
          this.showToast('You are not authorized as a supplier', 'error');
        }
      },
      error: (err) => {
        console.error('User verification failed:', err);
        this.showToast('Please login again', 'error');
      }
    });
  }

  private handleInvoiceData(data: Invoice[]): void {
    if (data && Array.isArray(data)) {
      this.invoiceData = data.map(invoice => ({
        ...invoice,
        amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount as string) : invoice.amount,
        orderValue: typeof invoice.orderValue === 'string' ? parseFloat(invoice.orderValue as string) : invoice.orderValue
      }));
      
      console.log('Processed invoice data:', this.invoiceData);
      this.updateStats();
      this.filterInvoices();
      
      if (this.invoiceData.length === 0) {
        this.showToast('No invoices found. This might be because no orders have been confirmed yet.', 'info');
      } else {
        this.showToast(`Loaded ${this.invoiceData.length} invoices successfully!`, 'success');
      }
    } else {
      this.showToast('Invalid response format from server.', 'error');
    }
  }

  private handleInvoiceError(err: any): void {
    let errorMessage = 'Failed to load invoices.';
    if (err.status === 401) {
      errorMessage = 'Authentication failed. Please login again.';
    } else if (err.status === 403) {
      errorMessage = 'You are not authorized to view these invoices.';
    } else if (err.status === 0) {
      errorMessage = 'Cannot connect to server. Please check if the backend is running on port 5000.';
    } else if (err.error?.message) {
      errorMessage += ' Error: ' + err.error.message;
    }
    
    this.showToast(errorMessage, 'error');
  }

  private tryAdminFallback(): void {
    console.log('Attempting admin fallback...');
    // This is a temporary debugging measure
    this.showToast('Checking database directly for invoices...', 'info');
  }

  // Refresh invoices manually
  refreshInvoices(): void {
    this.updateDebugInfo();
    this.fetchInvoices();
    this.showToast('Invoices refreshed', 'success');
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  }

  // Get overdue days
  getOverdueDays(dueDate: string): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  // Get status badge class for styling
  getStatusClass(status: string): string {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Check if invoice is overdue
  isOverdue(invoice: Invoice): boolean {
    if (!invoice.dueDate || invoice.invoiceStatus === 'paid') return false;
    return new Date(invoice.dueDate) < new Date();
  }
}