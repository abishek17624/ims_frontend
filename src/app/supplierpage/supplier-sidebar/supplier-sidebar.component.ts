import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';


@Component({
  selector: 'app-supplier-sidebar',
  imports: [CommonModule, RouterLink,RouterModule],
  templateUrl: './supplier-sidebar.component.html',
  styleUrl: './supplier-sidebar.component.css'
})
export class SupplierSidebarComponent {
   constructor(private router: Router) {}

  confirmLogout() {
    if (confirm('Are you sure you want to log out?')) {
      // Perform logout logic here (clear session, etc.)
      this.router.navigate(['/login']);
    }
  }
}
