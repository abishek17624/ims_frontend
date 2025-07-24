import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSalespersonComponent } from './admin-salesperson.component';

describe('AdminSalespersonComponent', () => {
  let component: AdminSalespersonComponent;
  let fixture: ComponentFixture<AdminSalespersonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSalespersonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSalespersonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
