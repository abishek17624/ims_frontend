import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-supplier-dashboard',
  standalone: true,
  imports: [CommonModule,FormsModule, RouterLink],
  templateUrl: './supplier-dashboard.component.html',
  styleUrl: './supplier-dashboard.component.css'
})
export class SupplierDashboardComponent implements OnInit   {

  ordersData = [
    { id: '#ORD-1001', customer: 'John Doe', date: '2025-04-10', amount: '₹1,250', status: 'completed' },
    { id: '#ORD-1002', customer: 'Jane Smith', date: '2025-04-09', amount: '₹2,340', status: 'pending' },
    { id: '#ORD-1003', customer: 'Robert Johnson', date: '2025-04-08', amount: '₹3,150', status: 'completed' },
    { id: '#ORD-1004', customer: 'Emily Davis', date: '2025-04-07', amount: '₹1,890', status: 'completed' },
    { id: '#ORD-1005', customer: 'Michael Wilson', date: '2025-04-06', amount: '₹2,750', status: 'pending' },
    { id: '#ORD-1006', customer: 'Sarah Brown', date: '2025-04-05', amount: '₹1,430', status: 'cancelled' },
    { id: '#ORD-1007', customer: 'David Taylor', date: '2025-04-04', amount: '₹3,200', status: 'completed' },
    { id: '#ORD-1008', customer: 'Jennifer Martinez', date: '2025-04-03', amount: '₹2,100', status: 'completed' },
    { id: '#ORD-1009', customer: 'William Anderson', date: '2025-04-02', amount: '₹1,650', status: 'pending' },
    { id: '#ORD-1010', customer: 'Lisa Thomas', date: '2025-04-01', amount: '₹2,900', status: 'completed' }
  ];

  currentPage = 1;
  rowsPerPage = 5;
  filteredData = [...this.ordersData];
  statusFilter = 'all';
  fromDate = '';
  toDate = '';

  ngOnInit(): void {
    Chart.register(...registerables);
    this.initCharts();
    this.renderOrdersTable();
  }

  initCharts(): void {
    // Orders Trend Chart
    const ordersCtx = document.getElementById('ordersChart') as HTMLCanvasElement;
    new Chart(ordersCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Orders',
          data: [150, 210, 180, 240, 280, 320],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Order Status Chart
    const statusCtx = document.getElementById('statusChart') as HTMLCanvasElement;
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Cancelled'],
        datasets: [{
          data: [70, 25, 5],
          backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right' } },
        cutout: '70%'
      }
    });
  }

  confirmLogout(): void {
    const confirmed = confirm("Supplier, do you want to logout? ⚠️");
    if (confirmed) {
      // Implement your logout logic here
      console.log('Logging out...');
      // window.location.href = "/src/login/login.html";
    }
  }

  renderOrdersTable(): { id: string; customer: string; date: string; amount: string; status: string; }[] {
    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    const paginatedData = this.filteredData.slice(startIndex, endIndex);

    // Update pagination info
    const paginationInfo = `Showing ${startIndex + 1} to ${Math.min(endIndex, this.filteredData.length)} of ${this.filteredData.length} entries`;
    
    // Disable/enable pagination buttons would be handled in template with property binding
    return paginatedData;
  }

  filterOrders(): void {
    this.filteredData = this.ordersData.filter(order => {
      // Status filter
      if (this.statusFilter !== 'all' && order.status !== this.statusFilter) {
        return false;
      }
      
      // Date range filter
      if (this.fromDate && order.date < this.fromDate) {
        return false;
      }
      if (this.toDate && order.date > this.toDate) {
        return false;
      }
      
      return true;
    });

    // Reset to first page when filters change
    this.currentPage = 1;
  }

  exportData(): void {
    // Convert data to CSV
    let csv = 'Order ID,Customer,Date,Amount,Status\n';
    this.filteredData.forEach(order => {
      csv += `${order.id},${order.customer},${order.date},${order.amount.replace('₹', '')},${order.status}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage * this.rowsPerPage < this.filteredData.length) {
      this.currentPage++;
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch(status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  }

  getPaginationInfo(): string {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    return `Showing ${startIndex + 1} to ${Math.min(endIndex, this.filteredData.length)} of ${this.filteredData.length} entries`;
  }

  isPrevDisabled(): boolean {
    return this.currentPage === 1;
  }

  isNextDisabled(): boolean {
    return (this.currentPage * this.rowsPerPage) >= this.filteredData.length;
  }
}

