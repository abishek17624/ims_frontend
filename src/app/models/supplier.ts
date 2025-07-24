export interface Supplier {
  id: string; // The backend might generate this, but frontend needs it for update/delete
  name: string;
  product: string;
  category: string;
  price: number;
  contact: string;
  email: string;
  returnPolicy: 'yes' | 'no';
  dateAdded?: Date; // Optional, as backend adds this

  // Added for creation via admin panel
  password?: string; // Optional because not all operations require it, but needed for 'create'
  status?: string; // Add default like 'active' or 'pending'
  comments?: string; // Optional comments field
}