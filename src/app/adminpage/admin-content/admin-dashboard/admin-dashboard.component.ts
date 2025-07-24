import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inventoryChart') inventoryChartRef!: ElementRef<HTMLCanvasElement>;
  
  private salesChart!: Chart;
  private inventoryChart!: Chart;

  constructor() { }

  ngOnInit(): void {
    // Initialization moved to ngAfterViewInit
  }

  ngAfterViewInit(): void {
    this.initializeSalesChart();
    this.initializeInventoryChart();
  }

  private initializeSalesChart(): void {
    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: [3500, 4200, 5100, 4800],
          label: 'Sales',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 0.8)',
          fill: 'origin',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value;
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Sales: ₹' + context.raw;
              }
            }
          },
          legend: {
            display: false
          }
        }
      }
    });
  }

  private initializeInventoryChart(): void {
    const ctx = this.inventoryChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.inventoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'Low', 'Medium', 'High'],
        datasets: [{
          data: [12, 19, 15, 32],
          label: 'Items',
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',
            'rgba(234, 179, 8, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)'
          ],
          borderColor: [
            'rgba(239, 68, 68, 1)',
            'rgba(234, 179, 8, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.raw + ' items';
              }
            }
          }
        }
      }
    });
  }

  changeSalesGranularity(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    
    if (!this.salesChart) return;

    if (value === 'daily') {
      this.salesChart.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.salesChart.data.datasets[0].data = [1200, 1900, 1500, 2000, 1800, 2500, 2200];
    } else if (value === 'weekly') {
      this.salesChart.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      this.salesChart.data.datasets[0].data = [3500, 4200, 5100, 4800];
    } else if (value === 'monthly') {
      this.salesChart.data.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      this.salesChart.data.datasets[0].data = [15000, 16200, 18300, 17500, 19200, 21000];
    }
    this.salesChart.update();
  }

  changeInventoryView(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    
    if (!this.inventoryChart) return;

    if (value === 'category') {
      (this.inventoryChart.config as any).type = 'bar';
      this.inventoryChart.data.labels = ['Beverages', 'Snacks', 'Dairy', 'Groceries'];
      this.inventoryChart.data.datasets[0].data = [45, 32, 28, 40];
      this.inventoryChart.data.datasets[0].label = 'Items by Category';
    } else if (value === 'stock') {
      (this.inventoryChart.config as any).type = 'doughnut';
      this.inventoryChart.data.labels = ['Critical', 'Low', 'Medium', 'High'];
      this.inventoryChart.data.datasets[0].data = [12, 19, 15, 32];
      this.inventoryChart.data.datasets[0].label = 'Items by Stock Level';
    } else if (value === 'value') {
      (this.inventoryChart.config as any).type = 'pie';
      this.inventoryChart.data.labels = ['Beverages', 'Snacks', 'Dairy', 'Groceries'];
      this.inventoryChart.data.datasets[0].data = [125000, 85000, 92000, 110000];
      this.inventoryChart.data.datasets[0].label = 'Inventory Value (₹)';
    }
    this.inventoryChart.update();
  }
}