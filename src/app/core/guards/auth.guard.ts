import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, take, switchMap, catchError, delay } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  const isBrowser = isPlatformBrowser(platformId);

  const isLoginPage = state.url.includes('/login');
  const isSignupPage = state.url.includes('/signup');
  const lastPath = isBrowser && typeof localStorage !== 'undefined' ? localStorage.getItem('lastPath') || '/' : '/';

  // Store current path for refresh handling
  if (isBrowser && !isLoginPage && !isSignupPage && typeof localStorage !== 'undefined') {
    localStorage.setItem('lastPath', state.url);
  }

  // Give the auth service a moment to initialize from localStorage
  return timer(100).pipe(
    switchMap(() => authService.currentUser$),
    take(1),
    switchMap((user) => {
      console.log('Auth Guard - User state after delay:', user);
      
      if (user) {
        // User is authenticated
        if (isLoginPage || isSignupPage) {
          // User is authenticated but trying to access login/signup
          const userRole = authService.getUserRole();
          let redirectPath = lastPath;

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
          return of(false); // Prevent activation of login/signup
        }
        return of(true); // User is authenticated, allow access
      } else {
        // No user in memory, check if we have a token
        const token = authService.getToken();
        console.log('Auth Guard - No user in memory, token exists:', !!token);
        
        if (!token) {
          // No token, redirect to login
          if (!isLoginPage && !isSignupPage) {
            console.log('Auth Guard - No token, redirecting to login');
            router.navigate(['/login']);
          }
          return of(false);
        }

        // We have a token but no user in memory (page refresh scenario)
        // Try to verify with server
        console.log('Auth Guard - Token exists, verifying with server');
        return authService.getCurrentUser().pipe(
          map((fetchedUser) => {
            console.log('Auth Guard - Server verification success:', fetchedUser);
            if (fetchedUser) {
              // Successfully verified
              if (isLoginPage || isSignupPage) {
                const userRole = authService.getUserRole();
                let redirectPath = '/';
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
                return false;
              }
              return true; // Allow access to protected route
            } else {
              // Server returned null user
              if (!isLoginPage && !isSignupPage) {
                router.navigate(['/login']);
              }
              return false;
            }
          }),
          catchError((error) => {
            console.log('Auth Guard - Server verification failed:', error);
            
            // If 401/403, try refresh token
            if (error.status === 401 || error.status === 403) {
              console.log('Auth Guard - Attempting token refresh');
              return authService.refreshToken().pipe(
                switchMap(() => {
                  // Refresh successful, try getCurrentUser again
                  return authService.getCurrentUser().pipe(
                    map((refreshedUser) => {
                      if (refreshedUser) {
                        console.log('Auth Guard - Authentication restored after refresh');
                        return !isLoginPage && !isSignupPage; // Allow access if not on login page
                      } else {
                        if (!isLoginPage && !isSignupPage) {
                          router.navigate(['/login']);
                        }
                        return false;
                      }
                    }),
                    catchError(() => {
                      console.log('Auth Guard - getCurrentUser failed after refresh');
                      if (!isLoginPage && !isSignupPage) {
                        router.navigate(['/login']);
                      }
                      return of(false);
                    })
                  );
                }),
                catchError(() => {
                  console.log('Auth Guard - Token refresh failed');
                  if (!isLoginPage && !isSignupPage) {
                    router.navigate(['/login']);
                  }
                  return of(false);
                })
              );
            } else {
              // Other error, redirect to login
              if (!isLoginPage && !isSignupPage) {
                router.navigate(['/login']);
              }
              return of(false);
            }
          })
        );
      }
    })
  );
};