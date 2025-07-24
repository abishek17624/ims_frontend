// services/order.service.ts
import { Injectable } from '@angular/core';
import { Order } from '../models/order';
import { InventoryService } from './inventory.service';
import { SupplierService } from './supplier.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly STORAGE_KEY = 'stockeasy_orders';

  constructor(
    private inventoryService: InventoryService,
    private supplierService: SupplierService
  ) { }

  getOrders(): Order[] {
    const ordersJson = localStorage.getItem(this.STORAGE_KEY);
    if (ordersJson) {
      return JSON.parse(ordersJson);
    } else {
      const sampleOrders = this.getSampleOrders();
      this.saveOrders(sampleOrders);
      return sampleOrders;
    }
  }

  saveOrders(orders: Order[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
  }

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrders();
    return orders.find(order => order.id === id);
  }

  createOrder(order: Omit<Order, 'id'>): Order {
    const orders = this.getOrders();
    const newOrder: Order = {
      ...order,
      id: this.generateOrderId(),
      status: 'Pending',
      deliveryStatus: 'On time',
      lastUpdated: new Date().toISOString()
    };
    orders.unshift(newOrder);
    this.saveOrders(orders);
    return newOrder;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;

    const updatedOrder = {
      ...orders[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    orders[index] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  }

  deleteOrder(id: string): boolean {
    const orders = this.getOrders();
    const initialLength = orders.length;
    const updatedOrders = orders.filter(o => o.id !== id);
    this.saveOrders(updatedOrders);
    return updatedOrders.length !== initialLength;
  }

  getOrdersForSupplier(supplierId: string): Order[] {
    return this.getOrders().filter(order => order.supplierId === supplierId);
  }

  private generateOrderId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private getSampleOrders(): Order[] {
    const products = this.inventoryService.getProducts();
    const suppliers = this.supplierService.getSuppliers();

    return [
      {
        id: '7535',
        orderDate: '12/11/2023',
        productName: 'Maggi Noodles',
        productCode: 'PRD-001',
        quantity: 43,
        unit: 'Packets',
        value: '₹4,306',
        supplier: 'Supplier X',
        supplierId: 'sup1',
        supplierPhone: '9876543210',
        deliveryDate: '11/12/2025',
        deliveryStatus: 'Delayed',
        status: 'Pending',
        adminNotes: 'Urgent order for Diwali season',
        lastUpdated: '2023-11-12T10:30:00Z'
      },
      {
        id: '5724',
        orderDate: '10/11/2023',
        productName: 'Bru Coffee',
        productCode: 'PRD-002',
        quantity: 22,
        unit: 'Packets',
        value: '₹2,557',
        supplier: 'Supplier Y',
        supplierId: 'sup2',
        supplierPhone: '9876543211',
        deliveryDate: '21/12/2025',
        deliveryStatus: 'On time',
        status: 'Confirmed',
        lastUpdated: '2023-11-10T14:15:00Z'
      },
      {
        id: '2775',
        orderDate: '05/11/2023',
        productName: 'Red Bull',
        productCode: 'PRD-003',
        quantity: 36,
        unit: 'Cans',
        value: '₹4,075',
        supplier: 'Supplier Z',
        supplierId: 'sup3',
        supplierPhone: '9876543212',
        deliveryDate: '05/12/2025',
        deliveryStatus: 'Returned',
        status: 'Returned',
        supplierNotes: 'Damaged during shipping',
        lastUpdated: '2023-11-05T09:45:00Z'
      },
      {
        id: '8932',
        orderDate: '15/11/2023',
        productName: 'Lays Chips',
        productCode: 'PRD-004',
        quantity: 50,
        unit: 'Packets',
        value: '₹5,250',
        supplier: 'Supplier A',
        supplierId: 'sup4',
        supplierPhone: '9876543213',
        deliveryDate: '15/12/2025',
        deliveryStatus: 'On time',
        status: 'Shipped',
        lastUpdated: '2023-11-15T16:20:00Z'
      },
      {
        id: '4618',
        orderDate: '18/11/2023',
        productName: 'Coca Cola',
        productCode: 'PRD-005',
        quantity: 60,
        unit: 'Bottles',
        value: '₹3,600',
        supplier: 'Supplier B',
        supplierId: 'sup5',
        supplierPhone: '9876543214',
        deliveryDate: '18/12/2025',
        deliveryStatus: 'On time',
        status: 'Delivered',
        lastUpdated: '2023-11-18T11:10:00Z'
      },
      {
        id: '3497',
        orderDate: '20/11/2023',
        productName: 'Pepsi',
        productCode: 'PRD-006',
        quantity: 55,
        unit: 'Bottles',
        value: '₹3,300',
        supplier: 'Supplier C',
        supplierId: 'sup1',
        supplierPhone: '9876543215',
        deliveryDate: '20/12/2025',
        deliveryStatus: 'Delayed',
        status: 'Pending',
        adminNotes: 'Waiting for supplier confirmation',
        lastUpdated: '2023-11-20T13:25:00Z'
      },
      {
        id: '6821',
        orderDate: '22/11/2023',
        productName: 'Dairy Milk',
        productCode: 'PRD-007',
        quantity: 30,
        unit: 'Boxes',
        value: '₹6,000',
        supplier: 'Supplier D',
        supplierId: 'sup2',
        supplierPhone: '9876543216',
        deliveryDate: '22/12/2025',
        deliveryStatus: 'On time',
        status: 'Confirmed',
        lastUpdated: '2023-11-22T15:40:00Z'
      },
      {
        id: '5143',
        orderDate: '25/11/2023',
        productName: 'KitKat',
        productCode: 'PRD-008',
        quantity: 40,
        unit: 'Boxes',
        value: '₹5,200',
        supplier: 'Supplier E',
        supplierId: 'sup3',
        supplierPhone: '9876543217',
        deliveryDate: '25/12/2025',
        deliveryStatus: 'On time',
        status: 'Pending',
        lastUpdated: '2023-11-25T10:15:00Z'
      },
      {
        id: '7265',
        orderDate: '28/11/2023',
        productName: 'Amul Butter',
        productCode: 'PRD-009',
        quantity: 25,
        unit: 'Kg',
        value: '₹3,750',
        supplier: 'Supplier F',
        supplierId: 'sup4',
        supplierPhone: '9876543218',
        deliveryDate: '28/12/2025',
        deliveryStatus: 'Returned',
        status: 'Returned',
        supplierNotes: 'Customer return - quality issue',
        lastUpdated: '2023-11-28T14:50:00Z'
      },
      {
        id: '1359',
        orderDate: '30/11/2023',
        productName: 'Nestle Milk',
        productCode: 'PRD-010',
        quantity: 35,
        unit: 'Liters',
        value: '₹4,200',
        supplier: 'Supplier G',
        supplierId: 'sup5',
        supplierPhone: '9876543219',
        deliveryDate: '30/12/2025',
        deliveryStatus: 'On time',
        status: 'Shipped',
        lastUpdated: '2023-11-30T12:30:00Z'
      }
    ];
  }
}