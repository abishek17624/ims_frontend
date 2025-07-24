import { Component, inject, OnInit } from '@angular/core'; // <--- Add OnInit
import { RouterOutlet, Router, RouterLink } from '@angular/router'; //
import { CommonModule } from '@angular/common'; //
import { AuthService } from './services/auth.service'; // <--- Import AuthService
import { filter } from 'rxjs/operators'; // For potential future use

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink], //
  templateUrl: './app.component.html', //
  styleUrls: ['./app.component.css'] //
})
export class AppComponent implements OnInit { // <--- Implement OnInit
  title = 'i_m_s'; //
  authService = inject(AuthService); // Inject AuthService

  constructor(private router: Router) { } //

  ngOnInit(): void {
    // Optional: Subscribe to authentication changes to react in app component if needed
    // this.authService.isAuthenticated$.subscribe(isAuthenticated => {
    //   console.log('App Component - isAuthenticated:', isAuthenticated);
    // });
    // this.authService.currentUser$.subscribe(user => {
    //   console.log('App Component - currentUser:', user);
    // });
  }

  onLogout(): void {
    // Instead of local storage clear, use authService.logout()
    this.authService.logout().subscribe({ //
      next: () => {
        console.log('Logged out successfully');
        this.router.navigate(['/login']); //
      },
      error: (err) => {
        console.error('Logout failed:', err); //
        // Even if backend logout fails, clear local state and navigate
        this.router.navigate(['/login']); //
      }
    });
  }
}