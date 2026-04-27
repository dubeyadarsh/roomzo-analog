import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; // <-- 1. Added ActivatedRoute
import { AuthService } from '../../services/auth.service'; 
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-owner-auth',
  templateUrl: './owner-auth.html',
  styleUrls: ['./owner-auth.css'],
  imports: [ReactiveFormsModule, CommonModule]
})
export default class OwnerAuthComponent implements OnInit {
  // UI State Controls
  isSubmitting = false;
  isLoginMode = true;
  showOtpStep = false;
  isForgotPasswordMode = false;
  forgotPasswordStep: 1 | 2 | 3 = 1; // 1: Email/Phone, 2: OTP, 3: New Password
  recoveryEmail = '';
  maskedRecoveryEmail = '';

  // Form Groups
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  otpForm!: FormGroup;
  forgotInitForm!: FormGroup;
  forgotOtpForm!: FormGroup;
  forgotResetForm!: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute, // <-- 2. Injected ActivatedRoute here
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.initForms();
  }

  // --- Form Initializations & Validations ---
  private initForms() {
    // 1. Login Form
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required]
    });

    // 2. Registration Form
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z ]*$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[6-9]\\d{9}$')]], 
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$@$!%*?&#]).{8,}') 
      ]],
      confirmPassword: ['', Validators.required],
      ownerType: ['Hostel', Validators.required],

      // Advanced Fields
      propertyName: [''],
      alternatePhone: ['', Validators.pattern('^[6-9]\\d{9}$')]
    }, { 
      validators: this.passwordMatchValidator 
    });

    // 3. OTP Form
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]]
    });
    
    this.forgotInitForm = this.fb.group({
      identifier: ['', Validators.required]
    });

    this.forgotOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]]
    });

    this.forgotResetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$@$!%*?&#]).{8,}')]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // --- Custom Validators ---
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password !== confirmPassword && confirmPassword !== '') {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  }

  toggleMode(mode: 'login' | 'register') {
    this.isLoginMode = mode === 'login';
    this.isForgotPasswordMode = false;
    this.showOtpStep = false;
    this.loginForm.reset();
    this.registerForm.reset({ ownerType: 'Hostel' });
    this.cdr.detectChanges(); 
  }

  openForgotPassword() {
    this.isForgotPasswordMode = true;
    this.forgotPasswordStep = 1;
    this.forgotInitForm.reset();
    this.cdr.detectChanges(); 
  }

  cancelForgotPassword() {
    this.isForgotPasswordMode = false;
    this.isLoginMode = true;
    this.cdr.detectChanges(); 
  }


  // --- API Integrations via Service ---

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    
    this.isSubmitting = true; 
    
    this.authService.loginOwner(this.loginForm.value).subscribe({
      next: (res) => {
        if (res.status === 1) {
          this.isSubmitting = false; 
          this.toastr.success('Welcome back!', 'Login Successful');
          this.authService.saveSession(res.data.user); 

          // <-- 3. THE MAGIC REDIRECT LOGIC -->
          // Grab the returnUrl from the browser address bar, default to '/' if none exists
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);

        } else {
          this.toastr.error(res.message, 'Login Failed');
          this.isSubmitting = false; 
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false; 
        console.error('Login error', err);
        this.toastr.error('An error occurred during login. Please try again.', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  onRegisterInit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.authService.sendOtp(this.registerForm.value.email).subscribe({
      next: (res) => {
        if (res.status === 1) {
          this.toastr.info(`OTP sent to ${this.registerForm.value.email}`, 'Check your inbox');
          this.showOtpStep = true;
          this.cdr.detectChanges();
        } else {
          this.toastr.error(res.message, 'Failed to send OTP');
        }
      },
      error: (err) => {
        console.error('OTP Send error', err);
        this.toastr.error('Failed to send OTP. Please try again.', 'Server Error');
      }
    });
  }

  onRegisterComplete() {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const payload = { 
      ...this.registerForm.value, 
      otp: this.otpForm.value.otp 
    };
    
    this.authService.completeRegistration(payload).subscribe({
      next: (res) => {
        if (res.status === 1) {
          this.toastr.success('Your account is ready!', 'Registration Successful');
          this.toggleMode('login');
          this.cdr.detectChanges();
        } else {
          this.toastr.warning(res.message, 'Registration Notice');
        }
      },
      error: (err) => {
        console.error('Registration error', err);
        this.toastr.error('Registration failed. Please try again.', 'Server Error');
      }
    });
  }

  onForgotInit() {
    if (this.forgotInitForm.invalid) {
      this.forgotInitForm.markAllAsTouched();
      return;
    }

    const identifier = this.forgotInitForm.value.identifier;
    this.authService.forgotPasswordInit(identifier).subscribe({
      next: (res) => {
        if (res.status === 1) {
          this.recoveryEmail = res.data.email; 
          this.maskedRecoveryEmail = res.data.maskedEmail; 
          this.forgotPasswordStep = 2; 

          this.toastr.info(res.message);
          this.cdr.detectChanges();

        } else {
          this.toastr.error(res.message, 'Account Not Found');
        }
      },
      error: () => this.toastr.error('Server error. Please try again later.')
    });
  }

  onForgotOtpSubmit() {
    if (this.forgotOtpForm.invalid) {
      this.forgotOtpForm.markAllAsTouched();
      return;
    }
    this.forgotPasswordStep = 3; 
  }

  onForgotReset() {
    if (this.forgotResetForm.invalid) {
      this.forgotResetForm.markAllAsTouched();
      return;
    }

    const payload = {
      email: this.recoveryEmail,
      otp: this.forgotOtpForm.value.otp,
      password: this.forgotResetForm.value.password
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        if (res.status === 1) {
          this.toastr.success(res.message, 'Success!');
          this.cancelForgotPassword(); 
          this.cdr.detectChanges();

        } else {
          this.toastr.error(res.message, 'Reset Failed');
          if (res.message.includes('OTP') || res.message.includes('expired')) {
             this.forgotPasswordStep = 2; 
             this.cdr.detectChanges();
          }
        }
      },
      error: () => this.toastr.error('Server error. Please try again later.')
    });
  }
}