import { Component, OnInit } from '@angular/core'; //
import { CommonModule } from '@angular/common'; //
import { FormsModule } from '@angular/forms'; //
import { HttpClient } from '@angular/common/http'; // <--- NEW: Import HttpClient
import { Supplier } from '../../../models/supplier'; //
import * as XLSX from 'xlsx'; //
import { environment } from '../../../../environments/environment'; // <--- NEW: Import environment

@Component({
  selector: 'app-admin-supplier',
  standalone: true,
  imports: [CommonModule, FormsModule], //
  templateUrl: './admin-supplier.component.html', //
  styleUrls: ['./admin-supplier.component.css']
})
export class AdminSupplierComponent implements OnInit {
  currentView: 'list' | 'add' | 'view' | 'edit' = 'list'; //
  sortColumn = 0; //
  sortDirection = 1; // 1 for ascending, -1 for descending
  searchTerm = ''; //

  allSuppliers: Supplier[] = []; //
  filteredSuppliers: Supplier[] = []; //
  selectedSupplier: Supplier | null = null; //
  isEditMode = false; //
  showDownloadOptions = false; //
  showToast = false; //
  toastMessage = ''; //
  toastType: 'success' | 'error' | 'warning' = 'success'; //

  // Remove SupplierService as we'll use HttpClient directly
  constructor(private http: HttpClient) { } // <--- Changed constructor

  ngOnInit() { //
    this.loadSuppliers(); //
  }

  loadSuppliers() { //
    // Fetch suppliers from backend
    this.http.get<Supplier[]>(`${environment.apiUrl}/supplier/`, { withCredentials: true }) // Assuming GET /supplier for list
      .subscribe({
        next: (data) => {
          this.allSuppliers = data.map(s => ({ ...s, dateAdded: s.dateAdded ? new Date(s.dateAdded) : undefined })); // Convert date string to Date object
          this.filterSuppliers(); // Apply initial filter (which just copies allSuppliers if searchTerm is empty)
        },
        error: (err) => {
          console.error('Failed to load suppliers:', err);
          this.showToastMessage('Failed to load suppliers.', 'error'); //
        }
      });
  }

  filterSuppliers() { //
    if (!this.searchTerm) { //
      this.filteredSuppliers = [...this.allSuppliers]; //
    } else {
      const term = this.searchTerm.toLowerCase(); //
      this.filteredSuppliers = this.allSuppliers.filter(supplier => //
        (supplier.id && String(supplier.id).toLowerCase().includes(term)) || // Ensure id is string for includes
        (supplier.name && supplier.name.toLowerCase().includes(term)) || //
        (supplier.product && supplier.product.toLowerCase().includes(term)) || //
        (supplier.contact && supplier.contact.includes(term)) || //
        (supplier.email && supplier.email.toLowerCase().includes(term)) || //
        (supplier.category && supplier.category.toLowerCase().includes(term))
      );
    }
  }

  sortTable(columnIndex: number) { //
    if (this.sortColumn === columnIndex) { //
      this.sortDirection *= -1; //
    } else {
      this.sortColumn = columnIndex; //
      this.sortDirection = 1; //
    }

    this.filteredSuppliers.sort((a, b) => { //
      let valueA: any, valueB: any; //

      switch(columnIndex) { //
        case 0: valueA = a.id; valueB = b.id; break; //
        case 1: valueA = a.name; valueB = b.name; break; //
        case 2: valueA = a.product; valueB = b.product; break; //
        case 3: valueA = a.contact; valueB = b.contact; break; //
        default: return 0; //
      }

      if (typeof valueA === 'string') { //
        return valueA.localeCompare(valueB) * this.sortDirection; //
      } else {
        return (Number(valueA) - Number(valueB)) * this.sortDirection; //
      }
    });
  }

  showViewForm(supplier: Supplier) { //
    this.selectedSupplier = { ...supplier }; //
    this.currentView = 'view'; //
    this.isEditMode = false; //
  }

  cancelForm() { //
    this.currentView = 'list'; //
  }

  downloadSuppliers(type: 'excel' | 'pdf' | 'json') { //
    this.showDownloadOptions = false; //

    if (type === 'excel') { //
      this.exportToExcel(); //
    } else if (type === 'json') { //
      this.exportToJson(); //
    }
  }

