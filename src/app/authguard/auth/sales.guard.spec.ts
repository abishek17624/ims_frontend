import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { salesGuard } from './sales.guard';

describe('salesGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => salesGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
