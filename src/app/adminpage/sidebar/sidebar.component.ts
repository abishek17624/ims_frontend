import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // <--- Import AuthService

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule,RouterLink,RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  constructor(private router: Router, private authService: AuthService) {} // <--- Inject AuthService

  confirmLogout() {
    if (confirm('Are you sure you want to log out?')) {
      this.authService.logout().subscribe({ // <--- Use AuthService logout
        next: () => {
          console.log('Logged out from sidebar successfully');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Logout from sidebar failed:', err);
          this.router.navigate(['/login']); // Fallback to ensure navigation
        }
      });
    }
  }
}