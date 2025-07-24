import { Injectable } from '@angular/core';
import { Supplier } from '../models/supplier';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  private suppliers: Supplier[] = [
    { 
      id: "sup1", 
      name: "Raman", 
      product: "Kit Kat", 
      category: "grocery", 
      price: 5.00, 
      contact: "7687764556", 
      email: "richard@gmail.com", 
      returnPolicy: "yes", 
      dateAdded: new Date("2025-05-15") 
    },
    { id: "sup2", name: "Mithesh", product: "Maaza", category: "grocery", price: 2.50, contact: "9867545368", email: "tomhoman@gmail.com", returnPolicy: "yes", dateAdded: new Date("2025-06-20") },
    { id: "sup3", name: "Gokul", product: "Smart TVs", category: "electronics", price: 499.99, contact: "9876543210", email: "sales@electroworld.com", returnPolicy: "yes", dateAdded: new Date("2025-07-06") },
    { id: "sup4", name: "Naveen", product: "Milk", category: "dairy", price: 1.20, contact: "8765432109", email: "info@dairydelight.com", returnPolicy: "no", dateAdded: new Date("2025-05-05") },
    { id: "sup5", name: "Solai", product: "T-Shirts", category: "clothing", price: 12.99, contact: "7654321098", email: "contact@fashionhub.com", returnPolicy: "yes", dateAdded: new Date("2025-05-12") }
  ];

  private storageKey = 'stockeasy_suppliers';

  constructor() {
    this.loadFromLocalStorage();
  }

  getSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  getSupplier(id: string): Supplier | undefined {
    return this.suppliers.find(s => s.id === id);
  }

  addSupplier(supplier: Omit<Supplier, 'id' | 'dateAdded'>): Supplier {
    const newSupplier: Supplier = {
      ...supplier,
      id: this.generateId(),
      dateAdded: new Date()
    };
    this.suppliers.push(newSupplier);
    this.saveToLocalStorage();
    return newSupplier;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier | undefined {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const updatedSupplier = {
      ...this.suppliers[index],
      ...updates
    };
    this.suppliers[index] = updatedSupplier;
    this.saveToLocalStorage();
    return updatedSupplier;
  }

  deleteSupplier(id: string): boolean {
    const initialLength = this.suppliers.length;
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    this.saveToLocalStorage();
    return this.suppliers.length !== initialLength;
  }

  private generateId(): string {
    return `sup${this.suppliers.length + 1}`;
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.suppliers = JSON.parse(stored);
    }
  }

  private saveToLocalStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.suppliers));
  }

}





