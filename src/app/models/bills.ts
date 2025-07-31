// src/app/models/bills.ts
export interface TransactionItem {
  productId: string; // Matches billing.product_id VARCHAR(50)
  productName: string; // Matches billing.product_name VARCHAR(100)
  category: string; // Matches billing.category VARCHAR(50)
  unit: string; // ADDED: Matches billing.unit VARCHAR(20)
  quantity: number; // Matches billing.quantity INT
  price: number; // Matches billing.price DECIMAL(10,2)
  discount: number; // Matches billing.discount DECIMAL(10,2)
  total: number; // Matches billing.total DECIMAL(10,2)
}

export interface Transaction {
  id: string; // Matches billing.transaction_id VARCHAR(50)
  customerName: string; // Matches billing.customer_name VARCHAR(100)
  customerPhone?: string; // Matches billing.customer_phone VARCHAR(15)
  date: string; // Matches billing.created_date DATE
  orderNo: string; // Matches billing.order_no VARCHAR(20)
  items: TransactionItem[]; // Array of individual product items
  totalQty: number; // Matches billing.total_qty INT
  totalAmount: number; // Matches billing.total_amount DECIMAL(10,2)
}