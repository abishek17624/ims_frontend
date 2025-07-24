import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const supplierGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const role = localStorage.getItem('userRole');

  if (isLoggedIn && role === 'supplier') {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
