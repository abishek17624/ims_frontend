export interface Transaction {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  orderNo: string;
  items: TransactionItem[];
  totalQty: number;
  totalAmount: number;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}