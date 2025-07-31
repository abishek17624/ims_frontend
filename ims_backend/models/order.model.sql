// models/order.ts
export interface Order {
  order_id: string; // Matches database 'order_id'
  orderDate: string; // YYYY-MM-DD string for input type="date"
  product_id: number; // Foreign key to products table
  productName: string; // Display name, derived from product_id lookup
  productCode?: string; // Product ID as string for display/reference
  quantity: number;
  unit: string;
  value: number; // Stored as number for calculations
  supplier_id: number; // Foreign key to supplier table
  supplierName: string; // Display name, derived from supplier_id lookup
  supplierPhone: string; // Derived from supplier_id lookup
  category: string; // New field, derived from product_id lookup
  deliveryDate: string; // YYYY-MM-DD string for input type="date"
  deliveryStatus: 'On time' | 'Delayed' | 'Returned';
  status: 'Pending' | 'Confirmed' | 'Delayed' | 'Cancelled' | 'Returned' | 'Shipped' | 'Delivered';
  adminNotes?: string;
  supplierNotes?: string;
  lastUpdated?: string; // ISO string from database TIMESTAMP
}