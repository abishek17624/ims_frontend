import { inject } from '@angular/core'; //
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router'; //
import { catchError, map, of, switchMap, take } from 'rxjs'; //
import { AuthService } from '../../services/auth.service'; //

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => { //
  const authService = inject(AuthService); //
  const router = inject(Router); //

  const expectedRoles = route.data['roles'] as string[]; //

  return authService.currentUser$.pipe( //
    take(1), //
    switchMap((user) => { //
      if (!user) { //
        return authService.getCurrentUser().pipe( //
          map((fetchedUser) => { //
            if (!fetchedUser) { //
              router.navigate(['/login']); //
              return false; //
            }
            return checkUserRole(fetchedUser, expectedRoles, router); //
          }),
          catchError(() => { //
            router.navigate(['/login']); //
            return of(false); //
          })
        );
      } else { //
        return of(checkUserRole(user, expectedRoles, router)); //
      }
    })
  );
};

function checkUserRole( //
  user: any,
  expectedRoles: string[],
  router: Router
): boolean {
  if (!expectedRoles || expectedRoles.length === 0) { //
    return true; //
  }

  const hasRole = expectedRoles.some( //
    (role) => user.role.toUpperCase() === role.toUpperCase() //
  );

  if (!hasRole) { //
    console.log('Role guard: User does not have required role', { //
      userRole: user.role,
      expectedRoles,
    });

    switch (user.role.toUpperCase()) { //
      case 'ADMIN': //
        router.navigate(['/admin/dashboard']); //
        break; //
      case 'SUPPLIER': //
        router.navigate(['/supplier/supdashboard']); //
        break; //
      case 'SALESPERSON': //
        router.navigate(['/sales/billingpart']); //
        break;
    }
    return false; //
  }

  console.log('Role guard: User has required role', { //
    userRole: user.role,
    expectedRoles,
  });
  return true; //
}