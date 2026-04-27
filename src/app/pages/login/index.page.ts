import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export default class LoginComponent {
  
  step: 'EMAIL' | 'OTP' = 'EMAIL'; // Changed step name
  email: string = '';              // Changed from mobileNumber
  otp: string = '';
  isLoading = false;
  returnUrl: string = '/list';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/list';
  }

  onSendOtp() {
    // Basic Email Validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    
    if (!this.email || !emailPattern.test(this.email)) {
      this.toastr.warning('Please enter a valid email address');
      return;
    }

    this.isLoading = true;
    
    // Call Service with Email
    this.authService.sendOtp(this.email).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 1) {
          this.step = 'OTP';
          this.cd.detectChanges();
          this.toastr.success(`OTP sent to ${this.email}`, 'Sent!');
        } else {
            this.toastr.error(res.message || 'Failed to send OTP');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.toastr.error('Failed to connect to server.');
      }
    });
  }

  onVerifyOtp() {
    if (!this.otp || this.otp.length < 4) {
      this.toastr.warning('Please enter the valid OTP');
      return;
    }

    this.isLoading = true;
    
    // Verify using Email + OTP
    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 1) {
          console.log('Login Success:', res);
          
          // Save Session (Updated to store email)
          this.authService.saveSessionForSeeingOwnerDetails(this.email);
          
          this.toastr.success('Login Successful', 'Welcome');
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.toastr.error('Invalid OTP. Please try again.', 'Error');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Verification failed. Server error.');
      }
    });
  }
}