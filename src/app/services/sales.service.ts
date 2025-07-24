import { Injectable } from '@angular/core';
import { SalesPerson } from '../models/sales';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private salesPersons: SalesPerson[] = [
    { 
      id: "201", 
      name: "Rathik", 
      contact: "7687764556", 
      email: "richard@gmail.com", 
      password: "richard@123", 
      dateAdded: new Date("2025-05-15"),
      salesTarget: 10000,
      currentSales: 8500,
      performanceRating: 85
    },
    { 
      id: "202", 
      name: "Sathish", 
      contact: "9876543210", 
      email: "emily@example.com", 
      password: "emily@123", 
      dateAdded: new Date("2025-06-20"),
      salesTarget: 12000,
      currentSales: 11000,
      performanceRating: 92
    },
    { 
      id: "203", 
      name: "Pradeep", 
      contact: "8765432109", 
      email: "michael@example.com", 
      password: "michael@123", 
      dateAdded: new Date("2025-04-10"),
      salesTarget: 8000,
      currentSales: 9500,
      performanceRating: 119
    }
  ];

  private storageKey = 'stockeasy_sales';

  constructor() {
    this.loadFromLocalStorage();
  }

  getSalesPersons(): SalesPerson[] {
    return [...this.salesPersons];
  }

  getSalesPerson(id: string): SalesPerson | undefined {
    return this.salesPersons.find(s => s.id === id);
  }

  addSalesPerson(salesPerson: Omit<SalesPerson, 'id' | 'dateAdded'>): SalesPerson {
    const newSalesPerson: SalesPerson = {
      ...salesPerson,
      id: this.generateId(),
      dateAdded: new Date(),
      salesTarget: salesPerson.salesTarget || 0,
      currentSales: salesPerson.currentSales || 0,
      performanceRating: this.calculatePerformanceRating(salesPerson.currentSales || 0, salesPerson.salesTarget || 0)
    };
    this.salesPersons.push(newSalesPerson);
    this.saveToLocalStorage();
    return newSalesPerson;
  }

  updateSalesPerson(id: string, updates: Partial<SalesPerson>): SalesPerson | undefined {
    const index = this.salesPersons.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const updatedSalesPerson = {
      ...this.salesPersons[index],
      ...updates,
      performanceRating: this.calculatePerformanceRating(
        updates.currentSales || this.salesPersons[index].currentSales || 0,
        updates.salesTarget || this.salesPersons[index].salesTarget || 0
      )
    };
    this.salesPersons[index] = updatedSalesPerson;
    this.saveToLocalStorage();
    return updatedSalesPerson;
  }

  deleteSalesPerson(id: string): boolean {
    const initialLength = this.salesPersons.length;
    this.salesPersons = this.salesPersons.filter(s => s.id !== id);
    this.saveToLocalStorage();
    return this.salesPersons.length !== initialLength;
  }

  private calculatePerformanceRating(currentSales: number, target: number): number {
    if (target === 0) return 0;
    return Math.round((currentSales / target) * 100);
  }

  private generateId(): string {
    return `sale${this.salesPersons.length + 1}`;
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.salesPersons = JSON.parse(stored);
    }
  }

  private saveToLocalStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.salesPersons));
  }
}