# IMS (Inventory Management System)

A comprehensive full-stack inventory management system built with Angular 17+ frontend and Node.js backend, designed to streamline inventory operations for businesses.

## 🚀 Project Overview

This IMS application provides a complete solution for managing inventory, orders, suppliers, and sales personnel with role-based access control and real-time data synchronization.

## 🛠️ Technology Stack

### Frontend
- **Angular 17+** - Modern TypeScript framework
- **Angular Material** - UI component library
- **Chart.js** - Data visualization
- **XLSX** - Excel export functionality
- **Bootstrap** - Responsive design
- **Karma/Jasmine** - Unit testing (165+ passing tests)

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **Bcrypt** - Password encryption

## 🏗️ System Architecture

```
Frontend (Angular) ←→ REST API (Node.js/Express) ←→ Database (MySQL)
     ↓                        ↓                         ↓
  Components              Controllers                Tables
  Services               Middlewares               Relationships
  Guards                    Routes                 Procedures
```

## 🎯 Core Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (Admin, Supplier)
- **Secure route protection** with guards
- **Password encryption** and validation
- **Session management** with localStorage

**Backend Connectivity:**
```typescript
// Authentication Service
POST /api/auth/login    - User login
POST /api/auth/register - User registration  
POST /api/auth/refresh  - Token refresh
POST /api/auth/logout   - User logout
```

### 👤 User Management

#### Admin Dashboard
- **Real-time analytics** with interactive charts
- **Inventory overview** and stock alerts
- **Order tracking** and status management
- **Revenue reporting** with date filters
- **System health monitoring**

**Features:**
- Dynamic chart rendering (Line, Bar, Doughnut)
- Responsive grid layouts
- Export functionality (PDF, Excel)
- Real-time data updates

**Backend Connectivity:**
```typescript
GET /api/admin/dashboard     - Dashboard statistics
GET /api/admin/analytics     - Chart data
GET /api/admin/reports       - Generate reports
```

#### Supplier Portal
- **Order management** interface
- **Invoice generation** and tracking
- **Profile management**
- **Product catalog** access
- **Communication tools**

### 📦 Inventory Management

#### Product Management
- **CRUD operations** for products
- **Category management** with hierarchical structure
- **Stock tracking** with threshold alerts
- **Bulk import/export** via Excel
- **Image uploads** with preview
- **Barcode generation**

**Key Components:**
- `AdminInventoryComponent` - Main inventory interface
- `ProductService` - API communication layer
- `CategoryService` - Category management

**Backend Connectivity:**
```typescript
GET    /api/product/all         - List all products
POST   /api/product/add         - Add new product
PUT    /api/product/:id         - Update product
DELETE /api/product/:id         - Delete product
GET    /api/category            - Get categories
POST   /api/product/upload      - Bulk upload
```

#### Stock Management
- **Real-time stock levels**
- **Low stock alerts**
- **Stock movement tracking**
- **Inventory valuation**
- **Reorder point management**

### 🛒 Order Management

#### Order Processing
- **Order creation** and editing
- **Status tracking** (Pending, Processing, Shipped, Delivered)
- **Multi-supplier orders**
- **Order history** and analytics
- **Invoice generation**

**Order Workflow:**
1. Create Order → 2. Supplier Approval → 3. Processing → 4. Shipping → 5. Delivery

**Backend Connectivity:**
```typescript
GET    /api/orders             - List orders
POST   /api/orders/add         - Create order
PUT    /api/orders/:id         - Update order
DELETE /api/orders/:id         - Delete order
GET    /api/orders/supplier/:id - Supplier orders
```

#### Invoice Management
- **Automated invoice generation**
- **PDF export** functionality
- **Payment tracking**
- **Tax calculations**
- **Billing history**

### 👥 Supplier Management

#### Supplier Operations
- **Supplier registration** and verification
- **Profile management**
- **Performance tracking**
- **Communication portal**
- **Contract management**

**Backend Connectivity:**
```typescript
GET    /api/supplier           - List suppliers
POST   /api/supplier/add       - Add supplier
PUT    /api/supplier/:id       - Update supplier
DELETE /api/supplier/:id       - Delete supplier
GET    /api/supplier/orders/:id - Supplier orders
```

### 👨‍💼 Sales Personnel Management

#### Team Management
- **Salesperson registration**
- **Performance metrics**
- **Territory management**
- **Commission tracking**
- **Target setting**

**Backend Connectivity:**
```typescript
GET    /api/salesperson        - List salespeople
POST   /api/salesperson/add    - Add salesperson
PUT    /api/salesperson/:id    - Update salesperson
DELETE /api/salesperson/:id    - Delete salesperson
```

### 📊 Reporting & Analytics

#### Advanced Reports
- **Sales reports** with filtering
- **Inventory reports**
- **Supplier performance**
- **Financial summaries**
- **Custom date ranges**

**Export Formats:**
- PDF reports
- Excel spreadsheets
- CSV data files

### 🎨 Content Management

#### Dynamic Content
- **Homepage content** management
- **Feature descriptions**
- **About page** content
- **Media uploads**
- **SEO optimization**

**Backend Connectivity:**
```typescript
GET    /api/content/home       - Homepage content
PUT    /api/content/home       - Update homepage
GET    /api/content/features   - Features content
GET    /api/content/about      - About content
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Angular CLI (v17+)
- MySQL (v8+)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/abishek17624/ims.git
cd ims
```

2. **Install frontend dependencies**
```bash
cd i_m_s
npm install
```

