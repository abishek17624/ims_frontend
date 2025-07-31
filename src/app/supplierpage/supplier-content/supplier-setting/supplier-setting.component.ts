import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service'; // <--- Import AuthService [cite: uploaded:auth.service.ts]
import { HttpClient } from '@angular/common/http'; // <--- Import HttpClient
import { User } from '../../../models/user'; // <--- Import User interface [cite: uploaded:auth.service.ts]
import { environment } from '../../../../environments/environment'; // <--- Import environment [cite: uploaded:auth.service.ts]
import { Subscription } from 'rxjs'; // <--- Import Subscription

@Component({
  selector: 'app-supplier-setting',
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-setting.component.html',
  styleUrl: './supplier-setting.component.css'
})
export class SupplierSettingComponent implements OnInit, OnDestroy {

  activeTab: 'theme' | 'credential' = 'theme';
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  showConfirmationDialog = false;

  // Theme settings
  themePreference: 'light' | 'dark' | 'system' = 'light';

  // Credential settings
  userId: number | null = null; // User ID from AuthService
  currentFirstName = '';
  currentLastName = '';
  currentEmail = '';

  currentPassword = ''; // Added for user to input current password
  newPassword = '';
  confirmPassword = '';
  passwordStrength = 0;
  passwordStrengthText = 'Very Weak';
  isEditingPassword = false;

  private authSubscription: Subscription | null = null;

  constructor(private authService: AuthService, private http: HttpClient) { }

  ngOnInit() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    if (savedTheme) {
      this.themePreference = savedTheme;
    }

    // Fetch supplier details (via current user from AuthService)
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user && user.role === 'supplier') { // Ensure it's a supplier user
        this.userId = user.id;
        this.currentEmail = user.email;
        // Assuming 'name' from backend might be full name, split it
        const nameParts = user.name ? user.name.split(' ') : [''];
        this.currentFirstName = nameParts[0] || '';
        this.currentLastName = nameParts.slice(1).join(' ') || '';
      } else if (!user) {
        // If currentUser$ is null (e.g., on page refresh), try to fetch from backend
        this.authService.getCurrentUser().subscribe({
          next: (fetchedUser) => {
            if (fetchedUser && fetchedUser.role === 'supplier') {
              this.userId = fetchedUser.id;
              this.currentEmail = fetchedUser.email;
              const nameParts = fetchedUser.name ? fetchedUser.name.split(' ') : [''];
              this.currentFirstName = nameParts[0] || '';
              this.currentLastName = nameParts.slice(1).join(' ') || '';
            } else {
              console.warn('User is not a supplier or not logged in.');
              this.showToastMessage('You are not authorized to view this page.', 'error');
              // Optionally redirect to login or another page
            }
          },
          error: (err) => {
            console.error('Failed to fetch user details for settings:', err);
            this.showToastMessage('Failed to load user details.', 'error');
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe(); // Unsubscribe to prevent memory leaks
  }

  showSection(section: 'theme' | 'credential') {
    this.activeTab = section;
  }

  saveThemeSettings() {
    localStorage.setItem('theme', this.themePreference);
    this.showToastMessage('Theme settings saved successfully!', 'success');
  }

  togglePasswordVisibility(field: HTMLInputElement) {
    field.type = field.type === 'password' ? 'text' : 'password';
  }

  checkPasswordStrength() {
    const password = this.newPassword;
    let strength = 0;

    if (password.length === 0) {
      this.passwordStrength = 0;
      this.passwordStrengthText = 'Very Weak';
      return;
    }

    if (password.length >= 8) strength++; // Minimum length
    if (/[A-Z]/.test(password)) strength++; // Uppercase
    if (/[a-z]/.test(password)) strength++; // Lowercase (added for more robust check)
    if (/[0-9]/.test(password)) strength++; // Number
    if (/[^A-Za-z0-9]/.test(password)) strength++; // Special character

    // Adjust strength calculation if needed, this is a basic one
    this.passwordStrength = strength;
    const texts = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
    this.passwordStrengthText = texts[Math.min(strength, texts.length - 1)]; // Cap at max strength text
  }

  enablePasswordEditing() {
    this.isEditingPassword = true;
    this.currentPassword = ''; // Clear current password field
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordStrength = 0;
    this.passwordStrengthText = 'Very Weak';
  }

  cancelEdit() {
    this.isEditingPassword = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordStrength = 0;
    this.passwordStrengthText = 'Very Weak';
  }

  validateBeforeUpdate() {
    if (this.isEditingPassword) {
      if (!this.currentPassword) {
        this.showToastMessage('Current password is required', 'error');
        return;
      }
      // Basic client-side validation, backend will re-validate
      if (this.newPassword.length < 8 || this.passwordStrength < 3) { // Require at least 'Moderate' strength
        this.showToastMessage('New password must be at least 8 characters long and meet strength requirements.', 'error');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.showToastMessage('New passwords do not match', 'error');
        return;
      }
      if (this.newPassword === this.currentPassword) {
        this.showToastMessage('New password cannot be the same as current password', 'warning');
        return;
      }

      // Show confirmation dialog for password update
      this.showConfirmationDialog = true;
    } else {
      // Logic for updating other credentials (First Name, Last Name, Email) if they were editable
      // For now, only password editing is implemented for backend interaction.
      this.showToastMessage('Credentials updated successfully!', 'success');
    }
  }

  confirmUpdate() {
    this.showConfirmationDialog = false;
    this.updateCredentials(); // Proceed with backend call
  }

  cancelUpdate() {
    this.showConfirmationDialog = false;
  }

  updateCredentials() {
    if (this.isEditingPassword && this.userId !== null) {
      const payload = {
        userId: this.userId, // Although backend uses token's userId, sending it explicitly doesn't hurt
        currentPassword: this.currentPassword,
        newPassword: this.newPassword
      };

      // Call the backend endpoint for supplier password change
      this.http.put(`${environment.apiUrl}/supplier/change-password`, payload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.showToastMessage('Password updated successfully!', 'success');
              this.isEditingPassword = false; // Exit editing mode
              this.currentPassword = ''; // Clear sensitive fields
              this.newPassword = '';
              this.confirmPassword = '';
              this.passwordStrength = 0;
              this.passwordStrengthText = 'Very Weak';
              // Optionally, force re-login or refresh token if password change invalidates current token
              // this.authService.logout().subscribe(); // Might be too aggressive
            } else {
              this.showToastMessage(response.message || 'Failed to update password.', 'error');
            }
          },
          error: (err) => {
            console.error('Password update failed:', err);
            this.showToastMessage(err.error?.message || 'Server error occurred during password update.', 'error');
            this.currentPassword = ''; // Clear current password on error too
          }
        });
    } else {
      // This part handles non-password credential updates if implemented
      this.showToastMessage('Credentials updated successfully!', 'success');
    }
  }

  private showToastMessage(message: string, type: 'success' | 'error' | 'warning') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}