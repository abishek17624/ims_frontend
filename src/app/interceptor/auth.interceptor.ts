import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service'; //

export const authInterceptor: HttpInterceptorFn = (req, next) => { //
  console.log('Auth Interceptor - Request URL:', req.url); //

  const authService = inject(AuthService); //
  const token = authService.getToken(); //

  let authRequest = req.clone({ //
    setHeaders: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), //
    },
    withCredentials: true, //
  });

  console.log('Auth Interceptor - Token present:', !!token); //

  return next(authRequest).pipe( //
    catchError((error: HttpErrorResponse) => { //
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') && //
        !req.url.includes('/auth/register') && //
        !req.url.includes('/auth/refresh-token') //
      ) {
        console.log('Auth Interceptor - 401 error, attempting token refresh'); //

        return authService.refreshToken().pipe( //
          switchMap((response: any) => { //
            const newToken = authService.getToken(); //
            const retryRequest = req.clone({ //
              setHeaders: {
                'Content-Type': 'application/json',
                ...(newToken && { Authorization: `Bearer ${newToken}` }), //
              },
              withCredentials: true, //
            });
            return next(retryRequest); //
          }),
          catchError((refreshError) => { //
            console.log('Auth Interceptor - Token refresh failed'); //
            authService.logout().subscribe(); //
            return throwError(() => refreshError); //
          })
        );
      }

      return throwError(() => error); //
    })
  );
};