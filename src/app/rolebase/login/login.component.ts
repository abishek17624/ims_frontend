import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // <--- Import AuthService

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  invalidCredentials = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService // <--- Inject AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [{ value: '', disabled: false }, [ //
        Validators.required,
        Validators.minLength(8), //
        // Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/) //
      ]],
    });

    // Remove email dependent password enable/disable if not strictly needed
    // this.loginForm.get('email')?.valueChanges.subscribe(() => { ... });
  }

  get email() {
    return this.loginForm.get('email')!; //
  }

  get password() {
    return this.loginForm.get('password')!; //
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword; //
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched(); //

    if (this.loginForm.invalid) { //
      return;
    }

    this.isLoading = true; //
    this.invalidCredentials = false; //

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({ // <--- Use AuthService.login()
      next: (response) => {
        console.log('Login successful', response); //
        // The AuthService's login method already handles redirection based on role
        // via `redirectUserBasedOnRole()`. So, no manual navigation needed here.
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Login failed', err); //
        this.invalidCredentials = true;
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.'; //
        this.isLoading = false;
      }
    });
  }

  getEmailError(): string {
    if (this.email.hasError('required')) { //
      return 'Email is required'; //
    }
    if (this.email.hasError('email')) { //
      return 'Please enter a valid email'; //
    }
    return ''; //
  }

  getPasswordError(): string {
    if (this.password.hasError('required')) { //
      return 'Password is required'; //
    }
    if (this.password.hasError('minlength')) { //
      return 'Password must be at least 8 characters'; //
    }
    // if (this.password.hasError('pattern')) { //
    //   return 'Password must contain at least one uppercase, one lowercase, one number, and one special character'; //
    // }
    return ''; //
  }

  // Add a property for error message
  errorMessage: string | null = null;
}