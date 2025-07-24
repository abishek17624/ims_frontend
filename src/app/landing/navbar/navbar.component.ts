import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
// import { LoginComponent } from '../login/login.component'; // Adjust the path as needed

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule,RouterModule,RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  showSearch = false;
  @ViewChild('searchInput') searchInput!: ElementRef;

  // Toggle search bar visibility
  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (this.showSearch) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 100);
    }
  }

  // Smooth scroll to section
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Optional: Hide navbar on scroll down, show on scroll up
  lastScrollPosition = 0;
  
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const currentScrollPosition = window.scrollY;
    const navbar = document.getElementById('navbar');
    
    if (navbar) {
      if (currentScrollPosition > this.lastScrollPosition && currentScrollPosition > 100) {
        // Scroll down
        navbar.style.transform = 'translateY()';
      } else {
        // Scroll up
        navbar.style.transform = 'translateY(0)';
      }
    }
    
    this.lastScrollPosition = currentScrollPosition;
  }
}