export interface SalesPerson {
  id: string | number; // Backend returns number, frontend sometimes uses string
  name: string;
  contact: string;
  email: string;
  salesTarget?: number;
  currentSales?: number;
  performanceRating?: number;
  dateAdded?: Date | string; // Can be Date object or string from backend

  // Added for creation via admin panel
  password?: string; // Needed for 'create'
  // If you want status/comments for salesperson like supplier, add them here
  // status?: string;
  // comments?: string;
}