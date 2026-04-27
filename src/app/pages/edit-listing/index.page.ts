import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyService } from '../../services/property.service';
import { ToastrService } from 'ngx-toastr';
import { authGuard } from '../../auth.guard'; // Adjust path based on where your guard is
import { RouteMeta } from '@analogjs/router';
export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};

@Component({
  selector: 'app-edit-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './edit-listing.html',
  styleUrls: ['./edit-listing.css']
})
export default class EditListingComponent implements OnInit {
  
  listingId: string | null = null; // Changed to Number for safety
  isLoading = true;
  isSaving = false;
  
  listing: any = {};

  amenitiesList = [
    { key: 'hasWifi', label: 'Wifi' },
    { key: 'hasAc', label: 'AC' },
    { key: 'hasHeating', label: 'Heating' },
    { key: 'hasWasherDryer', label: 'Washer / Dryer' },
    { key: 'hasParking', label: 'Parking' },
    { key: 'hasGym', label: 'Gym' },
    { key: 'hasBalcony', label: 'Balcony' },
    { key: 'isPetFriendly', label: 'Pet Friendly' },
    { key: 'hasSmokeAlarm', label: 'Smoke Alarm' },
    { key: 'hasCoAlarm', label: 'CO Alarm' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef // 2. Inject ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Convert 'id' string from URL to a Number
    const idParam = this.route.snapshot.paramMap.get('id');
    this.listingId = idParam ? String(idParam) : null;
    
    if (this.listingId) {
      this.loadListingData();
    } else {
      this.toastr.error('Invalid Listing ID');
      this.router.navigate(['/my-listings']);
    }
  }

  loadListingData() {
    this.isLoading = true;
    // this.listingId is guaranteed to be number or null, but we checked it above
    this.propertyService.getListingById(String(this.listingId)).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        // Debug log to see if data arrives
        console.log('Edit Page Data:', res);

        if (res.status === 1) {
          this.listing = res.data;
        } else {
          this.toastr.error('Listing not found');
          this.router.navigate(['/my-listings']);
        }
        
        // 3. FORCE UPDATE
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading listing:', err);
        this.toastr.error('Error loading listing');
        
        // 3. FORCE UPDATE
        this.cd.detectChanges();
      }
    });
  }

  onSubmit() {
    if (this.isSaving) return;
    this.isSaving = true;

    const updatePayload = {
      final: {
        description: this.listing.description,
        rentAmount: this.listing.rentAmount
      },
      amenities: {
        wifi: this.listing.hasWifi,
        heating: this.listing.hasHeating,
        ac: this.listing.hasAc,
        washerDryer: this.listing.hasWasherDryer,
        parking: this.listing.hasParking,
        gym: this.listing.hasGym,
        balcony: this.listing.hasBalcony,
        pets: this.listing.isPetFriendly,
        smokeAlarm: this.listing.hasSmokeAlarm,
        coAlarm: this.listing.hasCoAlarm
      }
    };

    // Ensure we pass a Number ID to the update function
    this.propertyService.updateListing(this.listingId!, updatePayload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res.status === 1) {
          this.toastr.success('Property updated successfully');
          this.router.navigate(['/my-listings']);
        } else {
          this.toastr.error(res.message || 'Update failed');
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        console.error(err);
        this.toastr.error('Server error during update');
        this.cd.detectChanges();
      }
    });
  }

  cancel() {
    this.router.navigate(['/my-listings']);
  }
}