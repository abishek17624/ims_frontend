// models/order.ts
export interface Order {
  id: string;
  order_id: string; // UUID string from backend
  orderDate: string; // YYYY-MM-DD string (formatted from backend)
  product_id: string; // Product ID for backend operations
  productName: string; // Product name from backend
  productCode: string; // Product code from backend
  quantity: number; // Order quantity
  unit: string; // Unit of measurement
  value: number; // Order value (number for calculations)
  supplier_id: string; // Supplier ID for backend operations
  supplierName: string; // Supplier name from backend
  supplierPhone: string; // Supplier phone from backend
  category: string; // Order category
  deliveryDate: string; // YYYY-MM-DD string (formatted from backend)
  deliveryStatus: 'On time' | 'Delayed' | 'Returned' | 'Overdue'; // Delivery status
  status: 'Pending' | 'Confirmed' | 'Delayed' | 'Cancelled' | 'Returned' | 'Shipped' | 'Delivered'; // Order status
  adminNotes?: string; // Optional admin notes
  supplierNotes?: string; // Optional supplier notes
  lastUpdated?: string; // ISO string from backend
}