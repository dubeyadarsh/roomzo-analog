import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyService } from '../../services/property.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select'; // <-- 1. Import MatSelect
import { authGuard } from '../../auth.guard'; // Adjust path based on where your guard is
import { RouteMeta } from '@analogjs/router';
export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink, MatSelectModule],
  templateUrl: './my-listings.html',
  styleUrls: ['./my-listings.css']
})
export default class MyListingsComponent implements OnInit {

  listings: any[] = [];
  isLoading = true; // Starts as true
  ownerId: number | null = null;

  constructor(
    private propertyService: PropertyService,
    private router: Router,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef // 2. Inject ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const storedUser = JSON.parse(localStorage.getItem('ownerUser') || 'null'); 
    if (storedUser && storedUser.id) {
      this.ownerId = parseInt(storedUser.id, 10);
          this.loadMyListings();
    } else {
      this.toastr.error('User not logged in');
      this.isLoading = false; // Stop loading if no user
    }

  }

  loadMyListings() {
    if (!this.ownerId) {
      console.error('Cannot load listings: Owner ID is missing');
      this.isLoading = false; // Stop loading if no ID
      return;
    }

    this.isLoading = true;
    
    this.propertyService.getMyListings(this.ownerId).subscribe({
      next: (res: any) => {
        // DEBUG: See exactly what backend sent
        console.log('Backend Response:', res);

        this.isLoading = false; 

        if (res && res.status === 1) {
          this.listings = res.data || [];
          console.log('Listings set to:', this.listings);
        } else {
          this.toastr.warning('Could not fetch listings');
        }
        
        // 3. FORCE UI UPDATE
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('API Error:', err);
        this.isLoading = false;
        this.toastr.error('Server error fetching listings');
        
        // 3. FORCE UI UPDATE
        this.cd.detectChanges();
      }
    });
  }

  editProperty(id: number) {
    this.router.navigate(['/edit-listing', id]);
  }
  
  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString() : '0');
  }
  getStatusClass(status: string): string {
  switch (status) {
    case 'RENTED': return 'badge-rented';
    case 'EXPIRED': return 'badge-expired';
    case 'HIDDEN': return 'badge-hidden';

    default: return 'badge-active';
  }
}
changeStatus(property: any, event: any) {
  const newStatus = event.target.value;
  const originalStatus = property.currentStatus; // Backup in case of error

  // Optimistic UI Update (Change it immediately on screen)
  property.currentStatus = newStatus; 

  this.propertyService.updateListingStatus(property.id, newStatus).subscribe({
    next: (res) => {
      this.toastr.success(`Status updated to ${newStatus}`);
      this.cd.detectChanges();
    },
    error: (err: HttpErrorResponse) => {
      // Revert if failed
      property.currentStatus = originalStatus; 
      this.toastr.error('Failed to update status');
      console.error(err);
      this.cd.detectChanges();
    }
  });
}
// Add this inside your MyListingsComponent class
getStatusLabel(status: any): string {
  const code = Number(status); // Ensure it's a number
  if (code === 1) return 'RENTED';
  if (code === 2) return 'HIDDEN';
  if (code === 3) return 'EXPIRED';
  return 'ACTIVE'; // Default for 0 or null
}
}