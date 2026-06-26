import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { AdminOrderComponent } from './admin-order.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

describe('AdminOrderComponent', () => {
  let component: AdminOrderComponent;
  let fixture: ComponentFixture<AdminOrderComponent>;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockOrders = [
    {
      id: 'ORDER-001',
      order_id: 'ORD-001',
      product_id: 'PRD-001',
      productName: 'Test Product',
      productCode: 'PRD-001',
      quantity: 10,
      unit: 'Pieces',
      value: 1000,
      supplier_id: 'SUP-001',
      supplierName: 'Test Supplier',
      supplierPhone: '9876543210',
      category: 'Electronics',
      orderDate: '2025-01-01',
      deliveryDate: '2025-01-10',
      deliveryStatus: 'On time' as 'On time',
      status: 'Pending' as 'Pending',
      adminNotes: '',
      supplierNotes: ''
    }
  ];

  const mockProducts = [
    {
      id: 'PRD-001',
      name: 'Test Product',
      category: 'Electronics',
      buyingPrice: 80,
      sellingPrice: 100,
      quantity: 50,
      threshold: 10,
      status: 'in_stock' as 'in_stock',
      supplier: 'Test Supplier'
    }
  ];

  const mockSuppliers = [
    {
      id: 'SUP-001',
      name: 'Test Supplier',
      product: 'Test Product',
      category: 'Electronics',
      price: 80,
      contact: '9876543210',
      email: 'supplier@test.com',
      returnPolicy: 'yes' as 'yes'
    }
  ];

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getUserRole']);

    await TestBed.configureTestingModule({
      imports: [AdminOrderComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminOrderComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    
    authServiceSpy.getUserRole.and.returnValue('admin');
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentPage).toBe(1);
      expect(component.itemsPerPage).toBe(5);
      expect(component.orders).toEqual([]);
      expect(component.isInvoiceVisible).toBe(false);
      expect(component.isNewOrderModalVisible).toBe(false);
    });

    it('should load data on initialization', () => {
      component.ngOnInit();

      const ordersReq = httpMock.expectOne(`${environment.apiUrl}/orders`);
      expect(ordersReq.request.method).toBe('GET');
      ordersReq.flush(mockOrders);

      const productsReq = httpMock.expectOne(`${environment.apiUrl}/product/all`);
      expect(productsReq.request.method).toBe('GET');
      productsReq.flush(mockProducts);

      const suppliersReq = httpMock.expectOne(`${environment.apiUrl}/supplier`);
      expect(suppliersReq.request.method).toBe('GET');
      suppliersReq.flush(mockSuppliers);

      expect(component.orders).toEqual(mockOrders);
      expect(component.allProducts).toEqual(mockProducts);
      expect(component.allSuppliers).toEqual(mockSuppliers);
    });
  });

  describe('Data Loading', () => {
    it('should load orders successfully', () => {
      component.loadOrders();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
      expect(req.request.method).toBe('GET');
      req.flush(mockOrders);

      expect(component.orders).toEqual(mockOrders);
    });

    it('should handle orders loading error', () => {
      spyOn(window, 'alert');
      
      component.loadOrders();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
      req.error(new ErrorEvent('Network error'), { status: 500 });

      expect(component.orders).toEqual([]);
      expect(window.alert).toHaveBeenCalled();
    });

    it('should load products for dropdown', () => {
      component.loadProductsForDropdown();

      const req = httpMock.expectOne(`${environment.apiUrl}/product/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);

      expect(component.allProducts).toEqual(mockProducts);
    });

    it('should load suppliers for dropdown', () => {
      component.loadSuppliersForDropdown();

      const req = httpMock.expectOne(`${environment.apiUrl}/supplier`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSuppliers);

      expect(component.allSuppliers).toEqual(mockSuppliers);
    });
  });

  describe('Product Selection', () => {
    beforeEach(() => {
      component.allProducts = mockProducts;
    });

    it('should select product and update form', () => {
      const mockEvent = {
        target: { value: 'PRD-001' }
      } as any;

      component.onProductSelect(mockEvent);

      expect(component.newOrder.product_id).toBe('PRD-001');
      expect(component.newOrder.productName).toBe('Test Product');
      expect(component.newOrder.category).toBe('Electronics');
      expect(component.newOrder.value).toBe(100); // quantity 1 * sellingPrice 100
    });

    it('should reset form fields when no product selected', () => {
      const mockEvent = {
        target: { value: '' }
      } as any;

      component.onProductSelect(mockEvent);

      expect(component.newOrder.product_id).toBe('');
      expect(component.newOrder.productName).toBe('');
      expect(component.newOrder.category).toBe('');
      expect(component.newOrder.value).toBe(0);
    });
  });

  describe('Quantity Changes', () => {
    beforeEach(() => {
      component.selectedProductFromDropdown = mockProducts[0];
    });

    it('should update value when quantity changes', () => {
      component.newOrder.quantity = 5;
      component.onQuantityChange();

      expect(component.newOrder.value).toBe(500); // 5 * 100
    });

    it('should handle quantity change without selected product', () => {
      component.selectedProductFromDropdown = null;
      component.newOrder.quantity = 5;
      component.onQuantityChange();

      expect(component.newOrder.value).toBe(0);
    });
  });

  describe('Order Filtering', () => {
    beforeEach(() => {
      component.orders = mockOrders;
    });

    it('should filter orders by date range', () => {
      component.fromDate = '2025-01-01';
      component.toDate = '2025-01-01';

      const filtered = component.filteredOrders;
      expect(filtered.length).toBe(1);
    });

    it('should filter orders by status', () => {
      component.selectedStatusFilter = 'Pending';

      const filtered = component.filteredOrders;
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('Pending');
    });

    it('should return empty array when no orders match filter', () => {
      component.selectedStatusFilter = 'Completed';

      const filtered = component.filteredOrders;
      expect(filtered.length).toBe(0);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      component.orders = Array.from({ length: 12 }, (_, i) => ({
        ...mockOrders[0],
        order_id: `ORD-${i + 1}`
      }));
    });

    it('should calculate total pages correctly', () => {
      expect(component.totalPages).toBe(3);
    });

    it('should change page correctly', () => {
      component.changePage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should not change to invalid page', () => {
      component.changePage(0);
      expect(component.currentPage).toBe(1);

      component.changePage(10);
      expect(component.currentPage).toBe(1);
    });

    it('should navigate to next page', () => {
      component.nextPage();
      expect(component.currentPage).toBe(2);
    });

    it('should navigate to previous page', () => {
      component.currentPage = 2;
      component.prevPage();
      expect(component.currentPage).toBe(1);
    });
  });

  describe('Dashboard Statistics', () => {
    beforeEach(() => {
      const currentDate = new Date();
      component.orders = [
        {
          ...mockOrders[0],
          orderDate: currentDate.toISOString().split('T')[0],
          status: 'Pending' as 'Pending',
          value: 1000
        },
        {
          ...mockOrders[0],
          id: 'ORDER-002',
          order_id: 'ORD-002',
          orderDate: currentDate.toISOString().split('T')[0],
          status: 'Delivered' as 'Delivered',
          value: 500
        }
      ];
    });

    it('should calculate dashboard stats correctly', () => {
      component.calculateDashboardStats();

      expect(component.pendingOrdersCount).toBe(1);
      expect(component.newTodayOrders).toBe(2);
      expect(component.pendingOrdersValue).toBe('₹1000.00 total value');
    });

    it('should calculate top selling product', () => {
      component.calculateDashboardStats();

      expect(component.topSelling.product).toBe('Test Product');
      expect(component.topSelling.value).toBe('₹1500.00');
    });
  });

  describe('Modal Management', () => {
    it('should show invoice modal', () => {
      const order = mockOrders[0];
      component.showInvoice(order);

      expect(component.currentOrder).toBe(order);
      expect(component.isInvoiceVisible).toBe(true);
    });

    it('should close invoice modal', () => {
      component.closeInvoice();

      expect(component.isInvoiceVisible).toBe(false);
    });

    it('should open new order modal', () => {
      component.openNewOrderModal();

      expect(component.isNewOrderModalVisible).toBe(true);
      expect(component.currentOrder).toBeNull();
      expect(component.newOrder.quantity).toBe(1);
    });

    it('should close new order modal', () => {
      component.closeNewOrderModal();

      expect(component.isNewOrderModalVisible).toBe(false);
    });
  });

  describe('Order Submission', () => {
    beforeEach(() => {
      component.newOrder = {
        product_id: 'PRD-001',
        quantity: 5,
        unit: 'Pieces',
        supplier_id: 'SUP-001',
        supplierName: 'Test Supplier',
        supplierPhone: '9876543210',
        deliveryDate: '2025-01-10',
        category: 'Electronics',
        adminNotes: '',
        supplierNotes: ''
      };
    });

    it('should submit new order successfully', () => {
      spyOn(window, 'alert');
      spyOn(component, 'loadOrders');
      spyOn(component, 'closeNewOrderModal');

      component.submitNewOrder();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/add`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Order created successfully', orderId: 'ORD-001' });

      expect(window.alert).toHaveBeenCalledWith('Order created successfully!');
      expect(component.loadOrders).toHaveBeenCalled();
      expect(component.closeNewOrderModal).toHaveBeenCalled();
    });

    it('should validate required fields before submission', () => {
      component.newOrder.product_id = '';
      spyOn(window, 'alert');

      component.submitNewOrder();

      expect(window.alert).toHaveBeenCalledWith('Please select a product');
      httpMock.expectNone(`${environment.apiUrl}/orders/add`);
    });

    it('should handle submission error', () => {
      spyOn(window, 'alert');

      component.submitNewOrder();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/add`);
      req.error(new ErrorEvent('Network error'), { status: 500 });

      expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to create order/));
    });
  });

  describe('Order Status Changes', () => {
    beforeEach(() => {
      component.orders = mockOrders;
    });

    it('should change order status successfully', () => {
      const order = mockOrders[0];
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component, 'loadOrders');

      component.changeOrderStatus(order, 'Cancelled');

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/${order.order_id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'Cancelled' });
      req.flush({ message: 'Order updated successfully' });

      expect(component.loadOrders).toHaveBeenCalled();
    });

    it('should not change status if user cancels confirmation', () => {
      const order = mockOrders[0];
      spyOn(window, 'confirm').and.returnValue(false);

      component.changeOrderStatus(order, 'Cancelled');

      httpMock.expectNone(`${environment.apiUrl}/orders/${order.order_id}`);
    });
  });

  describe('Date Formatting', () => {
    it('should format date for input correctly', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = component.formatDateForInput(date);

      expect(formatted).toBe('2025-01-15');
    });
  });

  describe('Invoice Generation', () => {
    beforeEach(() => {
      component.currentOrder = mockOrders[0];
    });

    it('should generate invoice content', () => {
      const content = component.generateInvoiceContent();

      expect(content).toContain('Invoice #ORD-001');
      expect(content).toContain('Product: Test Product');
      expect(content).toContain('Quantity: 10 Pieces');
      expect(content).toContain('Value: ₹1000.00');
    });

    it('should calculate unit price correctly', () => {
      const unitPrice = component.getUnitPrice();
      expect(unitPrice).toBe('₹100.00');
    });

    it('should calculate tax correctly', () => {
      const tax = component.getTax();
      expect(tax).toBe('₹180.00'); // 1000 * 0.18
    });

    it('should calculate total with shipping and tax', () => {
      const total = component.getTotal();
      expect(total).toBe('₹1430.00'); // 1000 + 180 + 250
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      component.orders = mockOrders;
    });

    it('should export orders to CSV', () => {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob-url');
      spyOn(window.URL, 'revokeObjectURL');
      
      component.exportOrders();

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob-url');
    });

    it('should convert orders to CSV format', () => {
      const csv = component.convertToCSV(mockOrders);

      expect(csv).toContain('Order ID,Product,Quantity');
      expect(csv).toContain('ORD-001');
      expect(csv).toContain('Test Product');
    });
  });

  describe('Status Class Mapping', () => {
    it('should return correct CSS class for each status', () => {
      expect(component.getStatusClass('pending')).toBe('bg-blue-100 text-blue-800');
      expect(component.getStatusClass('confirmed')).toBe('bg-green-100 text-green-800');
      expect(component.getStatusClass('shipped')).toBe('bg-indigo-100 text-indigo-800');
      expect(component.getStatusClass('delivered')).toBe('bg-purple-100 text-purple-800');
      expect(component.getStatusClass('cancelled')).toBe('bg-gray-100 text-gray-800');
      expect(component.getStatusClass('unknown')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('Error Handling', () => {
    it('should handle 403 error with access denied message', () => {
      spyOn(window, 'alert');
      
      component.loadOrders();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
      req.error(new ErrorEvent('Forbidden'), { status: 403 });

      expect(window.alert).toHaveBeenCalledWith('Access denied. You do not have permission to view orders.');
    });

    it('should handle 401 error with login message', () => {
      spyOn(window, 'alert');
      
      component.loadOrders();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
      req.error(new ErrorEvent('Unauthorized'), { status: 401 });

      expect(window.alert).toHaveBeenCalledWith('Please log in again to view orders.');
    });
  });
});
