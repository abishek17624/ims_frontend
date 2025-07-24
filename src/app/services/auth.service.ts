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
      // Attempt to refresh token periodically
      setInterval(() => {
        if (this.getToken()) {
          this.refreshToken().subscribe();
        }
      }, 4 * 60 * 1000); // Refresh every 4 minutes
    }
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
    
    const token = this.getFromStorage('access_token');
    const userStr = this.getFromStorage('current_user');
    
    if (token && userStr) {
      this.setToken(token);
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        
        // Verify the stored user data with server
        this.getCurrentUser().subscribe({
          error: () => {
            // If verification fails, try token refresh
            this.refreshToken().subscribe({
              error: () => this.clearAuthData()
            });
          }
        });
      } catch (error) {
        this.clearAuthData();
      }
    }
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
            localStorage.setItem('lastPath', lastPath);
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
            console.log('Token refreshed successfully'); //
          }
        }),
        catchError((error) => { //
          console.error('Refresh token error:', error); //
          this.clearAuthData(); //
          this.router.navigate(['/login']); //
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
          if (!localStorage.getItem('lastPath')) {
            const lastPath = this.getDefaultPathForRole(user.role);
            localStorage.setItem('lastPath', lastPath);
          }
        }),
        catchError((error) => { //
          console.error('Get current user error:', error); //
          if (error.status === 401 || error.status === 404) { //
            this.clearAuthData(); //
          }
          return throwError(() => error); //
        })
      );
  }

  isLoggedIn(): boolean { //
    const hasUser = this.currentUserSubject.value !== null; //
    const isAuthenticated = this.isAuthenticatedSubject.value; //
    return hasUser || isAuthenticated; //
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
    this.removeToken();
    localStorage.removeItem('lastPath');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
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