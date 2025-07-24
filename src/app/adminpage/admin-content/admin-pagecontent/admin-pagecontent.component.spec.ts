import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPagecontentComponent } from './admin-pagecontent.component';

describe('AdminPagecontentComponent', () => {
  let component: AdminPagecontentComponent;
  let fixture: ComponentFixture<AdminPagecontentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPagecontentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPagecontentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
