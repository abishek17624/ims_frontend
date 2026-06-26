import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Invoice {
  invoice_id: number;
  order_id: number;
  supplier_id: number;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  invoiceStatus: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Order Details
  product_id: number;
  productName: string;
  quantity: number;
  unit: string;
  orderValue: number;
  productCategory: string;
  orderDate: string;
  deliveryDate: string;
  deliveryStatus: string;
  orderStatus: string;
  
  // Supplier Details
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
}

interface Customer {
  id: string;
  name: string;
}

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
    feelslike_c: number;
  };
}

interface OpenWeatherResponse {
  name: string;
  sys: {
    country: string;
  };
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

interface StockPrediction {
  category: string;
  productName: string;
  reason: string;
  demandIncrease: number; // percentage
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-admin-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-report.component.html',
  styleUrls: ['./admin-report.component.css']
})
export class AdminReportComponent implements OnInit {
  // Real invoice data from backend
  invoiceData: Invoice[] = [];

  customers: Customer[] = [];

  // Filter variables
  fromDate: string = '';
  toDate: string = '';
  statusFilter: string = '';
  customerFilter: string = '';
  searchTerm: string = '';
  amountMinFilter: number | null = null;
  amountMaxFilter: number | null = null;

  // Pagination variables
  currentPage: number = 1;
  recordsPerPage: number = 5;
  filteredInvoices: Invoice[] = [];
  paginatedInvoices: Invoice[] = [];
  totalPages: number = 1;

  // Stats variables
  totalInvoices: number = 0;
  paidInvoices: number = 0;
  pendingInvoices: number = 0;
  overdueInvoices: number = 0;
  totalRevenue: number = 0;

  // Modal variables
  selectedInvoice: Invoice | null = null;

  // Toast notification variables
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // Loading state
  isLoading: boolean = false;

  // Weather and stock prediction
  weatherData: WeatherData | null = null;
  stockPredictions: StockPrediction[] = [];
  weatherLoading: boolean = false;
  weatherError: string = '';

