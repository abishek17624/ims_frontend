import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TransactionService } from '../../services/billing.service';
import { InventoryService } from '../../services/inventory.service';
import { Transaction, TransactionItem } from '../../models/bills';
import { Products } from '../../models/product';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './history-detail.component.html',
  styleUrls: ['./history-detail.component.css']
})

export class HistoryDetailComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  fromDate: string = '';
  toDate: string = '';
  isEditMode: boolean = false;
  currentTransaction: Transaction | null = null;
  allProducts: Products[] = [];
  categories: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private transactionService: TransactionService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    this.loadProducts();
    
    this.route.queryParams.subscribe(params => {
      if (params['orderNo']) {
        this.isEditMode = true;
        this.loadTransactionForEdit(params['orderNo']);
      }
    });
  }

  loadTransactions(): void {
    this.transactions = this.transactionService.getTransactions();
    this.filteredTransactions = [...this.transactions];
  }

  loadProducts(): void {
    this.allProducts = this.inventoryService.getProducts();
    this.categories = this.inventoryService.getAllCategories();
  }

  loadTransactionForEdit(orderNo: string): void {
    const transaction = this.transactions.find(t => t.orderNo === orderNo);
    if (transaction) {
      this.currentTransaction = JSON.parse(JSON.stringify(transaction));
    }
  }

  filterTransactions(): void {
    if (!this.fromDate && !this.toDate) {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    this.filteredTransactions = this.transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (!from || transactionDate >= from) && (!to || transactionDate <= to);
    });
  }

  editTransaction(orderNo: string): void {
    this.router.navigate(['/sales/history'], { 
      queryParams: { orderNo }
    });
  }

  downloadTransaction(orderNo: string): void {
    const transaction = this.transactions.find(t => t.orderNo === orderNo);
    if (!transaction) return;

    let content = `Order No: ${transaction.orderNo}\n`;
    content += `Customer: ${transaction.customerName}\n`;
    content += `Phone: ${transaction.customerPhone || '-'}\n`;
    content += `Date: ${transaction.date}\n`;
    content += `Total Qty: ${transaction.totalQty}\n`;
    content += `Total Amount: ₹${transaction.totalAmount.toFixed(2)}\n\n`;
    content += `Products:\n`;

    transaction.items.forEach(item => {
      content += `- ${item.category} > ${item.productName} (${item.productId}) | `;
      content += `Qty: ${item.quantity}, Price: ₹${item.price.toFixed(2)}, `;
      content += `Discount: ₹${item.discount.toFixed(2)}, Total: ₹${item.total.toFixed(2)}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transaction.orderNo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getProductsByCategory(category: string): Products[] {
    return this.allProducts.filter(product => product.category === category);
  }

  onProductSelect(index: number): void {
    if (!this.currentTransaction) return;
    const item = this.currentTransaction.items[index];
    const product = this.allProducts.find(p => p.id === item.productId);
    if (product) {
      item.productName = product.name;
      item.price = product.sellingPrice;
      this.updateItemTotal(index);
    }
  }

  updateItemTotal(index: number): void {
    if (!this.currentTransaction) return;
    const item = this.currentTransaction.items[index];
    item.total = (item.quantity * item.price) - item.discount;
  }

  updateProducts(index: number): void {
    if (!this.currentTransaction) return;
    const item = this.currentTransaction.items[index];
    item.productId = '';
    item.productName = '';
    item.price = 0;
    item.total = 0;
  }

  addRow(): void {
    if (!this.currentTransaction) return;
    this.currentTransaction.items.push({
      productId: '',
      productName: '',
      category: '',
      quantity: 1,
      price: 0,
      discount: 0,
      total: 0
    });
  }

  deleteRow(index: number): void {
    if (!this.currentTransaction) return;
    this.currentTransaction.items.splice(index, 1);
  }

  calculateTotalQty(): number {
    if (!this.currentTransaction) return 0;
    return this.currentTransaction.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  calculateTotalAmount(): number {
    if (!this.currentTransaction) return 0;
    return this.currentTransaction.items.reduce((sum, item) => sum + item.total, 0);
  }

  saveChanges(): void {
    if (!this.currentTransaction) return;

    // Update totals
    this.currentTransaction.totalQty = this.calculateTotalQty();
    this.currentTransaction.totalAmount = this.calculateTotalAmount();

    // Find and update the transaction
    const index = this.transactions.findIndex(t => t.orderNo === this.currentTransaction?.orderNo);
    if (index >= 0) {
      this.transactions[index] = JSON.parse(JSON.stringify(this.currentTransaction));
    }

    this.transactionService.saveTransactions(this.transactions);
    alert('Transaction updated successfully!');
    this.cancelEdit();
  }

  printReceipt(): void {
    if (!this.currentTransaction) return;
    
    const printContent = `
      <div style="font-family: Arial; max-width: 300px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center;">StockEasy</h2>
        <p style="text-align: center;">Order #${this.currentTransaction.orderNo}</p>
        <div style="margin-bottom: 15px;">
          <p><strong>Customer:</strong> ${this.currentTransaction.customerName}</p>
          <p><strong>Date:</strong> ${this.currentTransaction.date}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ddd; text-align: left;">Item</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right;">Qty</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right;">Price</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentTransaction.items.map(item => `
              <tr>
                <td style="border-bottom: 1px solid #eee;">${item.productName}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right;">₹${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: right; font-weight: bold;">
          <p>Total: ₹${this.currentTransaction.totalAmount.toFixed(2)}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    setTimeout(() => {
      printWindow?.print();
      printWindow?.close();
    }, 500);
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.currentTransaction = null;
    this.router.navigate(['/sales/history']);
  }
}