  private exportToExcel() { //
    const headers = ["Supplier ID", "Supplier Name", "Product", "Category", "Buying Price", "Contact Number", "Email", "Return Policy", "Date Added"]; //

    const data = this.filteredSuppliers.map(supplier => [ //
      supplier.id, //
      supplier.name, //
      supplier.product, //
      supplier.category.charAt(0).toUpperCase() + supplier.category.slice(1), //
      `$${supplier.price.toFixed(2)}`, //
      supplier.contact, //
      supplier.email, //
      supplier.returnPolicy === 'yes' ? 'Taking Return' : 'Not Taking Return', //
      supplier.dateAdded ? new Date(supplier.dateAdded).toLocaleDateString() : 'N/A'
    ]); //

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]); //
    const wb = XLSX.utils.book_new(); //
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers"); //
    XLSX.writeFile(wb, `Suppliers_${new Date().toISOString().slice(0,10)}.xlsx`); //

    this.showToastMessage('Excel file downloaded successfully!', 'success'); //
  }

  private exportToJson() { //
    const dataStr = JSON.stringify(this.filteredSuppliers, null, 2); //
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); //

    const exportFileDefaultName = `suppliers_${new Date().toISOString().slice(0,10)}.json`; //

    const linkElement = document.createElement('a'); //
    linkElement.setAttribute('href', dataUri); //
    linkElement.setAttribute('download', exportFileDefaultName); //
    linkElement.click(); //

    this.showToastMessage('JSON file downloaded successfully!', 'success'); //
  }

  private showToastMessage(message: string, type: 'success' | 'error' | 'warning') { //
    this.toastMessage = message; //
    this.toastType = type; //
    this.showToast = true; //

    setTimeout(() => { //
      this.showToast = false; //
    }, 5000); //
  }

  showAddForm() { //
    this.selectedSupplier = { //
      id: '', //
      name: '', //
      product: '', //
      category: '', //
      price: 0, //
      contact: '', //
      email: '', //
      returnPolicy: 'no', //
      dateAdded: new Date(), //
      password: '', // Initialize password field for new supplier creation
      status: 'active', // Default status for new supplier
      comments: '' // Default comments for new supplier
    };
    this.currentView = 'add'; //
    this.isEditMode = false; //
  }

  editSupplier(supplier: Supplier) { //
    this.selectedSupplier = { ...supplier }; //
    this.currentView = 'edit'; //
    this.isEditMode = true; //
  }

  submitForm() { //
    if (!this.selectedSupplier) return; //

    // Validate form
    if (!this.selectedSupplier.name ||
        !this.selectedSupplier.product ||
        !this.selectedSupplier.category ||
        !this.selectedSupplier.price ||
        !this.selectedSupplier.contact ||
        !this.selectedSupplier.email ||
        !this.selectedSupplier.returnPolicy) { //
      this.showToastMessage('Please fill all required fields', 'error'); //
      return;
    }

    if (this.currentView === 'add') { //
      // --- Add new supplier via Backend API ---
      if (!this.selectedSupplier.password) { // Password is required for new supplier
        this.showToastMessage('Password is required for new supplier.', 'error');
        return;
      }

      const newSupplierPayload = {
        name: this.selectedSupplier.name,
        product: this.selectedSupplier.product,
        category: this.selectedSupplier.category,
        price: this.selectedSupplier.price,
        contact: this.selectedSupplier.contact,
        email: this.selectedSupplier.email,
        returnPolicy: this.selectedSupplier.returnPolicy,
        password: this.selectedSupplier.password, // Include password for backend user creation
        status: this.selectedSupplier.status || 'active', // Default or get from form
        comments: this.selectedSupplier.comments || '' // Default or get from form
      };

      this.http.post(`${environment.apiUrl}/supplier/create`, newSupplierPayload, { withCredentials: true }) // <--- Make POST request
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Supplier created successfully') { // Check response message
              this.showToastMessage('Supplier added successfully!', 'success'); //
              this.loadSuppliers(); // Reload list from backend
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to add supplier.', 'error');
            }
          },
          error: (err) => {
            console.error('Add supplier failed:', err);
            this.showToastMessage(err.error?.message || 'Server error occurred while adding supplier.', 'error');
          }
        });

    } else if (this.currentView === 'edit') { //
      // --- Update existing supplier via Backend API ---
      if (!this.selectedSupplier.id) {
        this.showToastMessage('Supplier ID is missing for update.', 'error');
        return;
      }
      const updatedSupplierPayload = {
        name: this.selectedSupplier.name,
        product: this.selectedSupplier.product,
        category: this.selectedSupplier.category,
        price: this.selectedSupplier.price,
        contact: this.selectedSupplier.contact,
        email: this.selectedSupplier.email,
        returnPolicy: this.selectedSupplier.returnPolicy,
        status: this.selectedSupplier.status, // Include status
        comments: this.selectedSupplier.comments // Include comments
        // Password is not updated via this form normally, so exclude it
      };

      this.http.put(`${environment.apiUrl}/supplier/${this.selectedSupplier.id}`, updatedSupplierPayload, { withCredentials: true }) // Assuming PUT /supplier/:id for update
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Supplier updated successfully') { // Check response message
              this.showToastMessage('Supplier updated successfully!', 'success'); //
              this.loadSuppliers();
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to update supplier.', 'error');
            }
          },
          error: (err) => {
            console.error('Update supplier failed:', err);
            this.showToastMessage(err.error?.message || 'Server error occurred while updating supplier.', 'error');
          }
        });
    }
  }

  deleteSupplier(id: string) { //
    if (confirm('Are you sure you want to delete this supplier?')) { //
      this.http.delete(`${environment.apiUrl}/supplier/${id}`, { withCredentials: true }) // Assuming DELETE /supplier/:id
        .subscribe({
          next: (response: any) => {
            if (response.message === 'Supplier deleted successfully') { // Check response message
              this.showToastMessage('Supplier deleted successfully!', 'success'); //
              this.loadSuppliers(); // Reload list
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to delete supplier.', 'error');
            }
          },
          error: (err) => {
            console.error('Delete supplier failed:', err);
            this.showToastMessage(err.error?.message || 'Server error occurred while deleting supplier.', 'error');
          }
        });
    }
  }

  
}