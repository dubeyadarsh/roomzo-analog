import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; // <-- Add this import
import { Router } from '@angular/router'; 
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule, MatSelectModule], // <-- Add MatSelectModule here
  templateUrl: './contact.html',
  styleUrls: ['./contact.css']
})
export class ContactComponent {
  contactForm: FormGroup;
  isSubmitting = false;

  // Contact Info Data
  contactInfo = [
    { 
      icon: 'phone', 
      title: 'Phone', 
      content: '+91 9250 782268', 
      sub: '' 
    },
    { 
      icon: 'email', 
      title: 'Email', 
      content: 'support@roomzo.in', 
      sub: '' 
    }
  ];

  constructor(private fb: FormBuilder, private router: Router, private toastr: ToastrService, private authService: AuthService) {
    this.contactForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
  }

 onSubmit() {
    if (this.contactForm.valid) {
      this.isSubmitting = true;

      const payload = {
        name: this.contactForm.value.fullName,
        email: this.contactForm.value.email,
        subject: this.contactForm.value.subject,
        message: this.contactForm.value.message
      };

      this.authService.sendContactForm(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          if (res.status === 1) {
            this.toastr.success('Message sent! We will contact you soon.', 'Success');
            this.contactForm.reset(); 
            // Reset the mat-select visually
            Object.keys(this.contactForm.controls).forEach(key => {
              this.contactForm.get(key)?.setErrors(null);
            });
          } else {
            this.toastr.error(res.message || 'Something went wrong.', 'Error');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Contact Form Error:', err);
          this.toastr.error('Failed to send message. Please try again later.', 'Server Error');
        }
      });
      
    } else {
      this.contactForm.markAllAsTouched(); 
      this.toastr.warning('Please fill in all required fields.', 'Invalid Form');
    }
  }

  goToFaq() {
    this.router.navigate(['/faq']);
  }
}