import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('userRole');

  if (isLoggedIn && userRole === 'admin') {
    return true;
  }

  router.navigate(['/login']); // or /not-authorized
  return false;
};
