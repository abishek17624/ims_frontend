import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthDebugService {
  
  private isBrowser: boolean;
  
  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      // Subscribe to auth state changes for debugging
      this.authService.currentUser$.subscribe(user => {
        console.log('🔵 AUTH DEBUG - Current user changed:', user ? `${user.name} (${user.role})` : 'null');
      });

      this.authService.isAuthenticated$.subscribe(isAuth => {
        console.log('🔵 AUTH DEBUG - Authentication state changed:', isAuth);
      });

      // Log token state periodically
      setInterval(() => {
        const token = this.authService.getToken();
        const hasValidToken = this.authService.hasValidToken();
        const isLoggedIn = this.authService.isLoggedIn();
        
        console.log('🔵 AUTH DEBUG - Periodic check:', {
          hasToken: !!token,
          hasValidToken,
          isLoggedIn,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
        });
      }, 30000); // Every 30 seconds
    }
  }

  logAuthState(): void {
    if (!this.isBrowser) {
      console.log('🔵 AUTH DEBUG - Not in browser environment');
      return;
    }
    
    // Access the current value through the BehaviorSubject
    const currentUserSubject = (this.authService as any).currentUserSubject;
    const user = currentUserSubject ? currentUserSubject.getValue() : null;
    const token = this.authService.getToken();
    const hasValidToken = this.authService.hasValidToken();
    const isLoggedIn = this.authService.isLoggedIn();
    const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('current_user') : null;
    const lastPath = typeof localStorage !== 'undefined' ? localStorage.getItem('lastPath') : null;

    console.group('🔵 AUTH DEBUG - Current State');
    console.log('Current User:', user);
    console.log('Has Token:', !!token);
    console.log('Has Valid Token:', hasValidToken);
    console.log('Is Logged In:', isLoggedIn);
    console.log('Stored User:', storedUser ? JSON.parse(storedUser) : null);
    console.log('Last Path:', lastPath);
    console.log('Token Preview:', token ? `${token.substring(0, 50)}...` : 'none');
    console.groupEnd();
  }

  testTokenRefresh(): void {
    if (!this.isBrowser) {
      console.log('🔵 AUTH DEBUG - Not in browser environment');
      return;
    }
    
    console.log('🔵 AUTH DEBUG - Testing token refresh...');
    this.authService.refreshToken().subscribe({
      next: (response) => {
        console.log('🔵 AUTH DEBUG - Refresh successful:', response);
        this.logAuthState();
      },
      error: (error) => {
        console.error('🔵 AUTH DEBUG - Refresh failed:', error);
        this.logAuthState();
      }
    });
  }

  testGetCurrentUser(): void {
    if (!this.isBrowser) {
      console.log('🔵 AUTH DEBUG - Not in browser environment');
      return;
    }
    
    console.log('🔵 AUTH DEBUG - Testing getCurrentUser...');
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('🔵 AUTH DEBUG - getCurrentUser successful:', user);
      },
      error: (error) => {
        console.error('🔵 AUTH DEBUG - getCurrentUser failed:', error);
      }
    });
  }
}
