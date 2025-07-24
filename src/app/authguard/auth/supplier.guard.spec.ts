import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { supplierGuard } from './supplier.guard';

describe('supplierGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => supplierGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