  // OpenWeatherMap free API (more reliable than WeatherAPI)
  private readonly WEATHER_API_KEY = 'b8c2e8f5e8a5b9c4b4a8e5f7a9c4d8e1'; // Demo key - replace with your own
  private readonly WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('AdminReportComponent - Constructor called');
    console.log('AdminReportComponent - Environment API URL:', environment.apiUrl);
  }

  ngOnInit(): void {
    console.log('AdminReportComponent - ngOnInit called');
    this.fetchInvoices();
    
    // Try to fetch real weather data, but fallback to mock data immediately
    this.generateMockWeatherDataFirst();
    this.attemptWeatherAPICall();
  }

  // Generate mock weather data first for immediate display
  generateMockWeatherDataFirst(): void {
    console.log('Generating initial mock weather data...');
    this.generateMockWeatherData();
  }

  // Attempt to fetch real weather data in background
  attemptWeatherAPICall(): void {
    this.weatherLoading = true;
    
    const city = 'Coimbatore';
    const country = 'IN';
    
    // Try with a public API key first (demo purposes)
    const publicApiKey = '8b2e8a6b5c9d4e8f3a7c2b5e9d8f4a1b'; // Demo key
    const url = `${this.WEATHER_API_URL}?q=${city},${country}&appid=${publicApiKey}&units=metric`;

    console.log('Attempting to fetch real weather data...');

    this.http.get<OpenWeatherResponse>(url).subscribe({
      next: (data) => {
        console.log('Successfully fetched real weather data:', data);
        
        // Transform and update with real data
        this.weatherData = {
          location: {
            name: data.name,
            region: 'Tamil Nadu',
            country: data.sys.country
          },
          current: {
            temp_c: Math.round(data.main.temp),
            temp_f: Math.round((data.main.temp * 9/5) + 32),
            condition: {
              text: this.capitalizeWords(data.weather[0].description),
              icon: data.weather[0].icon
            },
            humidity: data.main.humidity,
            wind_kph: Math.round(data.wind.speed * 3.6),
            feelslike_c: Math.round(data.main.feels_like)
          }
        };
        
        this.generateStockPredictions();
        this.weatherError = '';
        this.weatherLoading = false;
        this.showToast('Real weather data loaded successfully!', 'success');
      },
      error: (err) => {
        console.log('Real weather API failed, using mock data:', err.message);
        this.weatherError = 'Using simulated weather data for demo purposes';
        this.weatherLoading = false;
        // Mock data is already loaded, so predictions are already generated
      }
    });
  }

  // Fetch weather data and generate stock predictions
  fetchWeatherAndPredictions(): void {
    this.weatherLoading = true;
    this.weatherError = '';

    // Using Coimbatore as default location (can be made configurable)
    const city = 'Coimbatore';
    const country = 'IN';
    const url = `${this.WEATHER_API_URL}?q=${city},${country}&appid=${this.WEATHER_API_KEY}&units=metric`;

    console.log('Fetching weather data from:', url.replace(this.WEATHER_API_KEY, '[API_KEY]'));

    this.http.get<OpenWeatherResponse>(url).subscribe({
      next: (data) => {
        console.log('OpenWeather API response:', data);
        
        // Transform OpenWeatherMap response to our WeatherData interface
        this.weatherData = {
          location: {
            name: data.name,
            region: 'Tamil Nadu',
            country: data.sys.country
          },
          current: {
            temp_c: Math.round(data.main.temp),
            temp_f: Math.round((data.main.temp * 9/5) + 32),
            condition: {
              text: this.capitalizeWords(data.weather[0].description),
              icon: data.weather[0].icon
            },
            humidity: data.main.humidity,
            wind_kph: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            feelslike_c: Math.round(data.main.feels_like)
          }
        };
        
        console.log('Transformed weather data:', this.weatherData);
        this.generateStockPredictions();
        this.weatherLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch weather data:', err);
        console.error('Error details:', {
          status: err.status,
          message: err.message,
          error: err.error
        });
        
        if (err.status === 401) {
          this.weatherError = 'Weather API key is invalid. Using mock weather data.';
          this.generateMockWeatherData();
        } else if (err.status === 0) {
          this.weatherError = 'Unable to connect to weather service. Using mock weather data.';
          this.generateMockWeatherData();
        } else {
          this.weatherError = 'Failed to load weather data. Using mock weather data.';
          this.generateMockWeatherData();
        }
        
        this.weatherLoading = false;
      }
    });
  }

  // Generate mock weather data when API fails
  generateMockWeatherData(): void {
    // Generate realistic weather data for Coimbatore with seasonal variations
    const currentMonth = new Date().getMonth(); // 0-11
    
    let baseTemp = 28;
    let weatherOptions: Array<{text: string, humidity: number, iconSuffix: string}>;
    
    // Seasonal adjustments
    if (currentMonth >= 2 && currentMonth <= 5) { // March to June (Hot season)
      baseTemp = 32;
      weatherOptions = [
        { text: 'Hot and Sunny', humidity: 45, iconSuffix: 'd' },
        { text: 'Very Hot', humidity: 35, iconSuffix: 'd' },
        { text: 'Partly Cloudy', humidity: 55, iconSuffix: 'd' }
      ];
    } else if (currentMonth >= 6 && currentMonth <= 9) { // July to October (Monsoon)
      baseTemp = 26;
      weatherOptions = [
        { text: 'Light Rain', humidity: 85, iconSuffix: 'd' },
        { text: 'Heavy Rain', humidity: 90, iconSuffix: 'd' },
        { text: 'Cloudy', humidity: 80, iconSuffix: 'd' },
        { text: 'Thunderstorms', humidity: 88, iconSuffix: 'd' }
      ];
    } else { // November to February (Pleasant season)
      baseTemp = 24;
      weatherOptions = [
        { text: 'Pleasant', humidity: 60, iconSuffix: 'd' },
        { text: 'Partly Cloudy', humidity: 65, iconSuffix: 'd' },
        { text: 'Clear Sky', humidity: 50, iconSuffix: 'd' }
      ];
    }
    
    // Add some randomness
    const tempVariation = (Math.random() - 0.5) * 8; // ±4 degrees
    const finalTemp = Math.round(baseTemp + tempVariation);
    
    const randomCondition = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    const windSpeed = Math.floor(Math.random() * 15) + 5; // 5-20 km/h
    const feelsLikeDiff = Math.floor(Math.random() * 6) - 2; // ±2 degrees
    
    this.weatherData = {
      location: {
        name: 'Coimbatore',
        region: 'Tamil Nadu',
        country: 'IN'
      },
      current: {
        temp_c: finalTemp,
        temp_f: Math.round((finalTemp * 9/5) + 32),
        condition: {
          text: randomCondition.text,
          icon: `0${Math.floor(Math.random() * 4) + 1}${randomCondition.iconSuffix}`
        },
        humidity: randomCondition.humidity + Math.floor(Math.random() * 10) - 5,
        wind_kph: windSpeed,
        feelslike_c: finalTemp + feelsLikeDiff
      }
    };
    
    console.log(`Generated realistic mock weather data for ${this.getSeasonName(currentMonth)}:`, this.weatherData);
    this.generateStockPredictions();
  }

  // Get season name for logging
  getSeasonName(month: number): string {
    if (month >= 2 && month <= 5) return 'Hot Season';
    if (month >= 6 && month <= 9) return 'Monsoon Season';
    return 'Pleasant Season';
  }

  // Helper method to capitalize words
  capitalizeWords(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  // Generate stock predictions based on weather conditions
  generateStockPredictions(): void {
    if (!this.weatherData) {
      this.generateDefaultPredictions();
      return;
    }

    const predictions: StockPrediction[] = [];
    const temp = this.weatherData.current.temp_c;
    const condition = this.weatherData.current.condition.text.toLowerCase();
    const humidity = this.weatherData.current.humidity;

    // Hot weather predictions (>30°C)
    if (temp > 30) {
      predictions.push({
        category: 'Beverages',
        productName: 'Cold Drinks & Ice Creams',
        reason: `High temperature (${temp}°C) increases demand for cold beverages and frozen items`,
        demandIncrease: 85,
        icon: 'fas fa-thermometer-full',
        priority: 'high'
      });
      
      predictions.push({
        category: 'Electronics',
        productName: 'Air Conditioners & Fans',
        reason: 'Hot weather drives up cooling appliance sales',
        demandIncrease: 70,
        icon: 'fas fa-wind',
        priority: 'high'
      });
    }

    // Cold weather predictions (<15°C)
    if (temp < 15) {
      predictions.push({
        category: 'Clothing',
        productName: 'Winter Wear & Blankets',
        reason: `Cold temperature (${temp}°C) increases demand for warm clothing`,
        demandIncrease: 80,
        icon: 'fas fa-snowflake',
        priority: 'high'
      });
      
      predictions.push({
        category: 'Beverages',
        productName: 'Hot Beverages & Soups',
        reason: 'Cold weather increases hot drink consumption',
        demandIncrease: 60,
        icon: 'fas fa-mug-hot',
        priority: 'medium'
      });
    }

    // Rainy weather predictions
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      predictions.push({
        category: 'Accessories',
        productName: 'Umbrellas & Raincoats',
        reason: 'Rainy weather increases protective gear demand',
        demandIncrease: 90,
        icon: 'fas fa-umbrella',
        priority: 'high'
      });
      
      predictions.push({
        category: 'Food',
        productName: 'Comfort Food & Snacks',
        reason: 'Rainy weather increases indoor food consumption',
        demandIncrease: 45,
        icon: 'fas fa-cookie-bite',
        priority: 'medium'
      });
    }

    // High humidity predictions (>70%)
    if (humidity > 70) {
      predictions.push({
        category: 'Personal Care',
        productName: 'Deodorants & Body Care',
        reason: `High humidity (${humidity}%) increases personal care product usage`,
        demandIncrease: 55,
        icon: 'fas fa-spray-can',
        priority: 'medium'
      });
    }

    // Sunny/Clear weather predictions
    if (condition.includes('sunny') || condition.includes('clear')) {
      predictions.push({
        category: 'Outdoor',
        productName: 'Sunglasses & Sunscreen',
        reason: 'Sunny weather increases outdoor activity and sun protection needs',
        demandIncrease: 65,
        icon: 'fas fa-sun',
        priority: 'medium'
      });
    }

    // Pleasant weather (20-28°C)
    if (temp >= 20 && temp <= 28) {
      predictions.push({
        category: 'Sports',
        productName: 'Outdoor Sports Equipment',
        reason: `Pleasant temperature (${temp}°C) encourages outdoor activities`,
        demandIncrease: 40,
        icon: 'fas fa-futbol',
        priority: 'low'
      });
    }

    // Sort by priority and demand increase
    this.stockPredictions = predictions.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.demandIncrease - a.demandIncrease;
    });

    console.log('Generated stock predictions:', this.stockPredictions);
  }

  // Generate default predictions when weather data is unavailable
  generateDefaultPredictions(): void {
    this.stockPredictions = [
      {
        category: 'Electronics',
        productName: 'Fans & Cooling Devices',
        reason: 'Summer season typically increases demand for cooling products',
        demandIncrease: 45,
        icon: 'fas fa-fan',
        priority: 'medium'
      },
      {
        category: 'Beverages',
        productName: 'Refreshing Drinks',
        reason: 'Consistent demand for beverages throughout the year',
        demandIncrease: 35,
        icon: 'fas fa-glass-water',
        priority: 'medium'
      },
      {
        category: 'Personal Care',
        productName: 'Skincare Products',
        reason: 'General health and hygiene awareness drives demand',
        demandIncrease: 25,
        icon: 'fas fa-soap',
        priority: 'low'
      },
      {
        category: 'Food',
        productName: 'Snacks & Quick Meals',
        reason: 'Steady demand for convenient food options',
        demandIncrease: 30,
        icon: 'fas fa-cookie-bite',
        priority: 'low'
      }
    ];
    
    console.log('Generated default predictions:', this.stockPredictions);
  }

  // Refresh weather data and predictions
  refreshWeatherPredictions(): void {
    // Always generate new mock data with slight variations
    this.generateMockWeatherData();
    this.showToast('Weather predictions refreshed with updated data!', 'success');
    
    // Optionally try to fetch real data in background
    this.attemptWeatherAPICall();
  }

  // Get weather condition icon class
  getWeatherIcon(condition: string): string {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return 'fas fa-sun text-yellow-500';
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return 'fas fa-cloud-rain text-blue-500';
    } else if (conditionLower.includes('cloud')) {
      return 'fas fa-cloud text-gray-500';
    } else if (conditionLower.includes('snow')) {
      return 'fas fa-snowflake text-blue-300';
    } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return 'fas fa-bolt text-purple-500';
    } else {
      return 'fas fa-cloud-sun text-gray-400';
    }
  }

  // Get priority badge class
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Get count of high priority predictions
  getHighPriorityCount(): number {
    return this.stockPredictions.filter(p => p.priority === 'high').length;
  }

  // Fetch invoices from backend
  fetchInvoices(): void {
    console.log('AdminReportComponent - Fetching invoices from backend...');
    this.isLoading = true;

    this.http.get<Invoice[]>(`${environment.apiUrl}/invoice`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          console.log('AdminReportComponent - Raw invoice data received:', data);
          console.log('AdminReportComponent - Number of invoices received:', data?.length || 0);
          
          if (data && Array.isArray(data)) {
            this.invoiceData = data.map(invoice => ({
              ...invoice,
              // Ensure amounts are numbers
              amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount as string) : invoice.amount,
              orderValue: typeof invoice.orderValue === 'string' ? parseFloat(invoice.orderValue as string) : invoice.orderValue
            }));
            
            console.log('AdminReportComponent - Processed invoice data:', this.invoiceData);
            
            // Extract unique customers from invoices
            this.extractCustomers();
            
            this.updateStats();
            this.filterInvoices();
            
            if (this.invoiceData.length === 0) {
              this.showToast('No invoices found in the system.', 'info');
            } else {
              console.log(`AdminReportComponent - Loaded ${this.invoiceData.length} invoices successfully`);
              this.showToast(`Loaded ${this.invoiceData.length} invoices successfully!`, 'success');
            }
          } else {
            console.error('AdminReportComponent - Invalid response format:', data);
            this.showToast('Invalid response format from server.', 'error');
          }
        },
        error: (err) => {
          console.error('AdminReportComponent - Failed to fetch invoices:', err);
          console.error('AdminReportComponent - Error status:', err.status);
          console.error('AdminReportComponent - Error message:', err.message);
          console.error('AdminReportComponent - Error details:', err.error);
          
          let errorMessage = 'Failed to load invoices.';
          if (err.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (err.status === 403) {
            errorMessage = 'You are not authorized to view invoices.';
          } else if (err.status === 0) {
            errorMessage = 'Cannot connect to server. Please check if the backend is running.';
          } else if (err.error?.message) {
            errorMessage += ' Error: ' + err.error.message;
          }
          
          this.showToast(errorMessage, 'error');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // Extract unique customers from invoice data
  extractCustomers(): void {
    const uniqueSuppliers = new Map<string, string>();
    
    this.invoiceData.forEach(invoice => {
      if (invoice.supplierName && !uniqueSuppliers.has(invoice.supplier_id.toString())) {
        uniqueSuppliers.set(invoice.supplier_id.toString(), invoice.supplierName);
      }
    });
    
    this.customers = Array.from(uniqueSuppliers.entries()).map(([id, name]) => ({
      id: id,
      name: name
    }));
    
    console.log('Extracted customers:', this.customers);
  }

  // Filter invoices based on selected filters
  filterInvoices(): void {
    this.filteredInvoices = this.invoiceData.filter(invoice => {
      // Filter by search term (invoice ID, supplier name, or product name)
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const searchLower = this.searchTerm.toLowerCase().trim();
        const matchesSearch = 
          invoice.invoice_id.toString().includes(searchLower) ||
          invoice.supplierName?.toLowerCase().includes(searchLower) ||
          invoice.productName?.toLowerCase().includes(searchLower) ||
          invoice.order_id.toString().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filter by date range
      if (this.fromDate && invoice.invoiceDate < this.fromDate) return false;
      if (this.toDate && invoice.invoiceDate > this.toDate) return false;
      
      // Filter by status
      if (this.statusFilter && invoice.invoiceStatus !== this.statusFilter) return false;
      
      // Filter by customer
      if (this.customerFilter) {
        const customer = this.customers.find(c => c.id === this.customerFilter);
        if (customer && invoice.supplierName !== customer.name) return false;
      }
      
      // Filter by amount range
      if (this.amountMinFilter !== null && invoice.amount < this.amountMinFilter) return false;
      if (this.amountMaxFilter !== null && invoice.amount > this.amountMaxFilter) return false;
      
      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.showToast(`Found ${this.filteredInvoices.length} matching invoices`, 'info');
  }

  // Auto-filter as user types (debounced)
  onSearchChange(): void {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Set new timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      this.filterInvoices();
    }, 300);
  }

  private searchTimeout: any;

  // Reset all filters
  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.customerFilter = '';
    this.searchTerm = '';
    this.amountMinFilter = null;
    this.amountMaxFilter = null;
    
    // Clear search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.filteredInvoices = [...this.invoiceData];
    this.currentPage = 1;
    this.updatePagination();
    this.showToast('All filters cleared', 'success');
  }

  // Update pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredInvoices.length / this.recordsPerPage);
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = Math.min(startIndex + this.recordsPerPage, this.filteredInvoices.length);
    this.paginatedInvoices = this.filteredInvoices.slice(startIndex, endIndex);
  }

  // Get pages for pagination
  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Go to specific page
  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  // Go to previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  // Go to next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // Get showing from number
  get showingFrom(): number {
    return (this.currentPage - 1) * this.recordsPerPage + 1;
  }

  // Get showing to number
  get showingTo(): number {
    return Math.min(this.currentPage * this.recordsPerPage, this.filteredInvoices.length);
  }

  // Update stats
  updateStats(): void {
    this.totalInvoices = this.invoiceData.length;
    this.paidInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'paid').length;
    this.pendingInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'pending').length;
    this.overdueInvoices = this.invoiceData.filter(inv => inv.invoiceStatus === 'overdue').length;
    this.totalRevenue = this.invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
  }

  // View invoice details
  viewInvoice(invoiceNumber: string): void {
    this.selectedInvoice = this.invoiceData.find(inv => inv.invoice_id.toString() === invoiceNumber) || null;
  }

  // Close invoice modal
  closeInvoiceModal(): void {
    this.selectedInvoice = null;
  }

   // Print invoice with proper styling
  printInvoice(): void {
    // Hide action buttons and modal background for printing
    const printContent = this.getPrintableInvoiceContent();
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore Angular bindings
  }

  // Download current invoice shown in modal
  async downloadCurrentInvoice(): Promise<void> {
    if (!this.selectedInvoice) {
      this.showToast('No invoice selected for download', 'error');
      return;
    }

    try {
      this.showToast(`Preparing invoice ${this.selectedInvoice.invoice_id} for download...`, 'info');
      
      // Create a temporary container with print styles
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = this.getPrintableInvoiceContent();
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      document.body.appendChild(tempContainer);

      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20; // Account for margins

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`invoice_${this.selectedInvoice.invoice_id}.pdf`);
      this.showToast(`Invoice ${this.selectedInvoice.invoice_id} downloaded successfully!`, 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.showToast('Failed to generate PDF. Please try again.', 'error');
    }
  }

  // Download invoice as PDF
  downloadInvoice(invoiceNumber: string): void {
    const invoice = this.invoiceData.find(inv => inv.invoice_id.toString() === invoiceNumber);
    if (invoice) {
      this.selectedInvoice = invoice;
      this.downloadCurrentInvoice();
    } else {
      this.showToast(`Invoice ${invoiceNumber} not found`, 'error');
    }
  }

  /**
   * Gets current date in a formatted string.
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Generates printable HTML content for invoice with proper styling.
   */
  private getPrintableInvoiceContent(): string {
    if (!this.selectedInvoice) return '';
    
    const currentDate = this.getCurrentDate();
    const subtotal = this.selectedInvoice.amount - 250 - (this.selectedInvoice.amount * 0.18); // Assuming 18% tax and 250 shipping
    const tax = this.selectedInvoice.amount * 0.18;
    const unitPrice = this.selectedInvoice.orderValue ? (this.selectedInvoice.orderValue / this.selectedInvoice.quantity) : 0;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${this.selectedInvoice.invoice_id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
          }
          
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20px;
          }
          
          .company-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .company-logo {
            width: 60px;
            height: 60px;
            margin-right: 20px;
            border-radius: 8px;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          
          .company-info h1 {
            font-size: 28px;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .company-info p {
            color: #6b7280;
            font-size: 14px;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          .bill-to, .company-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .bill-to h3, .company-details h3 {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .bill-to p, .company-details p {
            margin-bottom: 5px;
            color: #4b5563;
          }
          
          .order-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          
          .info-item {
            text-align: center;
          }
          
          .info-item .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .info-item .value {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
          }
          
          .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #dbeafe; color: #1d4ed8; }
          .status-overdue { background: #fee2e2; color: #dc2626; }
          .status-cancelled { background: #f3f4f6; color: #374151; }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .items-table th {
            background: #2563eb;
            color: white;
            padding: 15px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          
          .items-table td {
            padding: 15px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          
          .items-table tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          
          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }
          
          .totals-table td {
            padding: 8px 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .totals-table .total-row {
            background: #f3f4f6;
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #2563eb;
          }
          
          .payment-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #10b981;
          }
          
          .payment-info h3 {
            color: #1f2937;
            margin-bottom: 15px;
            font-size: 16px;
          }
          
          .payment-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .payment-item .label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 3px;
          }
          
          .payment-item .value {
            font-weight: 600;
            color: #1f2937;
          }
          
          .notes-section {
            background: #fef7cd;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          }
          
          .notes-section h3 {
            color: #92400e;
            margin-bottom: 10px;
          }
          
          .notes-section p {
            color: #78350f;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
            }
            .invoice-container {
              padding: 0;
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Company Header -->
          <div class="company-header">
            <div class="company-logo">IMS</div>
            <div class="company-info">
              <h1>StockEasy</h1>
              <p>Inventory Management System</p>
              <p>Tiruvenkata Street, Coimbatore, TN 637001, India</p>
              <p>Phone: +91 9876543210 | Email: info&#64;stockeasy.com</p>
            </div>
          </div>

          <!-- Invoice Header -->
          <div class="invoice-header">
            <div>
              <div class="invoice-title">INVOICE</div>
              <p><strong>Invoice #:</strong> ${this.selectedInvoice.invoice_id}</p>
              <p><strong>Order #:</strong> ${this.selectedInvoice.order_id}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Status:</strong> 
                <span class="status-badge status-${this.selectedInvoice.invoiceStatus?.toLowerCase() || 'pending'}">
                  ${this.getStatusText(this.selectedInvoice.invoiceStatus)}
                </span>
              </p>
            </div>
          </div>

          <!-- Billing Details -->
          <div class="invoice-details">
            <div class="company-details">
              <h3>From</h3>
              <p><strong>StockEasy Pvt Ltd</strong></p>
              <p>Tiruvenkata Street</p>
              <p>Coimbatore, TN 637001</p>
              <p>India</p>
              <p><strong>GSTIN:</strong> 22ABCDE1234F1Z5</p>
              <p><strong>Phone:</strong> +91 9876543210</p>
              <p><strong>Email:</strong> accounts&#64;stockeasy.com</p>
            </div>
            
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>${this.selectedInvoice.supplierName || 'N/A'}</strong></p>
              <p>${this.getSupplierAddress(this.selectedInvoice.supplierName)}</p>
              <p>India</p>
              <p><strong>GSTIN:</strong> ${this.getSupplierGstin(this.selectedInvoice.supplierName)}</p>
              <p><strong>Phone:</strong> ${this.selectedInvoice.supplierPhone || 'N/A'}</p>
              <p><strong>Email:</strong> ${this.selectedInvoice.supplierEmail || 'N/A'}</p>
            </div>
          </div>

          <!-- Order Information -->
          <div class="order-info">
            <div class="info-item">
              <div class="label">Invoice Date</div>
              <div class="value">${new Date(this.selectedInvoice.invoiceDate).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="info-item">
              <div class="label">Due Date</div>
              <div class="value">${new Date(this.selectedInvoice.dueDate).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="info-item">
              <div class="label">Category</div>
              <div class="value">${this.selectedInvoice.productCategory || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Order Status</div>
              <div class="value">${this.selectedInvoice.orderStatus || 'N/A'}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PRD-${this.selectedInvoice.product_id?.toString().padStart(3, '0') || '001'}</td>
                <td>
                  <strong>${this.selectedInvoice.productName || 'N/A'}</strong><br>
                  <small>Category: ${this.selectedInvoice.productCategory || 'N/A'}</small>
                </td>
                <td>${this.selectedInvoice.quantity || '0'} ${this.selectedInvoice.unit || 'Units'}</td>
                <td>₹${unitPrice.toFixed(2)}</td>
                <td>₹${(this.selectedInvoice.orderValue || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>SHIP001</td>
                <td><strong>Shipping & Handling</strong></td>
                <td>1</td>
                <td>₹250.00</td>
                <td>₹250.00</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Shipping:</td>
                <td style="text-align: right;">₹250.00</td>
              </tr>
              <tr>
                <td>Tax (18%):</td>
                <td style="text-align: right;">₹${tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td style="text-align: right;">₹${this.selectedInvoice.amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Information -->
          <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="payment-grid">
              <div class="payment-item">
                <div class="label">Payment Method</div>
                <div class="value">Bank Transfer</div>
              </div>
              <div class="payment-item">
                <div class="label">Account Number</div>
                <div class="value">1234567890</div>
              </div>
              <div class="payment-item">
                <div class="label">Bank Name</div>
                <div class="value">Business Bank</div>
              </div>
              <div class="payment-item">
                <div class="label">IFSC Code</div>
                <div class="value">BUSI0123456</div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="notes-section">
            <h3>Terms & Conditions</h3>
            <p>Thank you for your business. Please make payment within 15 days of receiving this invoice. For any questions regarding this invoice, please contact our accounts department at accounts&#64;stockeasy.com or call +91 9876543210.</p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>Generated on ${currentDate} | StockEasy Inventory Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gets supplier address based on supplier name.
   */
  getSupplierAddress(supplierName: string): string {
    switch(supplierName) {
      case 'Supplier X': return '456 Supplier Avenue, Mumbai, MH 400001';
      case 'Supplier Y': return '789 Vendor Road, Delhi, DL 110001';
      case 'Supplier Z': return '321 Distributor Lane, Chennai, TN 600001';
      case 'Supplier A': return '654 Wholesale Street, Hyderabad, TS 500001';
      case 'Supplier B': return '987 Trade Boulevard, Kolkata, WB 700001';
      default: return 'Address not available';
    }
  }

  /**
   * Gets supplier GSTIN based on supplier name.
   */
  getSupplierGstin(supplierName: string): string {
    switch(supplierName) {
      case 'Supplier X': return '33XYZWV9876G2H7';
      case 'Supplier Y': return '44PQRSM6543K9L8';
      case 'Supplier Z': return '55TUVWX3210N7M6';
      case 'Supplier A': return '66LMNOP9876K5J4';
      case 'Supplier B': return '77QRSTU5432V1W0';
      default: return 'GSTIN not available';
    }
  }

  // Send payment reminder
  sendReminder(): void {
    if (this.selectedInvoice) {
      this.showToast(`Payment reminder sent for invoice ${this.selectedInvoice.invoice_id}`, 'success');
      this.closeInvoiceModal();
    }
  }

  // Get status text for display
  getStatusText(status: string): string {
    switch(status) {
      case 'paid': return '✅ Paid';
      case 'pending': return '⏳ Pending';
      case 'overdue': return '⚠️ Overdue';
      case 'cancelled': return '❌ Cancelled';
      default: return status;
    }
  }

  // Helper methods for filter display
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.fromDate || this.toDate || 
              this.statusFilter || this.customerFilter || 
              this.amountMinFilter !== null || this.amountMaxFilter !== null);
  }

  getCustomerName(customerId: string): string {
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? customer.name : customerId;
  }

  // Get client info for modal
  getClientInfo(customer: string): string {
    switch(customer) {
      case 'Supplier X':
        return `
          <p class="font-medium">Supplier X</p>
          <p class="text-gray-600">456 Supplier Avenue</p>
          <p class="text-gray-600">Mumbai, MH 400001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 33XYZWV9876G2H7</p>
          <p class="text-gray-600">Phone: 9876543210</p>
          <p class="text-gray-600">Email: contact@supplierx.com</p>
        `;
      case 'Supplier Y':
        return `
          <p class="font-medium">Supplier Y</p>
          <p class="text-gray-600">789 Vendor Road</p>
          <p class="text-gray-600">Delhi, DL 110001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 44PQRSM6543K9L8</p>
          <p class="text-gray-600">Phone: 9876543211</p>
          <p class="text-gray-600">Email: contact@suppliery.com</p>
        `;
      case 'Supplier Z':
        return `
          <p class="font-medium">Supplier Z</p>
          <p class="text-gray-600">321 Distributor Lane</p>
          <p class="text-gray-600">Chennai, TN 600001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 55TUVWX3210N7M6</p>
          <p class="text-gray-600">Phone: 9876543212</p>
          <p class="text-gray-600">Email: contact@supplierz.com</p>
        `;
      case 'Supplier A':
        return `
          <p class="font-medium">Supplier A</p>
          <p class="text-gray-600">654 Wholesale Street</p>
          <p class="text-gray-600">Hyderabad, TS 500001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 66LMNOP9876K5J4</p>
          <p class="text-gray-600">Phone: 9876543213</p>
          <p class="text-gray-600">Email: contact@suppliera.com</p>
        `;
      case 'Supplier B':
        return `
          <p class="font-medium">Supplier B</p>
          <p class="text-gray-600">987 Trade Boulevard</p>
          <p class="text-gray-600">Kolkata, WB 700001</p>
          <p class="text-gray-600">India</p>
          <p class="text-gray-600 mt-2">GSTIN: 77QRSTU5432V1W0</p>
          <p class="text-gray-600">Phone: 9876543214</p>
          <p class="text-gray-600">Email: contact@supplierb.com</p>
        `;
      default:
        return '';
    }
  }

  // Show toast notification
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    
    // Clear previous timeout if exists
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    // Auto-hide after 3 seconds
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  // Hide toast notification
  hideToast(): void {
    this.toastMessage = '';
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
}