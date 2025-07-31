// components/salesperson/billing/billing.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { Products } from '../../models/product'; // Import Products model
import { environment } from '../../../environments/environment'; // Import environment
import { AuthService } from '../../services/auth.service'; // Import AuthService

// Define BillItem interface for a single product line in a bill (matches backend structure for products_sold array)
interface BillItem {
  product_id: string; // Changed to string to match products.id
  productName: string; // Derived from products table
  category: string; // Derived from products table
  unit: string;
  quantity: number;
  price: number; // Selling price per unit
  discount: number; // Discount amount for this line item
  total: number; // Total for this specific product line (quantity * price - discount)
}

// Define BillTransaction interface for displaying unique bills from backend /transactions endpoint
interface BillTransaction {
  transaction_id: string;
  customer_name: string;
  customer_phone: string;
  created_date: string; // YYYY-MM-DD
  order_no: string;
  total_qty_bill: number;
  total_amount_bill: number; // Ensure this is number
}


@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.css']
})
export class BillingComponent implements OnInit {
  // Form fields for new bill
  customerName: string = '';
  customerPhone: string = '';
  orderNo: string = ''; // Can be auto-generated or manual
  selectedCategory: string = ''; // For filtering products dropdown
  selectedProduct: Products | null = null; // Currently selected product for adding to bill
  quantity: number = 1;
  discount: number = 0; // Per item discount, applied on product.sellingPrice
  unit: string = 'Units'; // Default unit (can be derived from product model if it has one)

  // Bill items array (products added to current bill)
  billItems: BillItem[] = [];

  // Calculated totals for the current bill
  totalBillQuantity: number = 0;
  totalBillAmount: number = 0;
  totalDiscountAmount: number = 0; // Total discount across all items

  // Data for dropdowns
  allCategories: string[] = []; // Only active category names
  allProducts: Products[] = []; // All active products (from backend)

  // UI state
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  showSuccessModal = false; // For showing a success modal after bill creation
  transactionId: string = ''; // ID of the newly created transaction
  toastTimeout: any; // Add missing property for toast timeout

  // For displaying existing bills
  currentView: 'create' | 'list' | 'view' = 'create'; // Controls which section is visible
  allBillTransactions: BillTransaction[] = []; // Stores unique bill transactions for list view
  selectedBillTransaction: BillTransaction | null = null; // Selected transaction for viewing details
  selectedBillItems: BillItem[] = []; // Items of the selected transaction being viewed


  constructor(private http: HttpClient, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadCategories(); // Load categories for filtering products
    this.loadProducts(); // Load all products for selection
    this.generateNewOrderNo(); // Generate an initial order number
    this.loadBillTransactions(); // Load existing bills for history view
  }

  // --- Data Loading from Backend ---

