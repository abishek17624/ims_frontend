import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierSidebarComponent } from './supplier-sidebar.component';

describe('SupplierSidebarComponent', () => {
  let component: SupplierSidebarComponent;
  let fixture: ComponentFixture<SupplierSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
