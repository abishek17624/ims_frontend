import { Injectable } from '@angular/core';
import { Transaction } from '../models/bills';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly STORAGE_KEY = 'inventory_transactions';

  constructor() { }

  getTransactions(): Transaction[] {
    const transactionsJson = localStorage.getItem(this.STORAGE_KEY);
    if (transactionsJson) {
      return JSON.parse(transactionsJson);
    } else {
      // Sample transaction data
      const sampleTransactions = this.getSampleTransactions();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sampleTransactions));
      return sampleTransactions;
    }
  }

  saveTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
  }

  private getSampleTransactions(): Transaction[] {
    return [
      {
        id: '1',
        customerName: 'Jackson',
        customerPhone: '9876543210',
        date: '2023-05-15',
        orderNo: 'ORD001',
        totalQty: 5,
        totalAmount: 450,
        items: [
          {
            productId: 'PRD-001',
            productName: 'Maggi Noodles',
            category: 'snacks',
            quantity: 2,
            price: 43,
            discount: 0,
            total: 86
          },
          {
            productId: 'PRD-002',
            productName: 'Amul Milk',
            category: 'Dairy Products',
            quantity: 1,
            price: 25,
            discount: 5,
            total: 20
          },
          {
            productId: 'PRD-003',
            productName: 'Coca Cola',
            category: 'Beverages',
            quantity: 2,
            price: 40,
            discount: 10,
            total: 70
          }
        ]
      },
      {
        id: '2',
        customerName: 'Mithesh',
        customerPhone: '8765432109',
        date: '2023-05-16',
        orderNo: 'ORD002',
        totalQty: 3,
        totalAmount: 275,
        items: [
          {
            productId: 'PRD-004',
            productName: 'Sunflower Oil',
            category: 'Grocery',
            quantity: 1,
            price: 150,
            discount: 0,
            total: 150
          },
          {
            productId: 'PRD-008',
            productName: 'Orange Juice',
            category: 'Beverages',
            quantity: 2,
            price: 120,
            discount: 25,
            total: 215
          }
        ]
      },
      {
        id: '3',
        customerName: 'Sowmitran',
        customerPhone: '7654321098',
        date: '2023-05-17',
        orderNo: 'ORD003',
        totalQty: 7,
        totalAmount: 620,
        items: [
          {
            productId: 'PRD-006',
            productName: 'Basmati Rice',
            category: 'Grocery',
            quantity: 3,
            price: 100,
            discount: 30,
            total: 270
          },
          {
            productId: 'PRD-009',
            productName: 'Toothpaste',
            category: 'Personal Care',
            quantity: 2,
            price: 60,
            discount: 0,
            total: 120
          },
          {
            productId: 'PRD-007',
            productName: 'Lays Chips',
            category: 'Snacks',
            quantity: 2,
            price: 30,
            discount: 10,
            total: 50
          }
        ]
      }
    ];
  }

  saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
  }

  
}