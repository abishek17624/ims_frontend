// components/supplier-orders/supplier-orders.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order';
import { SupplierService } from '../../../services/supplier.service';

@Component({
  selector: 'app-supplier-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-orders.component.html',
  styleUrls: ['./supplier-orders.component.css']
})

export class SupplierOrdersComponent implements OnInit {
  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  currentPage = 1;
  rowsPerPage = 5;
  fromDate: string = '';
  toDate: string = '';
  statusFilter: string = '';
  
  // Modal properties
  showEditModal = false;
  showViewModal = false;
  editProduct: string = '';
  editOrderId: string = '';
  editDate: string = '';
  editNotes: string = '';
  selectedOrder: Order | null = null;
  
  // Toast properties
  showToast = false;
  toastMessage = '';
  toastType = 'info';
  toastTimeout: any;

  // Current supplier ID (would normally come from auth service)
  currentSupplierId = 'sup1'; // Example supplier ID
newTodayOrders: any;

  constructor(
    private orderService: OrderService,
    private supplierService: SupplierService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.allOrders = this.orderService.getOrdersForSupplier(this.currentSupplierId);
    this.filteredOrders = [...this.allOrders];
  }

  get paginatedOrders(): Order[] {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    return this.filteredOrders.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.rowsPerPage);
  }

  get showingFrom(): number {
    return (this.currentPage - 1) * this.rowsPerPage + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage * this.rowsPerPage, this.filteredOrders.length);
  }

  get totalOrders(): number {
    return this.filteredOrders.length;
  }

  get acceptedCount(): number {
    return this.filteredOrders.filter(order => 
      order.status === 'Confirmed' || order.status === 'Shipped' || order.status === 'Delivered'
    ).length;
  }

  get pendingCount(): number {
    return this.filteredOrders.filter(order => order.status === 'Pending').length;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  acceptOrder(orderId: string): void {
    const updatedOrder = this.orderService.updateOrder(orderId, {
      status: 'Confirmed',
      supplierNotes: 'Order accepted by supplier'
    });
    
    if (updatedOrder) {
      this.loadOrders();
      this.showToastMessage('Order accepted successfully', 'success');
    }
  }

  shipOrder(orderId: string): void {
    const updatedOrder = this.orderService.updateOrder(orderId, {
      status: 'Shipped',
      supplierNotes: this.editNotes || 'Order shipped to customer'
    });
    
    if (updatedOrder) {
      this.loadOrders();
      this.showEditModal = false;
      this.showToastMessage('Order marked as shipped', 'success');
    }
  }

  openEditModal(order: Order): void {
    this.editProduct = order.productName;
    this.editOrderId = order.id;
    this.editDate = order.deliveryDate;
    this.editNotes = order.supplierNotes || '';
    this.selectedOrder = order;
    this.showEditModal = true;
  }

  saveEdit(): void {
    if (this.editDate && this.selectedOrder) {
      const updatedOrder = this.orderService.updateOrder(this.selectedOrder.id, {
        deliveryDate: this.editDate,
        supplierNotes: this.editNotes,
        deliveryStatus: this.getUpdatedDeliveryStatus(this.editDate, this.selectedOrder.orderDate)
      });
      
      if (updatedOrder) {
        this.loadOrders();
        this.showEditModal = false;
        this.showToastMessage('Order updated successfully', 'success');
      }
    } else {
      this.showToastMessage('Please fill all required fields', 'error');
    }
  }

  private getUpdatedDeliveryStatus(newDeliveryDate: string, orderDate: string): 'On time' | 'Delayed' {
    const deliveryDate = new Date(newDeliveryDate);
    const orderDateObj = this.parseDate(orderDate);
    const expectedDeliveryDate = new Date(orderDateObj);
    expectedDeliveryDate.setDate(orderDateObj.getDate() + 14); // Assuming 14 days standard delivery
    
    return deliveryDate <= expectedDeliveryDate ? 'On time' : 'Delayed';
  }

  openViewModal(order: Order): void {
    this.selectedOrder = order;
    this.showViewModal = true;
  }

  filterOrders(): void {
    this.filteredOrders = this.allOrders.filter(order => {
      // Date filter
      if (this.fromDate && this.toDate) {
        const orderDate = this.parseDate(order.orderDate);
        const from = new Date(this.fromDate);
        const to = new Date(this.toDate);
        if (orderDate < from || orderDate > to) return false;
      }
      
      // Status filter
      if (this.statusFilter && this.statusFilter !== '') {
        return order.status.toLowerCase() === this.statusFilter.toLowerCase();
      }
      
      return true;
    });
    
    this.currentPage = 1;
  }

  parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.filteredOrders = [...this.allOrders];
    this.currentPage = 1;
    this.showToastMessage('All filters reset - showing all orders', 'info');
  }

  refreshOrders(): void {
    this.loadOrders();
    this.showToastMessage('Orders refreshed', 'success');
  }

  downloadCSV(): void {
    let csvContent = "data:text/csv;charset=utf-8,";
    const rows = [];
    
    const headers = ["Order ID", "Product", "Quantity", "Value", "Order Date", "Delivery Date", "Status"];
    rows.push(headers.join(","));
    
    this.filteredOrders.forEach(order => {
      const rowData = [
        order.id,
        order.productName,
        order.quantity,
        order.value,
        order.orderDate,
        order.deliveryDate,
        order.status
      ];
      rows.push(rowData.join(","));
    });
    
    csvContent += rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showToastMessage('CSV export started', 'success');
  }

  showToastMessage(message: string, type: string): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-purple-100 text-purple-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "returned": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }
}