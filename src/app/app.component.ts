import { Component, inject, OnInit } from '@angular/core'; // <--- Add OnInit
import { RouterOutlet, Router } from '@angular/router'; //
import { CommonModule } from '@angular/common'; //
import { AuthService } from './services/auth.service'; // <--- Import AuthService
import { AuthDebugService } from './services/auth-debug.service'; // Import debug service
import { filter } from 'rxjs/operators'; // For potential future use

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet], //
  templateUrl: './app.component.html', //
  styleUrls: ['./app.component.css'] //
})
export class AppComponent implements OnInit { // <--- Implement OnInit
  title = 'i_m_s'; //
  authService = inject(AuthService); // Inject AuthService
  authDebugService = inject(AuthDebugService); // Inject debug service

  constructor(private router: Router) { } //

  ngOnInit(): void {
    console.log('🚀 App Component initialized - Authentication system ready');
    
    // Log initial auth state for debugging
    this.authDebugService.logAuthState();

    // Optional: Subscribe to authentication changes to react in app component if needed
    this.authService.currentUser$.subscribe(user => {
      console.log('App Component - currentUser changed:', user ? `${user.name} (${user.role})` : 'null');
    });
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