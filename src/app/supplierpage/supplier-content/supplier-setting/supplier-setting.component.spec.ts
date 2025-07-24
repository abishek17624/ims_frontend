import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierSettingComponent } from './supplier-setting.component';

describe('SupplierSettingComponent', () => {
  let component: SupplierSettingComponent;
  let fixture: ComponentFixture<SupplierSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierSettingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
