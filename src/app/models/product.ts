// models/product.ts
export interface Products {
  id: string; // Changed to string based on your product table's VARCHAR(50) ID
  name: string;
  category: string;
  subcategory?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  unit?: string; // Added unit property for billing system
  threshold: number;
  expiry?: string; // Stored as string (YYYY-MM-DD) for date input
  supplier?: string; // Supplier Name from backend
  contact?: string; // Supplier Contact from backend
  status: 'in_stock' | 'low_stock' | 'out_of_stock'; // Product stock status
  action?: 'active' | 'inactive'; // For soft delete/active status
  created_at?: string; // Timestamp from backend
  updated_at?: string; // Timestamp from backend
  supplier_id?: number; // Added as per your products table schema update
}