import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierInvoiceComponent } from './supplier-invoice.component';

describe('SupplierInvoiceComponent', () => {
  let component: SupplierInvoiceComponent;
  let fixture: ComponentFixture<SupplierInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierInvoiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
