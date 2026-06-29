import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyService } from '../../services/property.service';
import { ToastrService } from 'ngx-toastr';
import { authGuard } from '../../auth.guard'; 
import { RouteMeta } from '@analogjs/router';
export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

@Component({
  selector: 'app-edit-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './edit-listing.html',
  styleUrls: ['./edit-listing.css']
})
export default class EditListingComponent implements OnInit {
  
  listingId: string | null = null; 
  isLoading = true;
  isSaving = false;
  
  listing: any = {};

  // NEW: Tier-2 specific amenities mapping
  amenitiesList = [
    { key: 'hasBed', label: 'Bed & Mattress' },
    { key: 'hasAlmirah', label: 'Almirah / Cupboard' },
    { key: 'hasStudyTable', label: 'Study Table & Chair' },
    { key: 'hasFanLight', label: 'Fan & Light' },
    { key: 'hasRoWater', label: 'RO Water' },
    { key: 'hasInverter', label: 'Power Backup' },
    { key: 'hasCooling', label: 'AC / Cooler' },
    { key: 'hasGeyser', label: 'Geyser (Hot Water)' },
    { key: 'hasWifi', label: 'Wi-Fi' },
    { key: 'hasParking', label: 'Parking' },
    { key: 'hasCctv', label: 'CCTV Security' },
    { key: 'hasWashingMachine', label: 'Washing Machine' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
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
    this.propertyService.getListingById(String(this.listingId)).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        if (res.status === 1) {
          this.listing = res.data;
          
          // NEW: Reformat the description for the textarea (replace '|' with newlines)
          if (this.listing.description) {
            this.listing.description = this.listing.description
              .split('|')
              .map((line: string) => line.trim())
              .filter((line: string) => line.length > 0)
              .join('\n');
          }
          
        } else {
          this.toastr.error('Listing not found');
          this.router.navigate(['/my-listings']);
        }
        
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading listing:', err);
        this.toastr.error('Error loading listing');
        this.cd.detectChanges();
      }
    });
  }

  onSubmit() {
    if (this.isSaving) return;
    this.isSaving = true;

    // NEW: Format the description for the backend (replace newlines with ' | ')
    const formattedDescription = this.listing.description
      ? this.listing.description
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join(' | ')
      : '';

    const updatePayload = {
      final: {
        description: formattedDescription, // Send the pipe-separated version
        rentAmount: this.listing.rentAmount
      },
      amenities: {
        bed: this.listing.hasBed,
        almirah: this.listing.hasAlmirah,
        studyTable: this.listing.hasStudyTable,
        fanLight: this.listing.hasFanLight,
        roWater: this.listing.hasRoWater,
        inverter: this.listing.hasInverter,
        cooling: this.listing.hasCooling,
        geyser: this.listing.hasGeyser,
        wifi: this.listing.hasWifi,
        parking: this.listing.hasParking,
        cctv: this.listing.hasCctv,
        washingMachine: this.listing.hasWashingMachine
      }
    };

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