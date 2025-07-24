import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { Products } from '../../models/product';
import { TransactionService } from '../../services/billing.service';
import { Transaction, TransactionItem } from '../../models/bills';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.css']
})
export class BillingComponent implements OnInit {
printPage() {
throw new Error('Method not implemented.');
}
  title = 'StockEasy';
  welcomeMessage = 'Welcome SalesPerson';
  rowCount = 0;
  totalQty = 0;
  totalAmount = 0;
  allProducts: Products[] = [];
  categories: string[] = [];

  customer = {
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    orderNo: this.generateOrderNo()
  };

  productRows: any[] = [];

  constructor(
    private inventoryService: InventoryService,
    private transactionService: TransactionService
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.allProducts = this.inventoryService.getProducts();
    this.categories = this.inventoryService.getAllCategories();
  }

  getCategories(): string[] {
    return this.categories;
  }

  getProductsByCategory(category: string): Products[] {
    return this.allProducts.filter(product => product.category === category);
  }

  generateOrderNo(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let order = '';
    for (let i = 0; i < 6; i++) {
      order += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return order;
  }

  checkRequired() {
    return this.customer.name.trim() && this.customer.date;
  }

  addRow() {
    this.rowCount++;
    this.productRows.push({
      id: this.rowCount,
      category: '',
      product: null,
      quantity: 1,
      price: 0,
      discount: 0,
      total: 0,
      products: []
    });
  }

  deleteRow(index: number) {
    this.productRows.splice(index, 1);
    this.updateTotal();
  }

  updateProducts(row: any) {
    if (row.category) {
      row.products = this.getProductsByCategory(row.category);
      row.product = null;
    } else {
      row.products = [];
      row.product = null;
    }
  }

  onProductSelect(row: any) {
    if (row.product) {
      row.price = row.product.sellingPrice;
      this.updateTotal();
    }
  }

  updateTotal() {
    this.totalQty = 0;
    this.totalAmount = 0;

    this.productRows.forEach(row => {
      const qty = row.quantity || 0;
      const price = row.price || 0;
      const discount = row.discount || 0;

      row.total = qty * price - discount;

      this.totalQty += qty;
      this.totalAmount += row.total;
    });
  }

  saveAndPrint() {
    if (!this.checkRequired()) {
      alert('Please fill all required fields');
      return;
    }

    if (this.productRows.length === 0) {
      alert('Please add at least one product');
      return;
    }

    // Create transaction
    const transaction: Transaction = {
      id: Date.now().toString(),
      customerName: this.customer.name,
      customerPhone: this.customer.phone,
      date: this.customer.date,
      orderNo: this.customer.orderNo,
      items: this.productRows.map(row => ({
        productId: row.product.id,
        productName: row.product.name,
        category: row.product.category,
        quantity: row.quantity,
        price: row.price,
        discount: row.discount,
        total: row.total
      })),
      totalQty: this.totalQty,
      totalAmount: this.totalAmount
    };

    // Update inventory quantities
    this.productRows.forEach(row => {
      const product = this.allProducts.find(p => p.id === row.product.id);
      if (product) {
        product.quantity -= row.quantity;
        if (product.quantity < 0) product.quantity = 0;
      }
    });

    // Save data
    this.transactionService.saveTransaction(transaction);
    this.inventoryService.saveProducts(this.allProducts);

    // Print receipt
    this.printReceipt(transaction);

    // Reset form
    this.resetForm();
  }

  printReceipt(transaction: Transaction) {
    // Create printable content
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 10px;">StockEasy</h2>
        <p style="text-align: center; margin-bottom: 20px;">Order #${transaction.orderNo}</p>
        
        <div style="margin-bottom: 15px;">
          <p><strong>Customer:</strong> ${transaction.customerName}</p>
          <p><strong>Date:</strong> ${transaction.date}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ddd; text-align: left; padding: 5px;">Item</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right; padding: 5px;">Qty</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right; padding: 5px;">Price</th>
              <th style="border-bottom: 1px solid #ddd; text-align: right; padding: 5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${transaction.items.map(item => `
              <tr>
                <td style="border-bottom: 1px solid #eee; padding: 5px;">${item.productName}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right; padding: 5px;">${item.quantity}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right; padding: 5px;">₹${item.price.toFixed(2)}</td>
                <td style="border-bottom: 1px solid #eee; text-align: right; padding: 5px;">₹${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: right; font-weight: bold; margin-top: 10px;">
          <p>Total: ₹${transaction.totalAmount.toFixed(2)}</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px; font-size: 12px;">
          Thank you for your purchase!
        </p>
      </div>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    setTimeout(() => {
      printWindow?.print();
      printWindow?.close();
    }, 500);
  }

  resetForm() {
    this.customer = {
      name: '',
      phone: '',
      date: new Date().toISOString().split('T')[0],
      orderNo: this.generateOrderNo()
    };
    this.productRows = [];
    this.totalQty = 0;
    this.totalAmount = 0;
    this.rowCount = 0;
  }

  confirmLogout() {
    const confirmed = confirm("SalesPerson, do you want to logout? ⚠️");
    if (confirmed) {
      window.location.href = "/login";
    }
  }
}