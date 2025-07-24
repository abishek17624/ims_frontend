import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, LoginResponse } from '../models/user';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
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
    @Inject(PLATFORM_ID) private platformId: Object
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

  private async initializeAuthOnStartup() {
    try {
      const token = this.getFromStorage('access_token');
      const userStr = this.getFromStorage('current_user');

      if (token && userStr) {
        this.setToken(token);
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }
    } catch (error) {
      console.error('Error during auth initialization:', error);
      this.clearAuthData();
    }
  }

  private getFromStorage(key: string): string | null {
    try {
      return this.isBrowser ? (sessionStorage.getItem(key) || localStorage.getItem(key)) : null;
    } catch {
      return null;
    }
  }

  private setInStorage(key: string, value: string): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error('Storage error:', error);
      }
    }
  }

  private removeFromStorage(key: string): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error('Storage error:', error);
      }
    }
  }

  getToken(): string | null {
    return this.getFromStorage('access_token');
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

  login(email: string, password: string): Observable<LoginResponse> {
    const body = { email, password };
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, body, {
      withCredentials: true,
    }).pipe(
      tap((response) => {
        if (response.success && response.user && response.accessToken) {
          this.setToken(response.accessToken);
          this.setUserData(response.user);
          
          if (this.isBrowser) {
            const lastPath = this.getDefaultPathForRole(response.user.role);
            this.setInStorage('lastPath', lastPath);
            this.redirectUserBasedOnRole(response.user.role);
          }
        }
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.clearAuthData();
        }),
        catchError((error) => {
          console.error('Logout error:', error);
          this.clearAuthData();
          return throwError(() => error);
        })
      );
  }

  private clearAuthData(): void {
    this.accessToken = null;
    this.removeFromStorage('access_token');
    this.removeFromStorage('current_user');
    this.removeFromStorage('lastPath');
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

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.setUserData(user);
        }),
        catchError((error) => {
          if (error.status === 401 || error.status === 404) {
            this.clearAuthData();
          }
          return throwError(() => error);
        })
      );
  }

  refreshToken(): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/auth/refresh-token`,
      {},
      { withCredentials: true }
    ).pipe(
      tap((response: any) => {
        if (response.success && response.accessToken) {
          this.setToken(response.accessToken);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError((error) => {
        console.error('Refresh token error:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null && this.isAuthenticatedSubject.value;
  }

  getUserRole(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.role : null;
  }

  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }
}
