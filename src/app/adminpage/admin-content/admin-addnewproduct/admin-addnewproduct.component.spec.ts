import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAddnewproductComponent } from './admin-addnewproduct.component';

describe('AdminAddnewproductComponent', () => {
  let component: AdminAddnewproductComponent;
  let fixture: ComponentFixture<AdminAddnewproductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAddnewproductComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAddnewproductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
