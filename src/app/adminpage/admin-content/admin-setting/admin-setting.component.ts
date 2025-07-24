import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { User } from '../../../models/user';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-setting',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-setting.component.html',
  styleUrl: './admin-setting.component.css'
})
export class AdminSettingComponent implements OnInit, OnDestroy {

  activeTab: 'theme' | 'credential' = 'theme';
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  showConfirmationDialog = false;

  // Theme settings
  themePreference: 'light' | 'dark' | 'system' = 'light';

  // Credential settings
  userId: number | null = null;
  currentFirstName = '';
  currentLastName = '';
  currentEmail = '';

  currentPassword = ''; // Field for current password input
  newPassword = '';
  confirmPassword = '';
  passwordStrength = 0;
  passwordStrengthText = 'Very Weak';
  isEditingPassword = false;

  private authSubscription: Subscription | null = null;

  constructor(private authService: AuthService, private http: HttpClient) {
  }

  ngOnInit() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    if (savedTheme) {
      this.themePreference = savedTheme;
    }

    // Fetch admin details
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.id;
        this.currentEmail = user.email;
        const nameParts = user.name.split(' ');
        this.currentFirstName = nameParts[0] || '';
        this.currentLastName = nameParts.slice(1).join(' ') || '';
      } else {
        // If currentUser$ is null (e.g., on page refresh), try to fetch from backend
        this.authService.getCurrentUser().subscribe({
          next: (fetchedUser) => {
            if (fetchedUser) {
              this.userId = fetchedUser.id;
              this.currentEmail = fetchedUser.email;
              const nameParts = fetchedUser.name.split(' ');
              this.currentFirstName = nameParts[0] || '';
              this.currentLastName = nameParts.slice(1).join(' ') || '';
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

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    this.passwordStrength = strength;
    const texts = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
    this.passwordStrengthText = texts[strength];
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
      if (this.newPassword.length < 8) {
        this.showToastMessage('New password must be at least 8 characters long', 'error');
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
      this.showToastMessage('Credentials updated successfully!', 'success');
    }
  }

  confirmUpdate() {
    this.showConfirmationDialog = false;
    this.updateCredentials();
  }

  cancelUpdate() {
    this.showConfirmationDialog = false;
  }

  updateCredentials() {
    if (this.isEditingPassword && this.userId !== null) {
      const payload = {
        userId: this.userId,
        currentPassword: this.currentPassword,
        newPassword: this.newPassword
      };

      // API call to the backend endpoint for changing password in admin.routes.js
      this.http.put(`${environment.apiUrl}/admin/change-password`, payload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.showToastMessage('Password updated successfully!', 'success');
              this.isEditingPassword = false;
              this.currentPassword = '';
              this.newPassword = '';
              this.confirmPassword = '';
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