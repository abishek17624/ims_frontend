import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have undefined ViewChild elements before view init', () => {
      expect(component.salesChartRef).toBeUndefined();
      expect(component.inventoryChartRef).toBeUndefined();
    });

    it('should initialize properly on ngOnInit', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('Sales Chart Granularity Changes', () => {
    beforeEach(() => {
      const mockChart = {
        update: jasmine.createSpy('update'),
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [{ data: [3500, 4200, 5100, 4800] }]
        }
      };
      component['salesChart'] = mockChart as any;
    });

    it('should update chart data for daily granularity', () => {
      const mockEvent = {
        target: { value: 'daily' }
      } as any;

      component.changeSalesGranularity(mockEvent);

      const chart = component['salesChart'];
      expect(chart.data.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      expect(chart.data.datasets[0].data).toEqual([1200, 1900, 1500, 2000, 1800, 2500, 2200]);
      expect(chart.update).toHaveBeenCalled();
    });

    it('should update chart data for weekly granularity', () => {
      const mockEvent = {
        target: { value: 'weekly' }
      } as any;

      component.changeSalesGranularity(mockEvent);

      const chart = component['salesChart'];
      expect(chart.data.labels).toEqual(['Week 1', 'Week 2', 'Week 3', 'Week 4']);
      expect(chart.data.datasets[0].data).toEqual([3500, 4200, 5100, 4800]);
      expect(chart.update).toHaveBeenCalled();
    });

    it('should update chart data for monthly granularity', () => {
      const mockEvent = {
        target: { value: 'monthly' }
      } as any;

      component.changeSalesGranularity(mockEvent);

      const chart = component['salesChart'];
      expect(chart.data.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
      expect(chart.data.datasets[0].data).toEqual([15000, 16200, 18300, 17500, 19200, 21000]);
      expect(chart.update).toHaveBeenCalled();
    });

    it('should not update chart if sales chart is not initialized', () => {
      component['salesChart'] = null as any;
      const mockEvent = {
        target: { value: 'daily' }
      } as any;

      expect(() => component.changeSalesGranularity(mockEvent)).not.toThrow();
    });
  });

  describe('Inventory Chart View Changes', () => {
    beforeEach(() => {
      const mockChart = {
        update: jasmine.createSpy('update'),
        data: {
          labels: ['Critical', 'Low', 'Medium', 'High'],
          datasets: [{ data: [12, 19, 15, 32], label: 'Items' }]
        },
        config: { type: 'doughnut' }
      };
      component['inventoryChart'] = mockChart as any;
    });

    it('should update chart for category view', () => {
      const mockEvent = {
        target: { value: 'category' }
      } as any;

      component.changeInventoryView(mockEvent);

      const chart = component['inventoryChart'];
      expect((chart.config as any).type).toBe('bar');
      expect(chart.data.labels).toEqual(['Beverages', 'Snacks', 'Dairy', 'Groceries']);
      expect(chart.data.datasets[0].data).toEqual([45, 32, 28, 40]);
      expect(chart.data.datasets[0].label).toBe('Items by Category');
      expect(chart.update).toHaveBeenCalled();
    });

    it('should update chart for stock view', () => {
      const mockEvent = {
        target: { value: 'stock' }
      } as any;

      component.changeInventoryView(mockEvent);

      const chart = component['inventoryChart'];
      expect((chart.config as any).type).toBe('doughnut');
      expect(chart.data.labels).toEqual(['Critical', 'Low', 'Medium', 'High']);
      expect(chart.data.datasets[0].data).toEqual([12, 19, 15, 32]);
      expect(chart.data.datasets[0].label).toBe('Items by Stock Level');
      expect(chart.update).toHaveBeenCalled();
    });

    it('should update chart for value view', () => {
      const mockEvent = {
        target: { value: 'value' }
      } as any;

      component.changeInventoryView(mockEvent);

      const chart = component['inventoryChart'];
      expect((chart.config as any).type).toBe('pie');
      expect(chart.data.labels).toEqual(['Beverages', 'Snacks', 'Dairy', 'Groceries']);
      expect(chart.data.datasets[0].data).toEqual([125000, 85000, 92000, 110000]);
      expect(chart.data.datasets[0].label).toBe('Inventory Value (₹)');
      expect(chart.update).toHaveBeenCalled();
    });

    it('should not update chart if inventory chart is not initialized', () => {
      component['inventoryChart'] = null as any;
      const mockEvent = {
        target: { value: 'category' }
      } as any;

      expect(() => component.changeInventoryView(mockEvent)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas elements gracefully', () => {
      component.salesChartRef = undefined as any;
      component.inventoryChartRef = undefined as any;

      expect(() => component.ngAfterViewInit()).not.toThrow();
    });

    it('should handle invalid event targets in changeSalesGranularity', () => {
      const mockChart = {
        update: jasmine.createSpy('update'),
        data: { labels: [], datasets: [{ data: [] }] }
      };
      component['salesChart'] = mockChart as any;
      
      const mockEvent = {
        target: null
      } as any;

      expect(() => component.changeSalesGranularity(mockEvent)).toThrow();
    });

    it('should handle invalid event targets in changeInventoryView', () => {
      const mockChart = {
        update: jasmine.createSpy('update'),
        data: { labels: [], datasets: [{ data: [], label: '' }] },
        config: { type: 'doughnut' }
      };
      component['inventoryChart'] = mockChart as any;
      
      const mockEvent = {
        target: null
      } as any;

      expect(() => component.changeInventoryView(mockEvent)).toThrow();
    });
  });

  describe('Chart Initialization Methods', () => {
    it('should handle canvas context creation', () => {
      const mockCanvas = document.createElement('canvas');
      spyOn(mockCanvas, 'getContext').and.returnValue(null);
      
      component.salesChartRef = new ElementRef(mockCanvas);
      component.inventoryChartRef = new ElementRef(mockCanvas);

      expect(() => component.ngAfterViewInit()).not.toThrow();
    });

    it('should call private initialization methods', () => {
      spyOn<any>(component, 'initializeSalesChart').and.stub();
      spyOn<any>(component, 'initializeInventoryChart').and.stub();

      component.ngAfterViewInit();

      expect(component['initializeSalesChart']).toHaveBeenCalled();
      expect(component['initializeInventoryChart']).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should render dashboard structure', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled).toBeTruthy();
    });

    it('should handle component lifecycle correctly', () => {
      expect(() => {
        fixture.detectChanges();
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should work with valid chart data updates', () => {
      const mockChart = {
        update: jasmine.createSpy('update'),
        data: {
          labels: ['Test'],
          datasets: [{ data: [100] }]
        }
      };
      component['salesChart'] = mockChart as any;

      const mockEvent = { target: { value: 'daily' } } as any;
      
      expect(() => component.changeSalesGranularity(mockEvent)).not.toThrow();
      expect(mockChart.update).toHaveBeenCalled();
    });
  });
});
