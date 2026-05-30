import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { FlatmateService } from '../../services/flatmate.service';

@Component({
  selector: 'app-post-flatmate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './post-flatmate.html',
  styleUrls: ['./post-flatmate.css']
}) 
export default class PostFlatmateComponent   {
  postForm: FormGroup;
  isSubmitting = false;
  isDetectingLocation = false;
  
  // Arrays
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  preferences: string[] = [];
    locationDetected: boolean = false;
ngOnInit() {
    this.checkUserStatus();
  }
  constructor(
    private fb: FormBuilder,
    private flatmateService: FlatmateService,
    private toastr: ToastrService,
    private router: Router,
private zone: NgZone // <-- Inject NgZone here
  ) {
    this.postForm = this.fb.group({
      name: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(18), Validators.max(99)]],
      gender: ['', Validators.required],
      profession: ['', Validators.required],
      budget: ['', Validators.required],
      flatAddress: ['', Validators.required],
      latitude: [''],
      longitude: [''],
      bio: ['', [Validators.required, Validators.maxLength(1000)]],
      tempPreference: [''] // Temporary field for the input box
    });
  }
private updateState(key: string, value: any) {
    setTimeout(() => {
      this.zone.run(() => {
        (this as any)[key] = value;
      });
    });
  }
// 2. Updated detectLocation with safe async execution
  detectLocation() {
    if (!navigator.geolocation) {
      this.toastr.error('Geolocation not supported');
      return;
    }

    // Set loading state safely
    this.updateState('isDetectingLocation', true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
          const data = await res.json();
          const addr = data.address || {};
          
          const exactAddress = data.display_name;

          // Patch form and update UI flags in the next tick
          setTimeout(() => {
            this.zone.run(() => {
              this.postForm.patchValue({
                latitude: lat,
                longitude: lng,
                flatAddress: exactAddress,
                city: addr.city || addr.town || '',
                state: addr.state || ''
              });
              this.locationDetected = true;
              this.isDetectingLocation = false;
              this.toastr.success('Address pinned!');
            });
          });
        } catch (e) {
          this.updateState('isDetectingLocation', false);
          this.toastr.error('Failed to resolve address');
        }
      },
      () => {
        this.updateState('isDetectingLocation', false);
        this.toastr.error('Permission denied');
      },
      { enableHighAccuracy: true }
    );
  }

  // --- Habit Tags ---
  addPreference(event: Event) {
    event.preventDefault();
    const val = this.postForm.get('tempPreference')?.value.trim();
    if (val && !this.preferences.includes(val)) {
      this.preferences.push(val);
      this.postForm.get('tempPreference')?.setValue('');
    }
  }

  removePreference(index: number) {
    this.preferences.splice(index, 1);
  }

  // --- Photos ---
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (this.selectedFiles.length >= 5) {
          this.toastr.warning('Max 5 images allowed');
          break;
        }
        this.selectedFiles.push(files[i]);
        const reader = new FileReader();
        reader.onload = (e: any) => this.previewUrls.push(e.target.result);
        reader.readAsDataURL(files[i]);
      }
    }
  }

  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }
// --- Submission ---
  onSubmit() {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      this.toastr.error('Please fill all required fields correctly.');
      return;
    }

    this.isSubmitting = true;

    // Step 1: Upload images to Hostinger FIRST
    if (this.selectedFiles.length > 0) {
      this.flatmateService.uploadImagesToHostinger(this.selectedFiles).subscribe({
        next: (uploadRes: any) => {
          // Adapt this based on exactly what your upload.php returns. 
          // Assuming it returns an array of URLs or an object containing them.
          const imageUrls = uploadRes.urls || uploadRes; 
          this.submitFinalData(imageUrls);
        },
        error: () => {
          this.isSubmitting = false;
          this.toastr.error('Failed to upload images to server.', 'Upload Error');
        }
      });
    } else {
      // If no images were selected, just submit with an empty array
      this.submitFinalData([]);
    }
  }

  // Step 2: Send the final JSON to Spring Boot
  private submitFinalData(imageUrls: string[]) {
    const raw = this.postForm.value;

    const payload = {
      name: raw.name,
      age: raw.age,
      gender: raw.gender,
      profession: raw.profession,
      budget: String(raw.budget), // Ensure it's a string
      bio: raw.bio,
      
      flatAddress: raw.flatAddress,
      city: raw.city,
      // state: raw.state, // Only uncomment if you added 'state' to your FlatmatePost.java
      latitude: raw.latitude || null,
      longitude: raw.longitude || null,
      
      preferences: this.preferences,
      images: imageUrls // Automatically attaches the Hostinger URLs!
    };

    // Notice we only pass ONE argument now: the payload
    this.flatmateService.createPost(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res.status === 1 || res.status === 'success') {
          this.toastr.success('Your profile is now live!', 'Success');
          this.router.navigate(['/flatmates']);
        } else {
          this.toastr.error(res.message || 'Upload Failed', 'Error');
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.toastr.error('Server error. Please try again.');
      }
    });
  }
  // Predefined habits optimized for your target demographic
  predefinedHabits: string[] = [
    'UPSC/SSC Aspirant', 'Pure Veg', 'Non-Veg Allowed', 'Quiet/Study Vibe', 
    'Early Riser', 'Night Owl', 'Non-Smoker', 'Fitness Enthusiast', 'Working Professional'
  ];

  // Toggle selection (Limit to 5 choices so the profile doesn't get cluttered)
  togglePreference(habit: string) {
    const index = this.preferences.indexOf(habit);
    
    if (index > -1) {
      // If already selected, remove it
      this.preferences.splice(index, 1);
    } else {
      // If not selected, add it (with a max limit of 5)
      if (this.preferences.length < 5) {
        this.preferences.push(habit);
      } else {
        this.toastr.warning('You can select a maximum of 5 habits', 'Limit Reached');
      }
    }
  }
  // Make sure this is in your index.page.ts
isInvalid(field: string): boolean {
  const control = this.postForm.get(field);
  return !!(control && control.invalid && (control.touched || control.dirty));
}
checkUserStatus() {
    this.flatmateService.checkUserPostStatus().subscribe({
      next: (res: any) => {
        if (res.data === true) { // If user already has a post
          this.toastr.warning('You already have an active flatmate listing.');
          this.router.navigate(['/flatmates']);
        }
      }
    });
  }
}