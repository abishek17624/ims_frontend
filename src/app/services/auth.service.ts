import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, LoginResponse } from '../models/user';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  validateToken() {
    throw new Error('Method not implemented.');
  }
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private refreshTokenTimeout: any;
  private refreshSubscription: any;
  private accessToken: string | null = null;

  private isBrowser: boolean;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializeAuthOnStartup();
      // Set up token refresh timer with better logic
      this.setupTokenRefreshTimer();
    }
  }

  private setupTokenRefreshTimer(): void {
    // Clear any existing timer and subscription
    if (this.refreshTokenTimeout) {
      clearInterval(this.refreshTokenTimeout);
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    // Only set up refresh timer if user is authenticated
    this.refreshSubscription = this.isAuthenticated$.subscribe(isAuth => {
      if (isAuth && this.getToken()) {
        // Clear any existing timer before setting a new one
        if (this.refreshTokenTimeout) {
          clearInterval(this.refreshTokenTimeout);
        }
        
        // Refresh token every 50 minutes (before 1 hour expiry)
        this.refreshTokenTimeout = setInterval(() => {
          if (this.getToken() && this.isAuthenticatedSubject.value) {
            console.log('Auth service: Performing scheduled token refresh');
            this.refreshToken().subscribe({
              next: () => console.log('Auth service: Scheduled refresh successful'),
              error: (error) => console.error('Auth service: Scheduled refresh failed:', error)
            });
          }
        }, 50 * 60 * 1000); // 50 minutes
      } else if (this.refreshTokenTimeout) {
        clearInterval(this.refreshTokenTimeout);
        this.refreshTokenTimeout = null;
      }
    });
  }

  private getFromStorage(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private setInStorage(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  private removeFromStorage(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  private async initializeAuthOnStartup() {
    if (!this.isBrowser) {
      return;
    }
    
    // Add a small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const token = this.getFromStorage('access_token');
    const userStr = this.getFromStorage('current_user');
    
    console.log('Auth service: Initializing on startup - Token:', !!token, 'User:', !!userStr);
    
    if (token && userStr) {
      this.setToken(token);
      try {
        const user = JSON.parse(userStr);
        
        // Set user data immediately to prevent redirect to login
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        
        console.log('Auth service: Restored user from storage:', user);
        
        // Check if token is valid
        if (this.hasValidToken()) {
          console.log('Auth service: Token appears valid, user is authenticated');
          // Token is valid, no need to verify immediately
          // The auth guard will handle verification if needed
        } else {
          console.log('Auth service: Token appears expired, attempting refresh');
          // Try to refresh the token but don't clear auth data immediately
          this.refreshToken().subscribe({
            next: () => {
              console.log('Auth service: Token refreshed successfully during startup');
            },
            error: (refreshError) => {
              console.error('Auth service: Token refresh failed during startup:', refreshError);
              // Only clear if refresh definitively fails
              if (refreshError.status === 401 || refreshError.status === 403) {
                this.clearAuthDataWithoutRedirect();
              }
            }
          });
        }
        
      } catch (error) {
        console.error('Auth service: Failed to parse stored user:', error);
        this.clearAuthDataWithoutRedirect();
      }
    } else {
      console.log('Auth service: No stored authentication found');
    }
  }

  private verifyTokenValidity(): Observable<User> {
    return this.getCurrentUser();
  }

  getToken(): string | null {
    return this.isBrowser ? this.getFromStorage('access_token') : null;
  }

  private setToken(token: string): void {
    this.accessToken = token;
    this.setInStorage('access_token', token);
  }

  private setUserData(user: User): void {
    this.setInStorage('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private removeToken(): void {
    this.accessToken = null;
    this.removeFromStorage('access_token');
    this.removeFromStorage('current_user');
  }

  register(username: string, email: string, mobile: string, password: string) { //
    const body = { username, email, mobile, password }; //
    return this.http.post(`${environment.apiUrl}/auth/register`, body); //
  }

  login(email: string, password: string): Observable<LoginResponse> { //
    const body = { email, password }; //
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body, { //
        withCredentials: true, //
      })
      .pipe(
        tap((response) => { //
          if (response.success && response.user && response.accessToken) {
            this.setToken(response.accessToken);
            this.setUserData(response.user);
            
            console.log('Login successful, user data:', response.user);
            console.log('Access token stored for Bearer authentication');
            
            // Store last path for refresh handling
            const userRole = response.user.role.toUpperCase();
            let lastPath = '/';
            switch (userRole) {
              case 'ADMIN':
                lastPath = '/admin/dashboard';
                break;
              case 'SUPPLIER':
                lastPath = '/supplier/supdashboard';
                break;
              case 'SALESPERSON':
                lastPath = '/sales/billingpart';
                break;
            }
            if (this.isBrowser) {
              localStorage.setItem('lastPath', lastPath);
            }
            this.redirectUserBasedOnRole(response.user.role);
          }
        }),
        catchError((error) => { //
          console.error('Login error:', error); //
          return throwError(() => error); //
        })
      );
  }

  logout(): Observable<any> { //
    return this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }) //
      .pipe(
        tap(() => { //
          this.clearAuthData(); //
        }),
        catchError((error) => { //
          console.error('Logout error:', error); //
          this.clearAuthData(); //
          return throwError(() => error); //
        })
      );
  }

  refreshToken(): Observable<any> { //
    console.log('Auth service: Attempting to refresh token');
    return this.http
      .post(
        `${environment.apiUrl}/auth/refresh-token`, //
        {},
        { withCredentials: true } //
      )
      .pipe(
        tap((response: any) => { //
          if (response.success && response.accessToken) { //
            this.setToken(response.accessToken); //
            this.isAuthenticatedSubject.next(true); //
            console.log('Auth service: Token refreshed successfully'); //
          } else {
            console.error('Auth service: Invalid refresh response:', response);
            throw new Error('Invalid refresh token response');
          }
        }),
        catchError((error) => { //
          console.error('Auth service: Refresh token error:', error); //
          // Only clear auth data for definitive auth failures
          if (error.status === 401 || error.status === 403) {
            this.clearAuthDataWithoutRedirect(); 
          }
          return throwError(() => error); //
        })
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(
        tap((user) => {
          console.log('Current user fetched:', user);
          this.setUserData(user);
          
          // Restore last path if not set
          if (this.isBrowser && !localStorage.getItem('lastPath')) {
            const lastPath = this.getDefaultPathForRole(user.role);
            localStorage.setItem('lastPath', lastPath);
          }
        }),
        catchError((error) => { //
          console.error('Get current user error:', error); //
          // Only clear auth data if it's a definitive auth failure, not network issues
          if (error.status === 401 || error.status === 403) { //
            this.clearAuthDataWithoutRedirect(); //
          }
          return throwError(() => error); //
        })
      );
  }

  isLoggedIn(): boolean { //
    const hasUser = this.currentUserSubject.value !== null; //
    const hasToken = this.getToken() !== null;
    const isAuthenticated = this.isAuthenticatedSubject.value; //
    return hasUser && hasToken && isAuthenticated; //
  }

  // Method to check if token exists and is potentially valid
  hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Basic check - decode JWT payload (not signature verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is not expired (with 5 minute buffer)
      if (payload.exp && payload.exp > now + 300) {
        return true;
      }
      
      console.log('Auth service: Token appears to be expired');
      return false;
    } catch (error) {
      console.error('Auth service: Invalid token format:', error);
      return false;
    }
  }

  getUserRole(): string | null { //
    const user = this.currentUserSubject.value; //
    return user ? user.role : null; //
  }

  hasRole(role: string): boolean { //
    const userRole = this.getUserRole(); //
    return userRole === role; //
  }

  initializeAuth(): void { //
    console.log('Auth service: Checking authentication status...'); //
    this.getCurrentUser().subscribe({ //
      next: (user) => { //
        console.log('Auth service: User is authenticated', user); //
      },
      error: (error) => { //
        console.log('Auth service: User not authenticated', error); //
        this.clearAuthData(); //
      },
    });
  }

  private clearAuthData(): void {
    // Clear the refresh timer and subscription
    if (this.refreshTokenTimeout) {
      clearInterval(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
    
    this.removeToken();
    if (this.isBrowser) {
      localStorage.removeItem('lastPath');
    }
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  private clearAuthDataWithoutRedirect(): void {
    // Clear the refresh timer and subscription
    if (this.refreshTokenTimeout) {
      clearInterval(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
    
    this.removeToken();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    // Don't remove lastPath or redirect to preserve user's intended destination
  }

  private getDefaultPathForRole(role: string): string {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SUPPLIER':
        return '/supplier/supdashboard';
      case 'SALESPERSON':
        return '/sales/billingpart';
      default:
        return '/';
    }
  }

  private redirectUserBasedOnRole(role: string): void {
    const path = this.getDefaultPathForRole(role);
    this.router.navigate([path]);
  }
}