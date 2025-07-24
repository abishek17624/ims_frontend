import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const salesGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const role = localStorage.getItem('userRole');

  if (isLoggedIn && role === 'sales') {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
