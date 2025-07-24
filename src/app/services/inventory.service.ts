import { Injectable } from '@angular/core';
import { Products } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private readonly STORAGE_KEY = 'inventory_products';

  constructor() { }

  getProducts(): Products[] {
    const productsJson = localStorage.getItem(this.STORAGE_KEY);
    if (productsJson) {
      return JSON.parse(productsJson);
    } else {
      const sampleProducts = this.getSampleProducts();
      this.saveProducts(sampleProducts);
      return sampleProducts;
    }
  }

  saveProducts(products: Products[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
  }

  addProduct(product: Products): void {
    const products = this.getProducts();
    products.unshift(product);
    this.saveProducts(products);
  }

  updateProduct(updatedProduct: Products): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = updatedProduct;
      this.saveProducts(products);
    }
  }

  deleteProduct(productId: string): void {
    const products = this.getProducts();
    const updatedProducts = products.filter(p => p.id !== productId);
    this.saveProducts(updatedProducts);
  }

  private getSampleProducts(): Products[] {
    return [
      {
        id: "PRD-001",
        name: "Maggi Noodles",
        category: "snacks",
        subcategory: "Instant Noodles",
        buyingPrice: 35.00,
        sellingPrice: 43.00,
        quantity: 43,
        threshold: 12,
        expiry: "2026-04-11",
        supplier: "Supplier X",
        contact: "9876543210",
        status: "in_stock"
      },
      {
        id: "PRD-002",
        name: "Amul Milk",
        category: "Dairy Products",
        subcategory: "Milk",
        buyingPrice: 20.00,
        sellingPrice: 25.00,
        quantity: 50,
        threshold: 20,
        expiry: "2025-06-15",
        supplier: "Supplier Y",
        contact: "9876543211",
        status: "in_stock"
      },
      {
        id: "PRD-003",
        name: "Coca Cola",
        category: "Beverages",
        subcategory: "Soda",
        buyingPrice: 32.00,
        sellingPrice: 40.00,
        quantity: 15,
        threshold: 20,
        expiry: "2025-12-30",
        supplier: "Supplier Z",
        contact: "9876543212",
        status: "low_stock"
      },
      {
        id: "PRD-004",
        name: "Sunflower Oil",
        category: "Grocery",
        subcategory: "Oil",
        buyingPrice: 120.00,
        sellingPrice: 150.00,
        quantity: 3,
        threshold: 5,
        expiry: "2026-03-01",
        supplier: "Supplier X",
        contact: "9876543210",
        status: "low_stock"
      },
      {
        id: "PRD-005",
        name: "Dairy Milk Chocolate",
        category: "Snacks",
        subcategory: "Chocolate",
        buyingPrice: 45.00,
        sellingPrice: 55.00,
        quantity: 0,
        threshold: 10,
        expiry: "2025-09-30",
        supplier: "Supplier Y",
        contact: "9876543211",
        status: "out_of_stock"
      },
      {
        id: "PRD-006",
        name: "Basmati Rice",
        category: "Grocery",
        subcategory: "Rice",
        buyingPrice: 80.00,
        sellingPrice: 100.00,
        quantity: 25,
        threshold: 10,
        expiry: "2026-01-15",
        supplier: "Supplier Z",
        contact: "9876543212",
        status: "in_stock"
      },
      {
        id: "PRD-007",
        name: "Lays Chips",
        category: "Snacks",
        subcategory: "Chips",
        buyingPrice: 20.00,
        sellingPrice: 30.00,
        quantity: 8,
        threshold: 15,
        expiry: "2025-11-30",
        supplier: "Supplier X",
        contact: "9876543210",
        status: "low_stock"
      },
      {
        id: "PRD-008",
        name: "Orange Juice",
        category: "Beverages",
        subcategory: "Juice",
        buyingPrice: 90.00,
        sellingPrice: 120.00,
        quantity: 12,
        threshold: 5,
        expiry: "2025-08-20",
        supplier: "Supplier Y",
        contact: "9876543211",
        status: "in_stock"
      },
      {
        id: "PRD-009",
        name: "Toothpaste",
        category: "Personal Care",
        subcategory: "Oral Care",
        buyingPrice: 45.00,
        sellingPrice: 60.00,
        quantity: 18,
        threshold: 10,
        expiry: "2025-12-31",
        supplier: "Supplier Z",
        contact: "9876543212",
        status: "in_stock"
      },
      {
        id: "PRD-010",
        name: "Hand Sanitizer",
        category: "Personal Care",
        subcategory: "Hygiene",
        buyingPrice: 50.00,
        sellingPrice: 75.00,
        quantity: 0,
        threshold: 5,
        expiry: "2025-10-15",
        supplier: "Supplier X",
        contact: "9876543210",
        status: "out_of_stock"
      }
    ];
  }

  // Add this method to your InventoryService class
  getAllCategories(): string[] {
    const products = this.getProducts();
    const categories = new Set<string>();
    products.forEach(product => categories.add(product.category));
    return Array.from(categories);
  }
}
