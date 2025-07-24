import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalespageComponent } from './salespage.component';

describe('SalespageComponent', () => {
  let component: SalespageComponent;
  let fixture: ComponentFixture<SalespageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalespageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalespageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
