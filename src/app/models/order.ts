// models/order.ts
export interface Order {
  id: string;
  orderDate: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  value: string;
  supplier: string;
  supplierId: string;
  supplierPhone: string;
  deliveryDate: string;
  deliveryStatus: 'On time' | 'Delayed' | 'Returned';
  status: 'Pending' | 'Confirmed' | 'Delayed' | 'Cancelled' | 'Returned' | 'Shipped' | 'Delivered';
  adminNotes?: string;
  supplierNotes?: string;
  lastUpdated?: string;
}