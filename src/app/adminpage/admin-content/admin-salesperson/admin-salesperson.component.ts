import { Component, OnInit } from '@angular/core'; //
import { CommonModule } from '@angular/common'; //
import { FormsModule } from '@angular/forms'; //
import { HttpClient } from '@angular/common/http'; // <--- NEW: Import HttpClient
import { SalesPerson } from '../../../models/sales'; //
import * as XLSX from 'xlsx'; //
import { environment } from '../../../../environments/environment'; // <--- NEW: Import environment

@Component({
  selector: 'app-admin-salesperson',
  standalone: true,
  imports: [CommonModule, FormsModule], //
  templateUrl: './admin-salesperson.component.html', //
  styleUrls: ['./admin-salesperson.component.css']
})
export class AdminSalespersonComponent implements OnInit {
  currentView: 'list' | 'add' | 'view' | 'edit' = 'list'; //
  sortColumn = 0; //
  sortDirection = 1; // 1 for ascending, -1 for descending
  searchTerm = ''; //

  allSalesPersons: SalesPerson[] = []; //
  filteredSalesPersons: SalesPerson[] = []; //
  selectedSalesPerson: SalesPerson | null = null; //
  isEditMode = false; //
  showDownloadOptions = false; //
  showToast = false; //
  toastMessage = ''; //
  toastType: 'success' | 'error' | 'warning' = 'success'; //
  showPassword = false; //

  constructor(private http: HttpClient) { } // <--- Changed constructor, removed SalesService

  ngOnInit() { //
    console.log('AdminSalespersonComponent initialized'); // Debug log
    console.log('Environment API URL:', environment.apiUrl); // Debug log
    this.loadSalesPersons(); //
  }

  // Add a method to manually refresh data (for debugging)
  refreshData() {
    console.log('Manual refresh triggered'); // Debug log
    this.loadSalesPersons();
  }

  // Debug method to check database state
  debugDatabase() {
    console.log('Checking database state...'); // Debug log
    this.http.get(`${environment.apiUrl}/salesperson/debug`, { withCredentials: true })
      .subscribe({
        next: (data: any) => {
          console.log('Database debug data:', data);
          alert(`Database State:\nUsers: ${data.counts.users}\nSalespersons: ${data.counts.salespersons}\nCheck console for details.`);
        },
        error: (err) => {
          console.error('Debug request failed:', err);
          this.showToastMessage('Debug request failed. Check console.', 'error');
        }
      });
  }

