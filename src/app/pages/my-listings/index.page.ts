import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyService } from '../../services/property.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu'; // NEW: For the dropdown
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog'; // NEW: For the dialog
import { authGuard } from '../../auth.guard'; 
import { RouteMeta } from '@analogjs/router';
import { MatDividerModule } from '@angular/material/divider';
export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

// --- NEW: Standalone Confirmation Dialog Component ---
@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="margin-bottom: 8px;">Delete Property</h2>
    <mat-dialog-content>
      <p style="margin: 0; color: #475569;">Are you sure you want to delete this listing? This action will permanently remove the property and all its photos. It cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom: 16px; padding-right: 16px;">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true" style="background-color: #ef4444; color: white;">Delete</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDeleteDialogComponent {}

// --- Main Component ---
@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatButtonModule, 
    RouterLink, 
    MatSelectModule, 
    MatMenuModule, // Added
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './my-listings.html',
  styleUrls: ['./my-listings.css']
})
export default class MyListingsComponent implements OnInit {

  listings: any[] = [];
  isLoading = true; 
  ownerId: number | null = null;

  constructor(
    private propertyService: PropertyService,
    private router: Router,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog // NEW: Inject MatDialog
  ) {}

  ngOnInit(): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null'); 
    if (storedUser && storedUser.id) {
      this.ownerId = parseInt(storedUser.id, 10);
      this.loadMyListings();
    } else {
      this.toastr.error('User not logged in');
      this.isLoading = false; 
    }
  }

  loadMyListings() {
    if (!this.ownerId) {
      this.isLoading = false; 
      return;
    }

    this.isLoading = true;
    
    this.propertyService.getMyListings(this.ownerId).subscribe({
      next: (res: any) => {
        this.isLoading = false; 
        if (res && res.status === 1) {
          this.listings = res.data || [];
        } else {
          this.toastr.warning('Could not fetch listings');
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('API Error:', err);
        this.isLoading = false;
        this.toastr.error('Server error fetching listings');
        this.cd.detectChanges();
      }
    });
  }

  editProperty(id: number) {
    this.router.navigate(['/edit-listing', id]);
  }

  // --- NEW: Delete Logic ---
  deleteProperty(id: number) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // User clicked "Delete"
        this.propertyService.deleteListing(id).subscribe({
          next: (res: any) => {
            if (res.status === 1) {
              // Remove immediately from UI array
              this.listings = this.listings.filter(p => p.id !== id);
              this.toastr.success('Listing deleted successfully');
              this.cd.detectChanges();
            } else {
              this.toastr.error(res.message || 'Failed to delete listing');
            }
          },
          error: (err) => {
            console.error('Delete error:', err);
            this.toastr.error('Server error while deleting property');
          }
        });
      }
    });
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
    const newStatus = event.value; 
    const originalStatus = property.isRented; 
    property.isRented = newStatus; 

    this.propertyService.updateListingStatus(property.id, newStatus).subscribe({
      next: (res) => {
        this.toastr.success(`Status updated successfully`);
        this.cd.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        property.isRented = originalStatus; 
        this.toastr.error('Failed to update status on server');
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  getStatusLabel(status: any): string {
    const code = Number(status); 
    if (code === 1) return 'RENTED';
    if (code === 2) return 'HIDDEN';
    if (code === 3) return 'EXPIRED';
    return 'ACTIVE'; 
  }

  formatPostedDate(dateString?: string): string {
    if (!dateString) return 'Recently posted';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    else if (diffInHours < 24) return `${diffInHours}h ago`;
    else if (diffInDays < 7) return `${diffInDays}d ago`;
    else return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}