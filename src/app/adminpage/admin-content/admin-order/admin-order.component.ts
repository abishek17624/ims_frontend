// components/admin-order/admin-order.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order';
import { InventoryService } from '../../../services/inventory.service';
import { SupplierService } from '../../../services/supplier.service';

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
  currentOrder: Order | null = null;
  newOrderId: string = '';
  highlightedOrder: string | null = null;
  
  // Filter variables
  fromDate: string = '';
  toDate: string = '';
  selectedStatus: string = '';
  
  // Dashboard stats
  lastMonthOrders: number = 36;
  topSelling = {
    product: 'Maggi Noodles',
    value: '₹25,000',
    growth: 15.2,
    lastMonthValue: '₹21,700'
  };
  lowStockItems: number = 5;
  criticalItems: number = 3;
  warningItems: number = 2;
  pendingOrders: number = 2;
  newTodayOrders: number = 1;
  pendingOrdersValue: string = '₹8,500 total value';

  newOrder: Partial<Order> = {
    orderDate: this.formatDate(new Date()),
    productName: '',
    productCode: '',
    quantity: 0,
    unit: 'Packets',
    value: '',
    supplier: '',
    supplierPhone: '',
    deliveryDate: this.formatDate(new Date()),
    deliveryStatus: 'On time',
    status: 'Pending'
  };

  orders: Order[] = [];

  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private supplierService: SupplierService
  ) {}

  ngOnInit() {
    this.orders = this.orderService.getOrders();
    this.calculateDashboardStats();
  }

  get filteredOrders(): Order[] {
    let filtered = this.orders;
    
    // Filter by date range
    if (this.fromDate) {
      filtered = filtered.filter(order => {
        const orderDate = this.parseDate(order.orderDate);
        const fromDate = new Date(this.fromDate);
        return orderDate >= fromDate;
      });
    }
    
    if (this.toDate) {
      filtered = filtered.filter(order => {
        const orderDate = this.parseDate(order.orderDate);
        const toDate = new Date(this.toDate);
        return orderDate <= toDate;
      });
    }
    
    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(order => 
        order.status.toLowerCase().includes(this.selectedStatus.toLowerCase())
      );
    }
    
    return filtered;
  }

  parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  formatDate(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  calculateDashboardStats() {
    this.lastMonthOrders = Math.floor(this.orders.length * 0.85);
    this.pendingOrders = this.orders.filter(o => o.status === 'Pending').length;
    this.newTodayOrders = this.orders.filter(o => {
      const today = new Date();
      const orderDate = this.parseDate(o.orderDate);
      return orderDate.toDateString() === today.toDateString();
    }).length;
  }

  getOrderGrowth(): number {
    if (this.lastMonthOrders === 0) return 100;
    return Math.round(((this.orders.length - this.lastMonthOrders) / this.lastMonthOrders) * 100);
  }

  showInvoice(order: Order) {
    this.currentOrder = order;
    this.isInvoiceVisible = true;
  }

  closeInvoice() {
    this.isInvoiceVisible = false;
  }

  printInvoice() {
    window.print();
  }

  downloadInvoice() {
    const invoiceContent = this.generateInvoiceContent();
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${this.currentOrder?.id || 'order'}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  generateInvoiceContent(): string {
    let content = `Invoice #${this.currentOrder?.id || 'N/A'}\n`;
    content += `Date: ${this.currentOrder?.orderDate || 'N/A'}\n`;
    content += `Supplier: ${this.currentOrder?.supplier || 'N/A'}\n`;
    content += `Product: ${this.currentOrder?.productName || 'N/A'}\n`;
    content += `Quantity: ${this.currentOrder?.quantity || '0'} ${this.currentOrder?.unit || ''}\n`;
    content += `Total Value: ${this.currentOrder?.value || '₹0'}\n`;
    return content;
  }

  openNewOrderModal() {
    this.isNewOrderModalVisible = true;
    // Reset form
    this.newOrder = {
      orderDate: this.formatDate(new Date()),
      productName: '',
      productCode: '',
      quantity: 0,
      unit: 'Packets',
      value: '',
      supplier: '',
      supplierPhone: '',
      deliveryDate: this.formatDate(new Date()),
      deliveryStatus: 'On time',
      status: 'Pending'
    };
  }

  closeNewOrderModal() {
    this.isNewOrderModalVisible = false;
  }

  submitNewOrder() {
    const newOrder = this.orderService.createOrder(this.newOrder as Order);
    
    // Show success message
    this.newOrderId = newOrder.id;
    this.showSuccessPopup = true;
    this.highlightedOrder = newOrder.id;
    
    // Refresh orders
    this.orders = this.orderService.getOrders();
    this.calculateDashboardStats();
    
    // Close modal
    this.closeNewOrderModal();
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      this.showSuccessPopup = false;
      this.highlightedOrder = null;
    }, 5000);
  }

  viewOrder(order: Order) {
    this.currentOrder = order;
    this.isInvoiceVisible = true;
  }

  editOrder(order: Order) {
    this.currentOrder = order;
    this.newOrder = {...order};
    this.isNewOrderModalVisible = true;
  }

  deleteOrder(order: Order) {
    if (confirm(`Are you sure you want to delete order #${order.id}?`)) {
      this.orderService.deleteOrder(order.id);
      this.orders = this.orderService.getOrders();
      this.calculateDashboardStats();
    }
  }

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

  convertToCSV(orders: Order[]): string {
    const headers = ['Order ID', 'Product', 'Quantity', 'Value', 'Supplier', 'Order Date', 'Delivery Date', 'Status'];
    const rows = orders.map(order => [
      order.id,
      order.productName,
      order.quantity,
      order.value,
      order.supplier,
      order.orderDate,
      order.deliveryDate,
      order.status
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    return csv;
  }

  getSupplierAddress(): string {
    if (!this.currentOrder) return '456 Supplier Avenue, Mumbai, MH 400001';
    
    switch(this.currentOrder.id) {
      case '5724': return '789 Vendor Road, Delhi, DL 110001';
      case '2775': return '321 Distributor Lane, Chennai, TN 600001';
      case '8932': return '111 Wholesaler Street, Hyderabad, TS 500001';
      case '4618': return '222 Trader Avenue, Pune, MH 411001';
      case '3497': return '333 Merchant Road, Kolkata, WB 700001';
      case '6821': return '444 Dealer Lane, Ahmedabad, GJ 380001';
      case '5143': return '555 Reseller Street, Jaipur, RJ 302001';
      case '7265': return '666 Provider Avenue, Lucknow, UP 226001';
      case '1359': return '777 Stockist Road, Chandigarh, CH 160001';
      default: return '456 Supplier Avenue, Mumbai, MH 400001';
    }
  }

  getSupplierGstin(): string {
    if (!this.currentOrder) return '33XYZWV9876G2H7';
    
    switch(this.currentOrder.id) {
      case '5724': return '44PQRSM6543K9L8';
      case '2775': return '55TUVWX3210N7M6';
      case '8932': return '66ABCDEF1234G5H6';
      case '4618': return '77IJKLM7890N1O2';
      case '3497': return '88PQRST4567U8V9';
      case '6821': return '99WXYZ0123A4B5C';
      case '5143': return '12DEFGH6789I1J2';
      case '7265': return '34KLMNO1234P5Q6';
      case '1359': return '56RSTUV7890W1X2';
      default: return '33XYZWV9876G2H7';
    }
  }

  getSupplierEmail(): string {
    if (!this.currentOrder) return 'contact@supplierx.com';
    
    const supplierName = this.currentOrder.supplier.toLowerCase().replace(' ', '');
    return `contact@${supplierName}.com`;
  }

  getUnitPrice(): string {
    if (!this.currentOrder) return '₹100.14';
    
    const value = parseFloat(this.currentOrder.value.replace('₹', '').replace(',', ''));
    const quantity = this.currentOrder.quantity;
    return `₹${(value / quantity).toFixed(2)}`;
  }

  getSubtotal(): string {
    return this.currentOrder?.value || '₹4,306.00';
  }

  getTax(): string {
    if (!this.currentOrder) return '₹819.72';
    
    const subtotal = parseFloat(this.currentOrder.value.replace('₹', '').replace(',', ''));
    const tax = subtotal * 0.18;
    return `₹${tax.toFixed(2)}`;
  }

  getTotal(): string {
    if (!this.currentOrder) return '₹5,375.72';
    
    const subtotal = parseFloat(this.currentOrder.value.replace('₹', '').replace(',', ''));
    const tax = subtotal * 0.18;
    const shipping = 250;
    const total = subtotal + tax + shipping;
    return `₹${total.toFixed(2)}`;
  }
}