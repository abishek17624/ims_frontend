import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

export function initializeAuth() {
  return () => {
    const authService = inject(AuthService);
    const platformId = inject(PLATFORM_ID);
    
    return new Promise<void>((resolve) => {
      // Only run initialization in browser environment
      if (!isPlatformBrowser(platformId)) {
        console.log('Auth Initializer: Not in browser environment, skipping');
        resolve();
        return;
      }

      // Check if we have stored authentication data
      const token = authService.getToken();
      const hasStoredUser = typeof localStorage !== 'undefined' ? localStorage.getItem('current_user') : null;
      
      if (token && hasStoredUser && authService.hasValidToken()) {
        console.log('Auth Initializer: Found stored auth data, verifying...');
        
        // Try to verify the current user with a timeout
        firstValueFrom(
          authService.getCurrentUser().pipe(
            timeout(5000), // 5 second timeout
            catchError((error) => {
              console.log('Auth Initializer: Verification failed, trying refresh');
              
              // If getCurrentUser fails, try refresh token
              return authService.refreshToken().pipe(
                timeout(5000),
                catchError((refreshError) => {
                  console.log('Auth Initializer: Refresh failed, clearing auth data');
                  return of(null);
                })
              );
            })
          )
        ).then(() => {
          console.log('Auth Initializer: Authentication verified');
          resolve();
        }).catch(() => {
          console.log('Auth Initializer: Authentication verification failed');
          resolve();
        });
      } else {
        console.log('Auth Initializer: No valid stored authentication found');
        resolve();
      }
    });
  };
}
