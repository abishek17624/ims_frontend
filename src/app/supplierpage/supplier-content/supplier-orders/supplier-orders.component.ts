// components/supplier-orders/supplier-orders.component.ts
import { Component, OnInit } from '@angular/core'; //
import { CommonModule } from '@angular/common'; //
import { FormsModule } from '@angular/forms'; //
import { HttpClient } from '@angular/common/http'; //
import { Order } from '../../../models/order'; //
import { environment } from '../../../../environments/environment'; // <--- NEW: Import environment
import { AuthService } from '../../../services/auth.service'; // <--- NEW: Import AuthService
import { User } from '../../../models/user'; // <--- NEW: Import User for currentUser


@Component({
  selector: 'app-supplier-orders',
  standalone: true,
  imports: [CommonModule, FormsModule], // Removed HttpClientModule as it's provided globally
  templateUrl: './supplier-orders.component.html', //
  styleUrls: ['./supplier-orders.component.css']
})
export class SupplierOrdersComponent implements OnInit {
  allOrders: Order[] = []; //
  filteredOrders: Order[] = []; //
  currentPage = 1; //
  rowsPerPage = 5; //
  fromDate: string = ''; //
  toDate: string = ''; //
  statusFilter: string = ''; //

  // Modal properties
  showEditModal = false; //
  showViewModal = false; //
  editProduct: string = ''; //
  editOrderId: string = ''; //
  editDate: string = ''; //
  editNotes: string = ''; //
  selectedOrder: Order | null = null; //

  // Toast properties
  showToast = false; //
  toastMessage = ''; //
  toastType = 'info'; //
  toastTimeout: any; //

  // Current supplier ID (dynamically from auth service)
  currentSupplierId: string | null = null;
  currentUser: User | null = null;
  newTodayOrders: any;
  
  // Debug properties
  debugInfo = {
    token: '',
    userId: '',
    userRole: '',
    apiUrl: environment.apiUrl
  };

  constructor(
    private http: HttpClient, // <--- Inject HttpClient
    private authService: AuthService // <--- Inject AuthService
  ) {
    console.log('SupplierOrdersComponent - Constructor called');
    console.log('SupplierOrdersComponent - Environment API URL:', environment.apiUrl);
  }

