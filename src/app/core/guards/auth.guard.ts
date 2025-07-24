import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'; // <-- Ensure these imports are here
import { map, take, switchMap, catchError } from 'rxjs/operators'; // <-- Added switchMap, catchError
import { of } from 'rxjs'; // <-- Added of
import { AuthService } from '../../services/auth.service'; //

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoginPage = state.url.includes('/login');
  const isSignupPage = state.url.includes('/signup');
  const lastPath = localStorage.getItem('lastPath') || '/';

  // Store current path for refresh handling
  if (!isLoginPage && !isSignupPage) {
    localStorage.setItem('lastPath', state.url);
  }

  return authService.currentUser$.pipe(
    take(1),
    switchMap((user) => {
      if (user) {
        if (isLoginPage || isSignupPage) {
          const userRole = authService.getUserRole();
          let redirectPath = lastPath;

          switch (userRole?.toUpperCase()) { //
            case 'ADMIN':
              redirectPath = '/admin/dashboard';
              break;
            case 'CUSTOMER':
              redirectPath = '/customer/dashboard';
              break;
            case 'SALES': // Assuming 'SALES' role for salesperson based on your app.routes.ts
              redirectPath = '/sales/billingpart';
              break;
            case 'SUPPLIER': // Assuming 'SUPPLIER' role based on your app.routes.ts
              redirectPath = '/supplier/supdashboard';
              break;
            // Add more roles as needed
          }
          router.navigate([redirectPath]);
          return of(false); // Prevent activation of login/signup
        }
        return of(true); // User is logged in and not accessing login/signup, allow route
      } else {
        // User data is NOT available (e.g., after a fresh page reload where in-memory state is lost)
        // Attempt to re-authenticate via backend using cookies
        return authService.getCurrentUser().pipe( //
          map((fetchedUser) => {
            if (fetchedUser) {
              // Successfully re-authenticated via cookies
              if (isLoginPage || isSignupPage) {
                // If they were trying to access login/signup, redirect them to dashboard
                const userRole = authService.getUserRole(); //
                let redirectPath = '/profile';
                switch (userRole?.toUpperCase()) {
                  case 'ADMIN':
                    redirectPath = '/admin/dashboard';
                    break;
                  case 'CUSTOMER':
                    redirectPath = '/customer/dashboard';
                    break;
                  case 'SALES':
                    redirectPath = '/sales/billingpart';
                    break;
                  case 'SUPPLIER':
                    redirectPath = '/supplier/supdashboard';
                    break;
                }
                router.navigate([redirectPath]);
                return false; // Prevent login/signup activation
              }
              return true; // Re-authenticated and trying to access intended protected route, allow
            } else {
              // getCurrentUser() returned null (shouldn't happen with success, but as fallback)
              router.navigate(['/login']); //
              return false;
            }
          }),
          catchError(() => {
            // getCurrentUser() failed (e.g., 401, session expired)
            // Only redirect to login if not already on login/signup page
            if (!isLoginPage && !isSignupPage) {
              router.navigate(['/login']); //
            }
            return of(false); // Prevent route activation
          })
        );
      }
    })
  );
};