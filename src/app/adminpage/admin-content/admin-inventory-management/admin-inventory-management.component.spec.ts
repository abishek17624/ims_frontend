import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminInventoryManagementComponent } from './admin-inventory-management.component';

describe('AdminInventoryManagementComponent', () => {
  let component: AdminInventoryManagementComponent;
  let fixture: ComponentFixture<AdminInventoryManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminInventoryManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminInventoryManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
