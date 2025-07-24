export interface SalesPerson {
  id: string; // Backend-generated ID
  name: string;
  contact: string;
  email: string;
  salesTarget?: number;
  currentSales?: number;
  performanceRating?: number;
  dateAdded?: Date; // Optional, as backend adds this

  // Added for creation via admin panel
  password?: string; // Needed for 'create'
  // If you want status/comments for salesperson like supplier, add them here
  // status?: string;
  // comments?: string;
}