  loadSalesPersons() { //
    // Fetch sales persons from backend
    console.log('Loading salespersons from:', `${environment.apiUrl}/salesperson`); // Debug log
    this.http.get<any[]>(`${environment.apiUrl}/salesperson`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('Raw data from backend:', data); // Debug log
          if (!data || !Array.isArray(data)) {
            console.error('Invalid data format received:', data);
            this.allSalesPersons = [];
            this.showToastMessage('Invalid data format received from server.', 'error');
            return;
          }
          
          this.allSalesPersons = data.map((sp, index) => {
            console.log(`Processing salesperson ${index}:`, sp); // Debug each salesperson
            return {
              id: sp.id,
              name: sp.name || '',
              contact: sp.contact || '',
              email: sp.email || '',
              salesTarget: Number(sp.salesTarget || sp.sales_target || 0),
              currentSales: Number(sp.currentSales || sp.current_sales || 0),
              performanceRating: Number(sp.performanceRating || sp.performance_rating || 0),
              dateAdded: sp.dateAdded ? new Date(sp.dateAdded) : (sp.created_at ? new Date(sp.created_at) : new Date())
            };
          });
          console.log('Processed salesPersons:', this.allSalesPersons); // Debug log
          this.filterSalesPersons(); // Apply initial filter
        },
        error: (err) => {
          console.error('Failed to load sales persons:', err);
          if (err.status === 401) {
            this.showToastMessage('Authentication required. Please login again.', 'error');
          } else if (err.status === 403) {
            this.showToastMessage('Access denied. Admin privileges required.', 'error');
          } else {
            this.showToastMessage('Failed to load sales persons. Please check console for details.', 'error');
          }
        }
      });
  }

  filterSalesPersons() { //
    if (!this.searchTerm) { //
      this.filteredSalesPersons = [...this.allSalesPersons]; //
    } else {
      const term = this.searchTerm.toLowerCase(); //
      this.filteredSalesPersons = this.allSalesPersons.filter(salesPerson => //
        (salesPerson.id && String(salesPerson.id).toLowerCase().includes(term)) || //
        (salesPerson.name && salesPerson.name.toLowerCase().includes(term)) || //
        (salesPerson.contact && salesPerson.contact.includes(term)) || //
        (salesPerson.email && salesPerson.email.toLowerCase().includes(term))
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

    this.filteredSalesPersons.sort((a, b) => { //
      let valueA: any, valueB: any; //

      switch(columnIndex) { //
        case 0: valueA = a.id; valueB = b.id; break; //
        case 1: valueA = a.name; valueB = b.name; break; //
        case 2: valueA = a.contact; valueB = b.contact; break; //
        case 3: valueA = a.currentSales; valueB = b.currentSales; break; //
        case 4: valueA = a.performanceRating; valueB = b.performanceRating; break; //
        default: return 0; //
      }

      if (typeof valueA === 'string' || typeof valueB === 'string') { //
        return (String(valueA ?? '')).localeCompare(String(valueB ?? '')) * this.sortDirection; //
      } else {
        return ((valueA || 0) - (valueB || 0)) * this.sortDirection; //
      }
    });
  }

  showViewForm(salesPerson: SalesPerson) { //
    console.log('Viewing salesperson:', salesPerson); // Debug log
    if (!salesPerson || !salesPerson.id) {
      console.error('Invalid salesperson data for view:', salesPerson);
      this.showToastMessage('Invalid salesperson data.', 'error');
      return;
    }
    
    this.selectedSalesPerson = { 
      id: salesPerson.id,
      name: salesPerson.name || '',
      contact: salesPerson.contact || '',
      email: salesPerson.email || '',
      salesTarget: Number(salesPerson.salesTarget || 0),
      currentSales: Number(salesPerson.currentSales || 0),
      performanceRating: Number(salesPerson.performanceRating || 0),
      dateAdded: salesPerson.dateAdded,
      password: '' // Don't show password in view
    }; 
    console.log('Selected salesperson for view:', this.selectedSalesPerson); // Debug log
    this.currentView = 'view'; //
    this.isEditMode = false; //
  }

  cancelForm() { //
    this.currentView = 'list'; //
  }

  downloadSalesPersons(type: 'excel' | 'pdf' | 'json') { //
    this.showDownloadOptions = false; //

    if (type === 'excel') { //
      this.exportToExcel(); //
    } else if (type === 'json') { //
      this.exportToJson(); //
    }
  }

  private exportToExcel() { //
    const headers = ["Sales ID", "Name", "Contact", "Email", "Sales Target", "Current Sales", "Performance Rating", "Date Added"]; //

    const data = this.filteredSalesPersons.map(salesPerson => [ //
      salesPerson.id, //
      salesPerson.name, //
      salesPerson.contact, //
      salesPerson.email, //
      `$${(salesPerson.salesTarget || 0).toFixed(2)}`, //
      `$${(salesPerson.currentSales || 0).toFixed(2)}`, //
      `${salesPerson.performanceRating || 0}%`, //
      salesPerson.dateAdded ? new Date(salesPerson.dateAdded).toLocaleDateString() : 'N/A'
    ]); //

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]); //
    const wb = XLSX.utils.book_new(); //
    XLSX.utils.book_append_sheet(wb, ws, "Sales Persons"); //
    XLSX.writeFile(wb, `SalesPersons_${new Date().toISOString().slice(0,10)}.xlsx`); //

    this.showToastMessage('Excel file downloaded successfully!', 'success'); //
  }

  private exportToJson() { //
    const dataStr = JSON.stringify(this.filteredSalesPersons, null, 2); //
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); //

    const exportFileDefaultName = `sales_persons_${new Date().toISOString().slice(0,10)}.json`; //

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
    this.selectedSalesPerson = { //
      id: 0, // Initialize as number
      name: '', //
      contact: '', //
      email: '', //
      password: '', // Initialize password for new sales person
      dateAdded: new Date(), //
      salesTarget: 0, //
      currentSales: 0, //
      performanceRating: 0 //
    };
    this.currentView = 'add'; //
    this.isEditMode = false; //
    this.showPassword = true; //
  }

  editSalesPerson(salesPerson: SalesPerson) { //
    console.log('Editing salesperson:', salesPerson); // Debug log
    if (!salesPerson || !salesPerson.id) {
      console.error('Invalid salesperson data for edit:', salesPerson);
      this.showToastMessage('Invalid salesperson data.', 'error');
      return;
    }
    
    this.selectedSalesPerson = { 
      id: salesPerson.id,
      name: salesPerson.name || '',
      contact: salesPerson.contact || '',
      email: salesPerson.email || '',
      salesTarget: Number(salesPerson.salesTarget || 0),
      currentSales: Number(salesPerson.currentSales || 0),
      performanceRating: Number(salesPerson.performanceRating || 0),
      dateAdded: salesPerson.dateAdded,
      password: '' // Don't pre-fill password for security
    }; 
    console.log('Selected salesperson for edit:', this.selectedSalesPerson); // Debug log
    this.currentView = 'edit'; //
    this.isEditMode = true; //
    this.showPassword = false; //
  }

  submitForm() { //
    if (!this.selectedSalesPerson) {
      this.showToastMessage('No salesperson data selected.', 'error');
      return;
    }

    // Validate form
    if (!this.selectedSalesPerson.name?.trim() ||
        !this.selectedSalesPerson.contact?.trim() ||
        !this.selectedSalesPerson.email?.trim() ||
        (this.currentView === 'add' && !this.selectedSalesPerson.password?.trim())) { //
      this.showToastMessage('Please fill all required fields', 'error'); //
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //
    if (!emailRegex.test(this.selectedSalesPerson.email)) { //
      this.showToastMessage('Please enter a valid email address', 'error'); //
      return;
    }

    // Validate contact number
    if (!/^\d{10}$/.test(this.selectedSalesPerson.contact)) { //
      this.showToastMessage('Contact number must be 10 digits', 'error'); //
      return;
    }

    // Validate numeric fields
    if ((this.selectedSalesPerson.salesTarget || 0) < 0 || 
        (this.selectedSalesPerson.currentSales || 0) < 0 || 
        (this.selectedSalesPerson.performanceRating || 0) < 0) {
      this.showToastMessage('Sales values cannot be negative', 'error');
      return;
    }

    if (this.currentView === 'add') { //
      // --- Add new sales person via Backend API ---
      const newSalesPersonPayload = {
        name: this.selectedSalesPerson.name?.trim(),
        contact: this.selectedSalesPerson.contact?.trim(),
        email: this.selectedSalesPerson.email?.trim(),
        password: this.selectedSalesPerson.password, // Include password for backend user creation
        salesTarget: Number(this.selectedSalesPerson.salesTarget || 0),
        currentSales: Number(this.selectedSalesPerson.currentSales || 0)
        // performanceRating is set by backend on creation, or can be added to payload if needed
      };

      console.log('Creating salesperson with payload:', newSalesPersonPayload); // Debug log

      this.http.post(`${environment.apiUrl}/salesperson/create`, newSalesPersonPayload, { withCredentials: true }) // <--- Make POST request
        .subscribe({
          next: (response: any) => {
            console.log('Create response:', response); // Debug log
            console.log('Response details:', {
              message: response.message,
              salesPersonId: response.salesPersonId,
              userId: response.userId,
              insertedData: response.insertedData
            }); // Debug log
            
            if (response.message === 'Salesperson created successfully') { // Check response message
              this.showToastMessage('Sales person added successfully!', 'success'); //
              console.log('Reloading salespersons list...'); // Debug log
              // Force reload with a slight delay to ensure database consistency
              setTimeout(() => {
                this.loadSalesPersons(); // Reload list from backend
              }, 500);
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to add sales person.', 'error');
            }
          },
          error: (err) => {
            console.error('Add sales person failed:', err);
            console.error('Error details:', {
              status: err.status,
              statusText: err.statusText,
              error: err.error,
              message: err.message
            }); // Additional debug info
            
            if (err.status === 409) {
              this.showToastMessage('A salesperson with this email already exists.', 'error');
            } else if (err.status === 401) {
              this.showToastMessage('Authentication required. Please login again.', 'error');
            } else if (err.status === 403) {
              this.showToastMessage('Access denied. Admin privileges required.', 'error');
            } else if (err.status === 400) {
              this.showToastMessage(err.error?.message || 'Invalid data provided.', 'error');
            } else if (err.status === 500) {
              const errorMsg = err.error?.message || 'Server error occurred while adding sales person.';
              this.showToastMessage(`Server Error: ${errorMsg}`, 'error');
            } else {
              this.showToastMessage(err.error?.message || 'Server error occurred while adding sales person.', 'error');
            }
          }
        });

    } else if (this.currentView === 'edit') { //
      // --- Update existing sales person via Backend API ---
      if (!this.selectedSalesPerson.id) {
        this.showToastMessage('Sales person ID is missing for update.', 'error');
        return;
      }
      
      const updatedSalesPersonPayload = {
        name: this.selectedSalesPerson.name?.trim(),
        contact: this.selectedSalesPerson.contact?.trim(),
        email: this.selectedSalesPerson.email?.trim(),
        salesTarget: Number(this.selectedSalesPerson.salesTarget || 0),
        currentSales: Number(this.selectedSalesPerson.currentSales || 0),
        performanceRating: Number(this.selectedSalesPerson.performanceRating || 0) // Include performance rating
      };

      console.log('Updating salesperson with payload:', updatedSalesPersonPayload); // Debug log
      console.log('Salesperson ID:', this.selectedSalesPerson.id); // Debug log

      this.http.put(`${environment.apiUrl}/salesperson/${this.selectedSalesPerson.id}`, updatedSalesPersonPayload, { withCredentials: true }) // <--- Make PUT request
        .subscribe({
          next: (response: any) => {
            console.log('Update response:', response); // Debug log
            if (response.message === 'Salesperson updated successfully') { // Check response message
              this.showToastMessage('Sales person updated successfully!', 'success'); //
              this.loadSalesPersons();
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to update sales person.', 'error');
            }
          },
          error: (err) => {
            console.error('Update sales person failed:', err);
            if (err.status === 404) {
              this.showToastMessage('Salesperson not found.', 'error');
            } else if (err.status === 409) {
              this.showToastMessage('Email already in use by another user.', 'error');
            } else if (err.status === 401) {
              this.showToastMessage('Authentication required. Please login again.', 'error');
            } else if (err.status === 403) {
              this.showToastMessage('Access denied. Admin privileges required.', 'error');
            } else {
              this.showToastMessage(err.error?.message || 'Server error occurred while updating sales person.', 'error');
            }
          }
        });
    }
  }

  deleteSalesPerson(id: string | number) { //
    if (confirm('Are you sure you want to delete this sales person?')) { //
      console.log('Deleting salesperson with ID:', id); // Debug log
      this.http.delete(`${environment.apiUrl}/salesperson/${id}`, { withCredentials: true }) // <--- Make DELETE request
        .subscribe({
          next: (response: any) => {
            console.log('Delete response:', response); // Debug log
            if (response.message === 'Salesperson deleted successfully') { // Check response message
              this.showToastMessage('Sales person deleted successfully!', 'success'); //
              this.loadSalesPersons(); // Reload list
              this.currentView = 'list'; //
            } else {
              this.showToastMessage(response.message || 'Failed to delete sales person.', 'error');
            }
          },
          error: (err) => {
            console.error('Delete sales person failed:', err);
            if (err.status === 404) {
              this.showToastMessage('Salesperson not found.', 'error');
            } else if (err.status === 401) {
              this.showToastMessage('Authentication required. Please login again.', 'error');
            } else if (err.status === 403) {
              this.showToastMessage('Access denied. Admin privileges required.', 'error');
            } else {
              this.showToastMessage(err.error?.message || 'Server error occurred while deleting sales person.', 'error');
            }
          }
        });
    }
  }

  togglePasswordVisibility() { //
    this.showPassword = !this.showPassword; //
  }
}