3. **Install backend dependencies**
```bash
cd ../ims_backend
npm install
```

4. **Database setup**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE ims_db;

# Import schema (if available)
mysql -u root -p ims_db < database/schema.sql
```

5. **Environment configuration**
```bash
# Backend environment
cp .env.example .env
# Configure database connection, JWT secrets, etc.

# Frontend environment
cp src/environments/environment.example.ts src/environments/environment.ts
```

### Running the Application

1. **Start the backend server**
```bash
cd ims_backend
npm start
# Server runs on http://localhost:3000
```

2. **Start the frontend development server**
```bash
cd i_m_s
ng serve
# Application runs on http://localhost:4200
```

3. **Access the application**
- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000`

## 🧪 Testing

### Unit Tests
The application includes comprehensive unit testing with 165+ passing tests (85.5% success rate).

```bash
# Run all tests
ng test

# Run tests with coverage
ng test --code-coverage

# Run tests in watch mode
ng test --watch
```

**Test Coverage:**
- Components: 165+ tests
- Services: Complete API coverage
- Guards: Authentication & authorization
- Pipes: Data transformation
- Utilities: Helper functions

### Test Results Summary
```
✅ 165 PASSING TESTS
⚠️ 28 FAILING TESTS  
🎯 85.5% Success Rate
📊 Total: 193 tests
```

### E2E Testing
```bash
ng e2e
```

## 🏗️ Building

### Development Build
```bash
ng build
```

### Production Build
```bash
ng build --configuration=production
```

Build artifacts are stored in the `dist/` directory.

## 📁 Project Structure

```
ims/
├── i_m_s/                          # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── adminpage/           # Admin module
│   │   │   │   ├── admin-content/   # Admin components
│   │   │   │   │   ├── admin-dashboard/
│   │   │   │   │   ├── admin-inventory-management/
│   │   │   │   │   ├── admin-order/
│   │   │   │   │   ├── admin-salesperson/
│   │   │   │   │   ├── admin-supplier/
│   │   │   │   │   └── admin-report/
│   │   │   ├── supplierpage/        # Supplier module
│   │   │   ├── services/            # Angular services
│   │   │   ├── guards/              # Route guards
│   │   │   └── shared/              # Shared components
│   │   ├── assets/                  # Static assets
│   │   └── environments/            # Environment configs
├── ims_backend/                     # Node.js Backend
│   ├── controllers/                 # Route controllers
│   ├── models/                      # Database models
│   ├── routes/                      # API routes
│   ├── middleware/                  # Custom middleware
│   ├── config/                      # Configuration files
│   └── utils/                       # Utility functions
└── README.md
```

## 🔌 API Documentation

### Authentication Endpoints
```http
POST   /api/auth/login           # User authentication
POST   /api/auth/register        # User registration
POST   /api/auth/refresh         # Token refresh
POST   /api/auth/logout          # User logout
```

### Product Management
```http
GET    /api/product/all          # List all products
POST   /api/product/add          # Create product
PUT    /api/product/:id          # Update product
DELETE /api/product/:id          # Delete product
GET    /api/product/:id          # Get product details
```

### Order Management
```http
GET    /api/orders               # List orders
POST   /api/orders/add           # Create order
PUT    /api/orders/:id           # Update order
DELETE /api/orders/:id           # Delete order
GET    /api/orders/supplier/:id  # Supplier orders
```

### Supplier Management
```http
GET    /api/supplier             # List suppliers
POST   /api/supplier/add         # Create supplier
PUT    /api/supplier/:id         # Update supplier
DELETE /api/supplier/:id         # Delete supplier
```

### Content Management
```http
GET    /api/content/home         # Homepage content
PUT    /api/content/home         # Update homepage
GET    /api/content/features     # Features content
PUT    /api/content/features     # Update features
GET    /api/content/about        # About content
PUT    /api/content/about        # Update about
```

## 🚀 Deployment

### Frontend Deployment
```bash
# Build for production
ng build --configuration=production

# Deploy to web server
# Copy dist/ contents to your web server
```

### Backend Deployment
```bash
# Install PM2 for production
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "ims-backend"

# Configure reverse proxy (Nginx)
# Set up SSL certificates
```

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Encryption** using bcrypt
- **Route Protection** with Angular guards
- **Input Validation** and sanitization
- **CORS Configuration** for cross-origin requests
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with content security policies

## 🎨 UI/UX Features

- **Responsive Design** with Bootstrap grid
- **Material Design** components
- **Dark/Light Theme** support
- **Interactive Charts** with Chart.js
- **Real-time Updates** with WebSocket support
- **Progressive Web App** capabilities
- **Accessibility (a11y)** compliance

## 📈 Performance Optimization

- **Lazy Loading** for route modules
- **OnPush Change Detection** strategy
- **Image Optimization** with WebP support
- **Bundle Analysis** and code splitting
- **Caching Strategies** for API responses
- **CDN Integration** for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support and questions:
- Create an issue on GitHub
- Contact: abishek17624@gmail.com
- Documentation: [Project Wiki](https://github.com/abishek17624/ims/wiki)

## 🚀 Future Enhancements

- [ ] Mobile application development
- [ ] Advanced analytics dashboard
- [ ] Integration with third-party APIs
- [ ] Microservices architecture
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] GraphQL API implementation
- [ ] Real-time notifications
- [ ] Audit logging system
- [ ] Multi-tenant support

---

**Built with ❤️ using Angular 17+ and Node.js**
