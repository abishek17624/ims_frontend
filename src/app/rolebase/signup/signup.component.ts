import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, RouterModule, CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  signUpForm: FormGroup;
  currentStep = 1;
  steps = ['Basic Info', 'Contact', 'Security', 'Terms'];
  formInvalid = false;
  showPassword = false;
  showConfirmPassword = false;
  showToast = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.signUpForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    return password && confirmPassword && password.value !== confirmPassword.value 
      ? { passwordMismatch: true } 
      : null;
  };

  nextStep() {
    // Mark current step fields as touched to trigger validation
    switch (this.currentStep) {
      case 1:
        this.signUpForm.get('username')?.markAsTouched();
        this.signUpForm.get('phone')?.markAsTouched();
        if (this.signUpForm.get('username')?.valid && this.signUpForm.get('phone')?.valid) {
          this.currentStep++;
          this.formInvalid = false;
        } else {
          this.formInvalid = true;
        }
        break;
      case 2:
        this.signUpForm.get('email')?.markAsTouched();
        if (this.signUpForm.get('email')?.valid) {
          this.currentStep++;
          this.formInvalid = false;
        } else {
          this.formInvalid = true;
        }
        break;
      case 3:
        this.signUpForm.get('password')?.markAsTouched();
        this.signUpForm.get('confirmPassword')?.markAsTouched();
        if (this.signUpForm.get('password')?.valid && this.signUpForm.get('confirmPassword')?.valid) {
          this.currentStep++;
          this.formInvalid = false;
        } else {
          this.formInvalid = true;
        }
        break;
    }
  }

  prevStep() {
    this.currentStep--;
    this.formInvalid = false;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.signUpForm.valid) {
      // Here you would typically make an API call to register the user
      console.log('Form submitted:', this.signUpForm.value);
      
      // Simulate successful registration
      this.showSuccessToast();
    } else {
      // Mark all fields as touched to show validation messages
      this.signUpForm.markAllAsTouched();
    }
  }

  showSuccessToast() {
    this.showToast = true;
    
    // Hide toast after 3 seconds and navigate to login
    setTimeout(() => {
      this.showToast = false;
      this.router.navigate(['/login']);
    }, 1000);
  }
}