  loadCategories(): void {
    // Fetches categories that are 'active' for filtering product dropdown
    this.http.get<any[]>(`${environment.apiUrl}/product/category`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.allCategories = data.map(cat => cat.name);
          console.log('Loaded categories:', this.allCategories);
        },
        error: (err) => {
          console.error('Failed to load categories:', err);
          this.showToastMessage('Failed to load categories for product filter.', 'error');
        }
      });
  }

  loadProducts(): void {
    // Fetches all active products for the product selection dropdown
    this.http.get<Products[]>(`${environment.apiUrl}/product`, { withCredentials: true }) // Assuming /product endpoint returns active products
      .subscribe({
        next: (data) => {
          this.allProducts = data;
        },
        error: (err) => {
          console.error('Failed to load products:', err);
          this.showToastMessage('Failed to load products for billing.', 'error');
        }
      });
  }

  loadBillTransactions(): void {
    // Fetches unique bill transactions for the history list
    this.http.get<BillTransaction[]>(`${environment.apiUrl}/billing/transactions`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.allBillTransactions = data;
        },
        error: (err) => {
          console.error('Failed to load bill transactions:', err);
          this.showToastMessage('Failed to load bill history.', 'error');
        }
      });
  }

  // --- Form Logic ---

  generateNewOrderNo(): void {
    // Simple timestamp-based order number for demonstration
    this.orderNo = `BILL-${Date.now().toString().slice(-8)}`;
  }

  /**
   * Filters products for the dropdown based on selected category.
   */
  get filteredProductsByCategory(): Products[] {
    if (!this.selectedCategory) {
      return this.allProducts; // Show all if no category selected
    }
    return this.allProducts.filter(p => p.category === this.selectedCategory);
  }

  /**
   * Handles when a product is selected from the dropdown.
   */
  onProductChange(): void {
    if (this.selectedProduct) {
      console.log('Selected product:', this.selectedProduct); // Debug log
      this.unit = this.selectedProduct.unit || 'Units'; // Use product unit or default to 'Units'
      this.quantity = 1; // Default quantity
      this.discount = 0; // Default discount
      console.log('Set price to:', this.selectedProduct.sellingPrice); // Debug log
    }
  }

  /**
   * Adds the currently selected product to the bill items list.
   * Includes validation for stock and quantity.
   */
  addProductToBill(): void {
    if (!this.selectedProduct) {
      this.showToastMessage('Please select a product.', 'warning');
      return;
    }
    if (this.quantity <= 0) {
      this.showToastMessage('Quantity must be greater than zero.', 'warning');
      return;
    }
    if (this.selectedProduct.quantity < this.quantity) {
      this.showToastMessage(`Insufficient stock for ${this.selectedProduct.name}. Available: ${this.selectedProduct.quantity}.`, 'warning');
      return;
    }
    if (this.discount < 0 || this.discount > (this.selectedProduct.sellingPrice * this.quantity)) {
      this.showToastMessage('Invalid discount amount.', 'warning');
      return;
    }

    const itemTotal = (this.selectedProduct.sellingPrice * this.quantity) - this.discount;

    const newItem: BillItem = {
      product_id: this.selectedProduct.id, // ID is string
      productName: this.selectedProduct.name,
      category: this.selectedProduct.category,
      unit: this.unit,
      quantity: this.quantity,
      price: this.selectedProduct.sellingPrice, // Make sure this is the selling price
      discount: this.discount,
      total: itemTotal
    };

    console.log('Adding item to bill:', newItem); // Debug log to check values

    this.billItems.push(newItem);
    this.calculateTotals(); // Recalculate totals after adding item

    // Reset product selection for next item
    this.selectedProduct = null;
    this.quantity = 1;
    this.discount = 0;
    this.selectedCategory = ''; // Clear category filter to show all products
  }

  /**
   * Removes an item from the bill items list.
   * @param index The index of the item to remove.
   */
  removeBillItem(index: number): void {
    this.billItems.splice(index, 1);
    this.calculateTotals(); // Recalculate totals after removing item
  }

  /**
   * Calculates the total quantity, total amount, and total discount for the current bill.
   */
  calculateTotals(): void {
    this.totalBillQuantity = this.billItems.reduce((sum, item) => sum + item.quantity, 0);
    this.totalBillAmount = this.billItems.reduce((sum, item) => sum + item.total, 0);
    // Note: totalDiscountAmount might be sum of `item.discount` if discount is per item.
    // If discount is per quantity, adjust logic. Current schema suggests discount is per item
    this.totalDiscountAmount = this.billItems.reduce((sum, item) => sum + item.discount, 0);
  }

  // --- Bill Submission ---

  /**
   * Submits the current bill to the backend.
   */
  submitBill(): void {
    if (!this.customerName.trim() || !this.orderNo.trim() || this.billItems.length === 0) {
      this.showToastMessage('Customer name, bill/order number, and at least one product are required.', 'error');
      return;
    }
    if (this.totalBillAmount <= 0) {
        this.showToastMessage('Bill total must be greater than zero.', 'error');
        return;
    }


    const billPayload = {
      customer_name: this.customerName.trim(),
      customer_phone: this.customerPhone.trim() || null,
      order_no: this.orderNo.trim(),
      products_sold: this.billItems.map(item => ({
        product_id: item.product_id, // ID is string
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        discount: item.discount,
        total: item.total
      })),
      total_qty_bill: this.totalBillQuantity,
      total_amount_bill: this.totalBillAmount
    };

    console.log('Submitting bill payload:', billPayload); // Debug log
    console.log('Bill items details:', this.billItems); // Debug log

    this.http.post(`${environment.apiUrl}/billing/create`, billPayload, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          if (response.message === 'Bill created successfully') {
            this.transactionId = response.transactionId; // Get transaction ID from backend
            this.showSuccessModal = true; // Show success popup
            this.resetBillForm(); // Clear form after successful submission
            this.loadProducts(); // Reload products to reflect reduced stock instantly
            this.loadBillTransactions(); // Refresh bill history list
          } else {
            this.showToastMessage(response.message || 'Failed to create bill.', 'error');
          }
        },
        error: (err) => {
          console.error('Bill creation failed:', err);
          this.showToastMessage(err.error?.message || 'Server error occurred during bill creation.', 'error');
        }
      });
  }

  /**
   * Resets the bill creation form to its initial state.
   */
  resetBillForm(): void {
    this.customerName = '';
    this.customerPhone = '';
    this.generateNewOrderNo(); // Generate a new order number
    this.selectedCategory = '';
    this.selectedProduct = null;
    this.quantity = 1;
    this.discount = 0;
    this.unit = 'Units';
    this.billItems = [];
    this.calculateTotals(); // Reset totals
  }

  // --- View Existing Bills ---

  /**
   * Views the detailed items of a selected bill transaction.
   * @param transaction The BillTransaction object to view.
   */
  viewBillDetails(transaction: BillTransaction): void {
    this.http.get<BillItem[]>(`${environment.apiUrl}/billing/transaction/${transaction.transaction_id}`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.selectedBillTransaction = transaction; // Store the main transaction summary
          this.selectedBillItems = data; // Store the line items for the transaction
          this.currentView = 'view'; // Change view to show details modal
        },
        error: (err) => {
          console.error('Failed to load transaction details:', err);
          this.showToastMessage('Failed to load bill details.', 'error');
        }
      });
  }

  // --- UI Helpers (Toast, Navigation, Print/Download) ---

  /**
   * Displays a toast notification message.
   * @param message The message to display.
   * @param type The type of toast (success, error, warning).
   */
  showToastMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
    }, 3000); // Hide after 3 seconds
  }

  // --- Navigation between bill views ---
  showCreateBillView(): void {
    this.currentView = 'create';
    this.resetBillForm(); // Always reset form when switching to create view
  }

  showBillListView(): void {
    this.currentView = 'list';
    this.loadBillTransactions(); // Refresh list when navigating to it
  }

  // --- Invoice/Receipt Display (Simplified for frontend only) ---
  // These calculations are for display in the view modal and don't directly interact with backend billing logic
  getBillSubtotal(): number {
    return this.selectedBillItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getBillTotalDiscount(): number {
    return this.selectedBillItems.reduce((sum, item) => sum + item.discount, 0);
  }

  getBillTax(): number {
    const subtotalAfterDiscount = this.getBillSubtotal() - this.getBillTotalDiscount();
    return subtotalAfterDiscount * 0.18; // Assuming 18% tax
  }

  getBillGrandTotal(): number {
    const subtotalAfterDiscount = this.getBillSubtotal() - this.getBillTotalDiscount();
    const tax = this.getBillTax();
    const shipping = 0; // Assuming no shipping for local billing
    return subtotalAfterDiscount + tax + shipping;
  }

  printBill(): void {
    // Basic print functionality for the displayed bill
    window.print();
  }

  downloadBill(): void {
    // Downloads the displayed bill content as a text file
    const billContent = this.generateBillContentForDownload();
    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill_${this.selectedBillTransaction?.transaction_id || 'receipt'}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  generateBillContentForDownload(): string {
    let content = `--- StockEasy Bill ---\n\n`;
    content += `Transaction ID: ${this.selectedBillTransaction?.transaction_id || 'N/A'}\n`;
    content += `Customer Name: ${this.selectedBillTransaction?.customer_name || 'N/A'}\n`;
    content += `Customer Phone: ${this.selectedBillTransaction?.customer_phone || 'N/A'}\n`;
    content += `Bill Date: ${this.selectedBillTransaction?.created_date || 'N/A'}\n`;
    content += `Order No: ${this.selectedBillTransaction?.order_no || 'N/A'}\n\n`;
    content += `--------------------\n`;
    content += `Items:\n`;
    this.selectedBillItems.forEach(item => {
      content += `- ${item.productName} (${item.category})\n`;
      content += `  Qty: ${item.quantity} ${item.unit} @ ₹${item.price.toFixed(2)}/unit\n`;
      if (item.discount > 0) {
          content += `  Discount: ₹${item.discount.toFixed(2)}\n`;
      }
      content += `  Line Total: ₹${item.total.toFixed(2)}\n\n`;
    });
    content += `--------------------\n`;
    content += `Subtotal: ₹${this.getBillSubtotal().toFixed(2)}\n`;
    content += `Total Discount: ₹${this.getBillTotalDiscount().toFixed(2)}\n`;
    content += `Tax (18%): ₹${this.getBillTax().toFixed(2)}\n`;
    content += `Grand Total: ₹${this.getBillGrandTotal().toFixed(2)}\n`;
    content += `--------------------\n`;
    content += `Thank you for your business!\n`;
    content += `--------------------\n`;
    return content;
  }
}