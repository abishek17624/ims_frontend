import { HomepageComponent } from './landing/homepage/homepage.component';
import { NavbarComponent } from './landing/navbar/navbar.component';
import { MaincontentComponent } from './landing/maincontent/maincontent.component';
import { LoginComponent } from './rolebase/login/login.component';
import { ForgetpassComponent } from './rolebase/forgetpass/forgetpass.component';
import { SignupComponent } from './rolebase/signup/signup.component';
import { AdminhomepageComponent } from './adminpage/adminhomepage/adminhomepage.component';
import { SidebarComponent } from './adminpage/sidebar/sidebar.component';
import { AdminDashboardComponent } from './adminpage/admin-content/admin-dashboard/admin-dashboard.component';
import { AdminPagecontentComponent } from './adminpage/admin-content/admin-pagecontent/admin-pagecontent.component';
import { AdminInventoryComponent } from './adminpage/admin-content/admin-inventory/admin-inventory.component';
import { AdminOrderComponent } from './adminpage/admin-content/admin-order/admin-order.component';
import { AdminReportComponent } from './adminpage/admin-content/admin-report/admin-report.component';
import { AdminSalespersonComponent } from './adminpage/admin-content/admin-salesperson/admin-salesperson.component';
import { AdminSupplierComponent } from './adminpage/admin-content/admin-supplier/admin-supplier.component';
import { AdminSettingComponent } from './adminpage/admin-content/admin-setting/admin-setting.component';
import { Routes } from '@angular/router';

import { SupplierhomeComponent } from './supplierpage/supplierhome/supplierhome.component';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
// import { persistenceGuard } from './core/guards/persistence.guard';

export const routes: Routes = [
    {
        path: '',
        component:HomepageComponent
    },
    {
        path:'navbar',
        component:NavbarComponent
    },
    {
        path:'main',
        component:MaincontentComponent
    },
    {
        path:'login',
        component:LoginComponent
    },{
        path:'forget',
        component:ForgetpassComponent
    },
      {
        path:'signup',
        component:SignupComponent
    },
    {
        path:'adminsidebar',
        component:SidebarComponent
    },
    // 
    
    {
    path: 'admin',
    component: AdminhomepageComponent,
    title: 'Admin Home',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },  // Ensure this route is protected
    children: [
      { path: 'dashboard',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'inventory',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-inventory-management/admin-inventory-management.component').then(m => m.AdminInventoryManagementComponent) },
      { path: 'orders',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-order/admin-order.component').then(m => m.AdminOrderComponent) },
      { path: 'suppliers',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-supplier/admin-supplier.component').then(m => m.AdminSupplierComponent) },
      { path: 'sales',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-salesperson/admin-salesperson.component').then(m => m.AdminSalespersonComponent) },
      { path: 'reports',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-report/admin-report.component').then(m => m.AdminReportComponent) },
      { path: 'content',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-pagecontent/admin-pagecontent.component').then(m => m.AdminPagecontentComponent) },
      { path: 'settings',canActivate: [authGuard, roleGuard], loadComponent: () => import('./adminpage/admin-content/admin-setting/admin-setting.component').then(m => m.AdminSettingComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

    {
    path: 'sales',
    canActivate: [authGuard, roleGuard], //
    data: { roles: ['SALESPERSON'] },
    title: 'Sales Home',
    children: [
      { path: 'billingpart',canActivate: [authGuard, roleGuard], loadComponent: () => import('./salesperson/billing/billing.component').then(m => m.BillingComponent) },
      { path: 'history',canActivate: [authGuard, roleGuard], loadComponent: () => import('./salesperson/history-detail/history-detail.component').then(m => m.HistoryDetailComponent) },
      { path: '', redirectTo: 'billingpart', pathMatch: 'full' }
    ]
  },

  // Add supplier and sales routes if they exist
  {
    path: 'supplier',
    component: SupplierhomeComponent,
    canActivate: [authGuard, roleGuard], //
    data: { roles: ['SUPPLIER'] }, // Ensure this route is protected
    title: 'Supplier Home',
    children: [
      { path: 'supdashboard',canActivate: [authGuard, roleGuard], loadComponent: () => import('./supplierpage/supplier-content/supplier-dashboard/supplier-dashboard.component').then(m => m.SupplierDashboardComponent) },
      { path: 'suporders' ,canActivate: [authGuard, roleGuard], loadComponent: ()=> import('./supplierpage/supplier-content/supplier-orders/supplier-orders.component').then(m => m.SupplierOrdersComponent)},
      { path: 'supinvoices' ,canActivate: [authGuard, roleGuard], loadComponent: ()=> import('./supplierpage/supplier-content/supplier-invoice/supplier-invoice.component').then(m=>m.SupplierInvoiceComponent)},
      {path: 'supsettings' ,canActivate: [authGuard, roleGuard], loadComponent: ()=> import('./supplierpage/supplier-content/supplier-setting/supplier-setting.component').then(m=>m.SupplierSettingComponent)},
      { path: '', redirectTo: 'supdashboard', pathMatch: 'full' } // Fixed redirect typo
    ]
  }

];