  ngOnInit(): void { //
    console.log('SupplierOrdersComponent - ngOnInit called');
    
    // Update debug info
    this.updateDebugInfo();
    
    // First, try to get current user without triggering logout
    console.log('SupplierOrdersComponent - Fetching current user...');
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('SupplierOrdersComponent - User fetched:', user);
        this.currentUser = user;
        if (user && user.role === 'supplier') {
          this.currentSupplierId = String(user.id);
          this.updateDebugInfo();
          this.loadOrders();
        } else {
          this.showToastMessage('You are not authorized to view supplier orders. Please login as a supplier.', 'error');
        }
      },
      error: (err) => {
        console.error('SupplierOrdersComponent - Failed to fetch user:', err);
        // Don't show auth failed message immediately, try to get from local storage first
        const token = this.authService.getToken();
        if (!token) {
          this.showToastMessage('Please login to view supplier orders.', 'error');
        } else {
          this.showToastMessage('Session expired. Please login again.', 'error');
        }
      }
    });

    // Also subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role === 'supplier' && !this.allOrders.length) {
        console.log('SupplierOrdersComponent - User available from subscription:', user);
        this.currentUser = user;
        this.currentSupplierId = String(user.id);
        this.updateDebugInfo();
        this.loadOrders();
      }
    });
  }

  updateDebugInfo(): void {
    this.debugInfo = {
      token: this.authService.getToken() || 'No token',
      userId: this.currentUser?.id?.toString() || 'No user ID',
      userRole: this.currentUser?.role || 'No role',
      apiUrl: environment.apiUrl
    };
  }

  loadOrders(): void { //
    console.log('SupplierOrdersComponent - loadOrders called for supplier ID:', this.currentSupplierId);
    console.log('SupplierOrdersComponent - Making request to:', `${environment.apiUrl}/orders`);
    
    // Check if token is available
    const token = this.authService.getToken();
    console.log('SupplierOrdersComponent - Token available:', !!token);
    
    // Fetch orders for the logged-in supplier from backend
    // The backend will automatically filter orders based on user_id matching supplier.user_id
    this.http.get<Order[]>(`${environment.apiUrl}/orders`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('SupplierOrdersComponent - Received orders response:', data);
          console.log('SupplierOrdersComponent - Orders count:', data?.length || 0);
          
          if (data && Array.isArray(data)) {
            // Ensure dates are parsed and value is number
            this.allOrders = data.map(order => ({
              ...order,
              orderDate: order.orderDate, // Already YYYY-MM-DD from backend
              deliveryDate: order.deliveryDate, // Already YYYY-MM-DD from backend
              value: typeof order.value === 'string' ? parseFloat((order.value as string).replace(/[^0-9.-]+/g,"")) : order.value // Ensure value is number
            }));
            
            // Check for overdue orders automatically
            this.checkAndUpdateOverdueOrders();
            
            this.filterOrders(); // Apply initial filters
            console.log(`SupplierOrdersComponent - Loaded ${this.allOrders.length} orders for supplier`);
            
            if (this.allOrders.length === 0) {
              this.showToastMessage('No orders found for your supplier account.', 'info');
            }
          } else {
            console.error('SupplierOrdersComponent - Invalid response format:', data);
            this.showToastMessage('Invalid response format from server.', 'error');
          }
        },
        error: (err) => {
          console.error('SupplierOrdersComponent - Failed to load orders:', err);
          console.error('SupplierOrdersComponent - Error status:', err.status);
          console.error('SupplierOrdersComponent - Error message:', err.message);
          console.error('SupplierOrdersComponent - Error details:', err.error);
          
          let errorMessage = 'Failed to load your orders.';
          if (err.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (err.status === 403) {
            errorMessage = 'You are not authorized to view these orders.';
          } else if (err.status === 0) {
            errorMessage = 'Cannot connect to server. Please check if the backend is running.';
          } else if (err.error?.message) {
            errorMessage += ' Error: ' + err.error.message;
          }
          
          this.showToastMessage(errorMessage, 'error');
        }
      });
  }

  get paginatedOrders(): Order[] { //
    const startIndex = (this.currentPage - 1) * this.rowsPerPage; //
    const endIndex = startIndex + this.rowsPerPage; //
    return this.filteredOrders.slice(startIndex, endIndex); //
  }

  get totalPages(): number { //
    return Math.ceil(this.filteredOrders.length / this.rowsPerPage); //
  }

  get showingFrom(): number { //
    return (this.currentPage - 1) * this.rowsPerPage + 1; //
  }

  get showingTo(): number { //
    return Math.min(this.currentPage * this.rowsPerPage, this.filteredOrders.length); //
  }

  get totalOrders(): number { //
    return this.filteredOrders.length; //
  }

  get acceptedCount(): number { //
    return this.filteredOrders.filter(order =>
      order.status === 'Confirmed' || order.status === 'Shipped' || order.status === 'Delivered'
    ).length; //
  }

  get pendingCount(): number { //
    return this.filteredOrders.filter(order => order.status === 'Pending').length; //
  }

  changePage(page: number): void { //
    if (page < 1 || page > this.totalPages) return; //
    this.currentPage = page; //
  }

  // Accept Order - Supplier action
  acceptOrder(orderId: string): void { //
    // Find the order to check if it's overdue
    const order = this.allOrders.find(o => o.order_id === orderId);
    if (!order) {
      this.showToastMessage('Order not found.', 'error');
      return;
    }

    // Update the order status immediately in the UI for better user experience
    const originalStatus = order.status;
    order.status = 'Confirmed';
    
    // Update filtered orders as well
    const filteredOrder = this.filteredOrders.find(o => o.order_id === orderId);
    if (filteredOrder) {
      filteredOrder.status = 'Confirmed';
    }

    const deliveryStatus = this.getDeliveryStatusBasedOnDate(order);
    
    // Prepare the update payload
    const updatePayload: any = { 
      status: 'Confirmed', 
      supplier_notes: 'Order accepted by supplier' 
    };
    
    // If order is overdue, update delivery status as well
    if (deliveryStatus === 'Overdue') {
      updatePayload.delivery_status = 'Overdue';
      order.deliveryStatus = 'Overdue';
      if (filteredOrder) {
        filteredOrder.deliveryStatus = 'Overdue';
      }
      console.log(`Order ${orderId} is overdue, updating delivery status`);
    }

    this.http.put(`${environment.apiUrl}/orders/${orderId}`, updatePayload, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message.includes('successfully')) {
            // Status already updated in UI, just show success message
            const statusMessage = deliveryStatus === 'Overdue' 
              ? 'Order accepted (marked as overdue due to past delivery date)' 
              : 'Order accepted successfully';
            this.showToastMessage(statusMessage, deliveryStatus === 'Overdue' ? 'warning' : 'success');
            
            // Optionally reload to sync with server
            // this.loadOrders();
          } else {
            // Revert the status change if server update failed
            order.status = originalStatus;
            if (filteredOrder) {
              filteredOrder.status = originalStatus;
            }
            this.showToastMessage(response.message || 'Failed to accept order.', 'error');
          }
        },
        error: (err) => {
          // Revert the status change if server update failed
          order.status = originalStatus;
          if (filteredOrder) {
            filteredOrder.status = originalStatus;
          }
          console.error('Accept order failed:', err);
          this.showToastMessage('Failed to accept order.', 'error');
        }
      });
  }

  // Ship Order - Supplier action
  shipOrder(orderId: string): void { //
    // Find the order to check if it's overdue
    const order = this.allOrders.find(o => o.order_id === orderId);
    if (!order) {
      this.showToastMessage('Order not found.', 'error');
      return;
    }

    // Update the order status immediately in the UI for better user experience
    const originalStatus = order.status;
    order.status = 'Shipped';
    
    // Update filtered orders as well
    const filteredOrder = this.filteredOrders.find(o => o.order_id === orderId);
    if (filteredOrder) {
      filteredOrder.status = 'Shipped';
    }

    const deliveryStatus = this.getDeliveryStatusBasedOnDate(order);
    
    // Prepare the update payload
    const updatePayload: any = { 
      status: 'Shipped', 
      supplier_notes: this.editNotes || 'Order shipped to customer' 
    };
    
    // If order is overdue, update delivery status as well
    if (deliveryStatus === 'Overdue') {
      updatePayload.delivery_status = 'Overdue';
      order.deliveryStatus = 'Overdue';
      if (filteredOrder) {
        filteredOrder.deliveryStatus = 'Overdue';
      }
      console.log(`Order ${orderId} is overdue, updating delivery status`);
    }

    this.http.put(`${environment.apiUrl}/orders/${orderId}`, updatePayload, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message.includes('successfully')) {
            // Status already updated in UI, close modal and show success message
            this.showEditModal = false;
            const statusMessage = deliveryStatus === 'Overdue' 
              ? 'Order shipped (marked as overdue due to past delivery date)' 
              : 'Order marked as shipped';
            this.showToastMessage(statusMessage, deliveryStatus === 'Overdue' ? 'warning' : 'success');
            
            // Optionally reload to sync with server
            // this.loadOrders();
          } else {
            // Revert the status change if server update failed
            order.status = originalStatus;
            if (filteredOrder) {
              filteredOrder.status = originalStatus;
            }
            this.showToastMessage(response.message || 'Failed to mark order as shipped.', 'error');
          }
        },
        error: (err) => {
          // Revert the status change if server update failed
          order.status = originalStatus;
          if (filteredOrder) {
            filteredOrder.status = originalStatus;
          }
          console.error('Ship order failed:', err);
          this.showToastMessage('Failed to mark order as shipped.', 'error');
        }
      });
  }

  openEditModal(order: Order): void { //
    this.editProduct = order.productName; //
    this.editOrderId = order.order_id; // Use order_id from backend
    this.editDate = order.deliveryDate; //
    this.editNotes = order.supplierNotes || ''; //
    this.selectedOrder = order; //
    this.showEditModal = true; //
  }

  saveEdit(): void { //
    if (this.editDate && this.selectedOrder) { //
      const updatedDeliveryStatus = this.getUpdatedDeliveryStatus(this.editDate, this.selectedOrder.orderDate);
      
      // Store original values for rollback if needed
      const originalDeliveryDate = this.selectedOrder.deliveryDate;
      const originalSupplierNotes = this.selectedOrder.supplierNotes;
      const originalDeliveryStatus = this.selectedOrder.deliveryStatus;

      // Update UI immediately
      this.selectedOrder.deliveryDate = this.editDate;
      this.selectedOrder.supplierNotes = this.editNotes;
      this.selectedOrder.deliveryStatus = updatedDeliveryStatus;
      
      // Update in filtered orders as well
      const filteredOrder = this.filteredOrders.find(o => o.order_id === this.selectedOrder!.order_id);
      if (filteredOrder) {
        filteredOrder.deliveryDate = this.editDate;
        filteredOrder.supplierNotes = this.editNotes;
        filteredOrder.deliveryStatus = updatedDeliveryStatus;
      }

      this.http.put(`${environment.apiUrl}/orders/${this.selectedOrder.order_id}`, {
        delivery_date: this.editDate,
        supplier_notes: this.editNotes,
        delivery_status: updatedDeliveryStatus
      }, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message.includes('successfully')) {
            // UI already updated, just close modal and show success
            this.showEditModal = false;
            this.showToastMessage('Order updated successfully', 'success');
          } else {
            // Revert changes if server update failed
            if (this.selectedOrder) {
              this.selectedOrder.deliveryDate = originalDeliveryDate;
              this.selectedOrder.supplierNotes = originalSupplierNotes;
              this.selectedOrder.deliveryStatus = originalDeliveryStatus;
            }
            if (filteredOrder) {
              filteredOrder.deliveryDate = originalDeliveryDate;
              filteredOrder.supplierNotes = originalSupplierNotes;
              filteredOrder.deliveryStatus = originalDeliveryStatus;
            }
            this.showToastMessage(response.message || 'Failed to update order.', 'error');
          }
        },
        error: (err) => {
          // Revert changes if server update failed
          if (this.selectedOrder) {
            this.selectedOrder.deliveryDate = originalDeliveryDate;
            this.selectedOrder.supplierNotes = originalSupplierNotes;
            this.selectedOrder.deliveryStatus = originalDeliveryStatus;
          }
          if (filteredOrder) {
            filteredOrder.deliveryDate = originalDeliveryDate;
            filteredOrder.supplierNotes = originalSupplierNotes;
            filteredOrder.deliveryStatus = originalDeliveryStatus;
          }
          console.error('Save edit failed:', err);
          this.showToastMessage('Failed to update order.', 'error');
        }
      });
    } else {
      this.showToastMessage('Please fill all required fields', 'error'); //
    }
  }

  private getUpdatedDeliveryStatus(newDeliveryDate: string, orderDate: string): 'On time' | 'Delayed' { //
    const deliveryDate = new Date(newDeliveryDate); //
    const orderDateObj = new Date(orderDate); //
    const expectedDeliveryDate = new Date(orderDateObj); //
    expectedDeliveryDate.setDate(orderDateObj.getDate() + 14); // Assuming 14 days standard delivery

    return deliveryDate <= expectedDeliveryDate ? 'On time' : 'Delayed'; //
  }

  openViewModal(order: Order): void { //
    this.selectedOrder = order; //
    this.showViewModal = true; //
  }

  filterOrders(): void { //
    this.filteredOrders = this.allOrders.filter(order => { //
      // Date filter
      if (this.fromDate) { //
        const orderDate = new Date(order.orderDate);
        const from = new Date(this.fromDate); //
        if (orderDate < from) return false;
      }
      if (this.toDate) {
          const orderDate = new Date(order.orderDate);
          const to = new Date(this.toDate);
          to.setHours(23, 59, 59, 999); // Set to end of day for inclusive range
          if (orderDate > to) return false;
      }

      // Status filter
      if (this.statusFilter && this.statusFilter !== '') { //
        return order.status.toLowerCase() === this.statusFilter.toLowerCase(); //
      }

      return true; //
    });

    this.currentPage = 1; //
  }

  resetFilters(): void { //
    this.fromDate = ''; //
    this.toDate = ''; //
    this.statusFilter = ''; //
    this.filterOrders(); // Re-apply filters to reset
    this.currentPage = 1;
    this.showToastMessage('All filters reset - showing all orders', 'info'); //
  }

  refreshOrders(): void { //
    this.updateDebugInfo();
    this.loadOrders(); //
    this.showToastMessage('Orders refreshed', 'success'); //
  }

  // Method to manually re-authenticate if needed
  reAuthenticate(): void {
    console.log('SupplierOrdersComponent - Manual re-authentication triggered');
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('SupplierOrdersComponent - Re-authentication successful:', user);
        this.currentUser = user;
        if (user && user.role === 'supplier') {
          this.currentSupplierId = String(user.id);
          this.updateDebugInfo();
          this.loadOrders();
          this.showToastMessage('Authentication successful', 'success');
        } else {
          this.showToastMessage('Not authorized as supplier', 'error');
        }
      },
      error: (err) => {
        console.error('SupplierOrdersComponent - Re-authentication failed:', err);
        this.showToastMessage('Please login again', 'error');
      }
    });
  }

  downloadCSV(): void { //
    let csvContent = "data:text/csv;charset=utf-8,"; //
    const rows = []; //

    const headers = ['Order ID', 'Product', 'Quantity', 'Value', 'Order Date', 'Delivery Date', 'Status', 'Delivery Status', 'Admin Notes', 'Supplier Notes']; // Added Delivery Status, Notes
    rows.push(headers.map(h => `"${h}"`).join(",")); // Quote headers

    this.filteredOrders.forEach(order => { //
      const rowData = [
        order.order_id, // Use order_id instead of id
        order.productName, //
        order.quantity, //
        (typeof order.value === 'number' ? order.value.toFixed(2) : order.value), // Value as number
        order.orderDate, //
        order.deliveryDate, //
        order.status, //
        order.deliveryStatus, // Added
        order.adminNotes || '', // Added
        order.supplierNotes || '' // Added
      ];
      rows.push(rowData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")); // Quote fields and escape inner quotes
    });

    csvContent += rows.join("\n"); //
    const encodedUri = encodeURI(csvContent); //
    const link = document.createElement("a"); //
    link.setAttribute("href", encodedUri); //
    link.setAttribute("download", "orders_export.csv"); //
    document.body.appendChild(link); //
    link.click(); //
    document.body.removeChild(link); //

    this.showToastMessage('CSV export started', 'success'); //
  }

  showToastMessage(message: string, type: string): void { //
    this.toastMessage = message; //
    this.toastType = type; //
    this.showToast = true; //

    if (this.toastTimeout) { //
      clearTimeout(this.toastTimeout); //
    }

    this.toastTimeout = setTimeout(() => { //
      this.showToast = false; //
    }, 3000); //
  }

  getStatusClass(status: string): string { //
    switch(status.toLowerCase()) { //
      case "confirmed": return "bg-green-100 text-green-800"; //
      case "pending": return "bg-yellow-100 text-yellow-800"; //
      case "shipped": return "bg-blue-100 text-blue-800"; //
      case "delivered": return "bg-purple-100 text-purple-800"; //
      case "cancelled": return "bg-gray-100 text-gray-800"; //
      case "returned": return "bg-orange-100 text-orange-800"; //
      default: return "bg-gray-100 text-gray-800"; //
    }
  }

  // Check if order is overdue based on current date vs delivery date
  getDeliveryStatusBasedOnDate(order: Order | undefined): 'On time' | 'Delayed' | 'Overdue' {
    if (!order) return 'On time';
    
    const currentDate = new Date();
    const deliveryDate = new Date(order.deliveryDate);
    
    // Remove time component for date-only comparison
    currentDate.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    
    if (currentDate > deliveryDate) {
      return 'Overdue';
    } else if (currentDate.getTime() === deliveryDate.getTime()) {
      return 'On time'; // Today is delivery date
    } else {
      return 'On time'; // Future delivery date
    }
  }

  // Method to check and update overdue orders automatically
  checkAndUpdateOverdueOrders(): void {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    this.allOrders.forEach(order => {
      const deliveryDate = new Date(order.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);

      // If current date is past delivery date and order is not completed/cancelled
      if (currentDate > deliveryDate && 
          !['Delivered', 'Cancelled', 'Returned'].includes(order.status)) {
        
        // Update delivery status to Overdue if needed
        if (order.deliveryStatus !== 'Overdue') {
          this.updateOrderDeliveryStatus(order.order_id, 'Overdue');
        }
      }
    });
  }

  // Update delivery status in backend
  private updateOrderDeliveryStatus(orderId: string, deliveryStatus: string): void {
    this.http.put(`${environment.apiUrl}/orders/${orderId}`, {
      delivery_status: deliveryStatus
    }, { withCredentials: true })
    .subscribe({
      next: (response: any) => {
        console.log(`Order ${orderId} delivery status updated to ${deliveryStatus}`);
      },
      error: (err) => {
        console.error(`Failed to update delivery status for order ${orderId}:`, err);
      }
    });
  }

  // Get CSS class for delivery status badges
  getDeliveryStatusClass(deliveryStatus: string): string {
    switch(deliveryStatus.toLowerCase()) {
      case "on time": return "bg-green-100 text-green-800";
      case "delayed": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800 animate-pulse";
      default: return "bg-gray-100 text-gray-800";
    }
  }
}