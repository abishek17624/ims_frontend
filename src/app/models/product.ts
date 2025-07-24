export interface Products {
  // product.model.ts
  id: string;
  name: string;
  category: string;
  subcategory: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  threshold: number;
  expiry: string;
  supplier: string;
  contact: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  // createdAt: Date;
}
