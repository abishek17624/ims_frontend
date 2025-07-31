import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

interface Invoice {
  invoice_id: number;
  order_id: number;
  supplier_id: number;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  invoiceStatus: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Order Details
  product_id: number;
  productName: string;
  quantity: number;
  unit: string;
  orderValue: number;
  productCategory: string;
  orderDate: string;
  deliveryDate: string;
  deliveryStatus: string;
  orderStatus: string;
  
  // Supplier Details
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
}

interface Customer {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-report.component.html',
  styleUrls: ['./admin-report.component.css']
})
export class AdminReportComponent implements OnInit {
  // Real invoice data from backend
  invoiceData: Invoice[] = [];

  customers: Customer[] = [];

  // Filter variables
  fromDate: string = '';
  toDate: string = '';
  statusFilter: string = '';
  customerFilter: string = '';

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

  // Toast notification variables
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // Loading state
  isLoading: boolean = false;

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('AdminReportComponent - Constructor called');
    console.log('AdminReportComponent - Environment API URL:', environment.apiUrl);
  }

  ngOnInit(): void {
    console.log('AdminReportComponent - ngOnInit called');
    this.fetchInvoices();
  }

  // Fetch invoices from backend
  fetchInvoices(): void {
    console.log('AdminReportComponent - Fetching invoices from backend...');
    this.isLoading = true;

    this.http.get<Invoice[]>(`${environment.apiUrl}/invoice`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('AdminReportComponent - Raw invoice data received:', data);
          console.log('AdminReportComponent - Number of invoices received:', data?.length || 0);
          
          if (data && Array.isArray(data)) {
            this.invoiceData = data.map(invoice => ({
              ...invoice,
              // Ensure amounts are numbers
              amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount as string) : invoice.amount,
              orderValue: typeof invoice.orderValue === 'string' ? parseFloat(invoice.orderValue as string) : invoice.orderValue
            }));
            
            console.log('AdminReportComponent - Processed invoice data:', this.invoiceData);
            
            // Extract unique customers from invoices
            this.extractCustomers();
            
            this.updateStats();
            this.filterInvoices();
            
            if (this.invoiceData.length === 0) {
              this.showToast('No invoices found in the system.', 'info');
            } else {
              console.log(`AdminReportComponent - Loaded ${this.invoiceData.length} invoices successfully`);
              this.showToast(`Loaded ${this.invoiceData.length} invoices successfully!`, 'success');
            }
          } else {
            console.error('AdminReportComponent - Invalid response format:', data);
            this.showToast('Invalid response format from server.', 'error');
          }
        },
        error: (err) => {
          console.error('AdminReportComponent - Failed to fetch invoices:', err);
          console.error('AdminReportComponent - Error status:', err.status);
          console.error('AdminReportComponent - Error message:', err.message);
          console.error('AdminReportComponent - Error details:', err.error);
          
          let errorMessage = 'Failed to load invoices.';
          if (err.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (err.status === 403) {
            errorMessage = 'You are not authorized to view invoices.';
          } else if (err.status === 0) {
            errorMessage = 'Cannot connect to server. Please check if the backend is running.';
          } else if (err.error?.message) {
            errorMessage += ' Error: ' + err.error.message;
          }
          
          this.showToast(errorMessage, 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // Extract unique customers from invoice data
  extractCustomers(): void {
    const uniqueSuppliers = new Map<string, string>();
    
    this.invoiceData.forEach(invoice => {
      if (invoice.supplierName && !uniqueSuppliers.has(invoice.supplier_id.toString())) {
        uniqueSuppliers.set(invoice.supplier_id.toString(), invoice.supplierName);
      }
    });
    
    this.customers = Array.from(uniqueSuppliers.entries()).map(([id, name]) => ({
      id: id,
      name: name
    }));
    
    console.log('Extracted customers:', this.customers);
  }

  // Filter invoices based on selected filters
  filterInvoices(): void {
    this.filteredInvoices = this.invoiceData.filter(invoice => {
      // Filter by date range
      if (this.fromDate && invoice.invoiceDate < this.fromDate) return false;
      if (this.toDate && invoice.invoiceDate > this.toDate) return false;
      
      // Filter by status
      if (this.statusFilter && invoice.invoiceStatus !== this.statusFilter) return false;
      
      // Filter by customer
      if (this.customerFilter) {
        const customer = this.customers.find(c => c.id === this.customerFilter);
        if (customer && invoice.supplierName !== customer.name) return false;
      }
      
      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.showToast(`Filtered ${this.filteredInvoices.length} invoices`, 'info');
  }

  // Reset all filters
  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.customerFilter = '';
    
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

  // Update stats
  updateStats(): void {
    this.totalInvoices = this.invoiceData.length;
    this.paidInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'paid').length;
    this.pendingInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'pending').length;
    this.overdueInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'overdue').length;
    this.totalRevenue = this.invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
  }

  // View invoice details
  viewInvoice(invoiceNumber: string): void {
    this.selectedInvoice = this.invoiceData.find(inv => inv.invoice_id.toString() === invoiceNumber) || null;
  }

  // Close invoice modal
  closeInvoiceModal(): void {
    this.selectedInvoice = null;
  }

   // Print invoice with proper styling
  printInvoice(): void {
    const printContent = document.getElementById('invoiceToPrint')?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${this.selectedInvoice?.invoice_id || ''}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info { flex: 1; }
            .client-info { flex: 1; background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .invoice-details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .invoice-table th { background-color: #f2f2f2; }
            .totals { float: right; width: 300px; margin-top: 20px; }
            .payment-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 30px; }
            .notes { margin-top: 30px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .status-badge { padding: 3px 8px; border-radius: 10px; font-size: 12px; }
            .paid { background-color: #e6ffed; color: #22863a; }
            .pending { background-color: #fff5b1; color: #735c0f; }
            .overdue { background-color: #ffeef0; color: #cb2431; }
            .cancelled { background-color: #f6f8fa; color: #6a737d; }
            @page { size: auto; margin: 10mm; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('Popup blocker prevented opening print window. Please allow popups for this site.');
    }
  }

  // Download current invoice shown in modal
  downloadCurrentInvoice(): void {
    if (this.selectedInvoice) {
      this.downloadInvoice(this.selectedInvoice.invoice_id.toString());
    }
  }

  // Download invoice as PDF
  downloadInvoice(invoiceNumber: string): void {
    this.showToast(`Preparing invoice ${invoiceNumber} for download...`, 'info');
    // Simulate download preparation
    setTimeout(() => {
      this.showToast(`Invoice ${invoiceNumber} downloaded successfully`, 'success');
    }, 1500);
  }

  // Send payment reminder
  sendReminder(): void {
    if (this.selectedInvoice) {
      this.showToast(`Payment reminder sent for invoice ${this.selectedInvoice.invoice_id}`, 'success');
      this.closeInvoiceModal();
    }
  }

  // Get status text for display
  getStatusText(status: string): string {
    switch(status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  // Get client info for modal
  getClientInfo(customer: string): string {
    switch(customer) {
      case 'Supplier X':
        return `
          <p class="font-medium">Supplier X</p>
          <p class="text-gray-600">456 Supplier Avenue</p>
          <p class="text-gray-600">Mumbai, MH 400001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 33XYZWV9876G2H7</p>
          <p class="text-gray-600">Phone: 9876543210</p>
          <p class="text-gray-600">Email: contact@supplierx.com</p>
        `;
      case 'Supplier Y':
        return `
          <p class="font-medium">Supplier Y</p>
          <p class="text-gray-600">789 Vendor Road</p>
          <p class="text-gray-600">Delhi, DL 110001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 44PQRSM6543K9L8</p>
          <p class="text-gray-600">Phone: 9876543211</p>
          <p class="text-gray-600">Email: contact@suppliery.com</p>
        `;
      case 'Supplier Z':
        return `
          <p class="font-medium">Supplier Z</p>
          <p class="text-gray-600">321 Distributor Lane</p>
          <p class="text-gray-600">Chennai, TN 600001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 55TUVWX3210N7M6</p>
          <p class="text-gray-600">Phone: 9876543212</p>
          <p class="text-gray-600">Email: contact@supplierz.com</p>
        `;
      case 'Supplier A':
        return `
          <p class="font-medium">Supplier A</p>
          <p class="text-gray-600">654 Wholesale Street</p>
          <p class="text-gray-600">Hyderabad, TS 500001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 66LMNOP9876K5J4</p>
          <p class="text-gray-600">Phone: 9876543213</p>
          <p class="text-gray-600">Email: contact@suppliera.com</p>
        `;
      case 'Supplier B':
        return `
          <p class="font-medium">Supplier B</p>
          <p class="text-gray-600">987 Trade Boulevard</p>
          <p class="text-gray-600">Kolkata, WB 700001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 77QRSTU5432V1W0</p>
          <p class="text-gray-600">Phone: 9876543214</p>
          <p class="text-gray-600">Email: contact@supplierb.com</p>
        `;
      default:
        return '';
    }
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    
    // Clear previous timeout if exists
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    // Auto-hide after 3 seconds
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  // Hide toast notification
  hideToast(): void {
    this.toastMessage = '';
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
}