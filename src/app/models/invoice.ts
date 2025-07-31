// models/invoice.ts
export interface Invoice {
  invoice_id: number;
  order_id: string;
  supplier_id: number;
  invoiceDate: string; // YYYY-MM-DD format
  dueDate: string; // YYYY-MM-DD format
  amount: number;
  invoiceStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;

  // Order Details (from join)
  product_id: string;
  productName: string;
  quantity: number;
  unit: string;
  orderValue: number;
  productCategory: string;
  orderDate: string; // YYYY-MM-DD format
  deliveryDate: string; // YYYY-MM-DD format
  deliveryStatus: string;
  orderStatus: string;

  // Supplier Details (from join)
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
}
