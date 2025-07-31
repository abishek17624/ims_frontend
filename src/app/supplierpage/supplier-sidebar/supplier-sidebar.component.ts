import { CommonModule } from '@angular/common'; //
import { Component } from '@angular/core'; //
import { Router, RouterLink, RouterModule } from '@angular/router'; //
import { AuthService } from '../../services/auth.service'; // <--- Import AuthService

@Component({
  selector: 'app-supplier-sidebar',
  imports: [CommonModule, RouterLink,RouterModule], //
  templateUrl: './supplier-sidebar.component.html', //
  styleUrl: './supplier-sidebar.component.css'
})
export class SupplierSidebarComponent {
   constructor(private router: Router, private authService: AuthService) {} // <--- Inject AuthService

  confirmLogout() {
    if (confirm('Are you sure you want to log out?')) {
      this.authService.logout().subscribe({ // <--- Use AuthService.logout()
        next: () => {
          console.log('Logged out from supplier sidebar successfully');
          this.router.navigate(['/login']); // Redirect to login page
        },
        error: (err) => {
          console.error('Logout from supplier sidebar failed:', err);
          this.router.navigate(['/login']); // Still redirect even if backend logout fails
        }
      });
    }
  }
}