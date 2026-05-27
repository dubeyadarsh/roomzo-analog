import { Component, OnInit, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyService } from '../../services/property.service';
import { Subscription, switchMap, tap } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { getAmenitiesMap } from '../../services/Utility';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './property-details.html',
  styleUrls: ['./property-details.css']
})
export default class PropertyDetailsComponent implements OnInit, OnDestroy {
  property: any | undefined;
  similarProperties: any[] = [];
  displayAmenities: any[] = [];
  
  ownerName: string = 'Property Owner'; 

  isLoading = true;
  showFullDescription = false;
  currentId: string | null = null;
  mapUrl: SafeResourceUrl | null = null; 
  isCopied = false;

  showContactModal = false;
  showReportModal = false;
  reportReason = '';
  reportDescription = '';
  
  reportReasonsList = [
    'Scam or Fraud',
    'Incorrect Information',
    'Property No Longer Available',
    'Offensive Content',
    'Other'
  ];

  ownerDetails = {
    name: 'Property Owner', 
    ownerPhone: '',
    propertyPhone: '',
    email: 'hidden@roomzo.com'
  };

  isBrowser = isPlatformBrowser(this.platformId);
  activePhotoIndex = 0; // State for the native mobile gallery
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.pipe(
      tap(() => {
        this.isLoading = true;
        this.property = undefined;
        this.similarProperties = [];
        this.mapUrl = null; 
        this.showContactModal = false; 
        this.activePhotoIndex = 0; // Reset gallery index on new property load
        
        if (this.isBrowser) {
          window.scrollTo(0, 0);
        }
        
        this.cd.detectChanges();
      }),
      switchMap(params => {
        this.currentId = params.get('id');
        if (!this.currentId) {
            this.toastr.error('Invalid Property ID', 'Error');
            throw new Error('No ID');
        }
        return this.propertyService.getListingById(this.currentId);
      })
    ).subscribe({
      next: (response: any) => {
        if (response.status === 1 && response.data) {
          this.property = response.data;
          
          this.ownerName = response.ownerName || 'Property Owner';
          if (this.property.guidebook && Array.isArray(this.property.guidebook.rules)) {
            this.property.guidebook.rules = this.property.guidebook.rules.filter(
              (r: any) => (r && r.ruleText) || (typeof r === 'string' && r.trim() !== '')
            );
          }
          this.mapAmenities(this.property);
          this.checkReturnFromLogin();
          this.checkFocusContact();
          if (this.isBrowser) {
            this.loadMapCoordinates(this.property);
            this.loadSuggestions(this.property);
          }

        } else {
            this.toastr.warning('Property data not found', 'Not Found');
        }
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error:', err);
        this.toastr.error('Failed to load property details.', 'Server Error');
        this.isLoading = false;
        this.cd.detectChanges();
      }
    });
  }

  // Mobile Native Gallery Methods
  nextPhoto(event: Event) {
    event.stopPropagation();
    if (this.property?.photos) {
      this.activePhotoIndex = (this.activePhotoIndex + 1) % this.property.photos.length;
    }
  }

  prevPhoto(event: Event) {
    event.stopPropagation();
    if (this.property?.photos) {
      this.activePhotoIndex = (this.activePhotoIndex - 1 + this.property.photos.length) % this.property.photos.length;
    }
  }

  setActivePhoto(index: number) {
    this.activePhotoIndex = index;
  }

  contactAgent() {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      this.openContactModal();
    } else {
      const returnUrl = `/property-details/${this.currentId}?showContact=true`;
      this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  isUserLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    const isVerified = localStorage.getItem('userVerifiedwWIthOtp');
    const loginTime = localStorage.getItem('userloginTimestamp');
    const ONE_DAY = 1 * 24 * 60 * 60 * 1000;
    if (isVerified === 'true' && loginTime) {
      const timeElapsed = Date.now() - parseInt(loginTime, 10);
      return timeElapsed < ONE_DAY;
    }
    return false;
  }
  
  isOwnerLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    const isVerified = localStorage.getItem('ownerVerifiedwWIthOtp');
    const loginTime = localStorage.getItem('loginTimestamp');
    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
    if (isVerified === 'true' && loginTime) {
      const timeElapsed = Date.now() - parseInt(loginTime, 10);
      return timeElapsed < TEN_DAYS;
    }
    return false;
  }
  
  checkReturnFromLogin() {
    const params = this.route.snapshot.queryParams;
    if (params['showContact'] === 'true' && ( this.isUserLoggedIn() || this.isOwnerLoggedIn() )) {
      this.openContactModal();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { showContact: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      this.clearQueryParams();
    } else if (params['action'] === 'report' && ( this.isUserLoggedIn() || this.isOwnerLoggedIn() )) {
      this.openReportModal(); 
      this.clearQueryParams();
    }
  }

  private clearQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { showContact: null, action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  openContactModal() {
    if (!this.property || !this.property.ownerId) {
       this.toastr.error('Owner information not available');
       return;
    }
    this.isLoading = true;
    this.authService.getOwnerDetails(this.property.ownerId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 1 && res.data) {
          this.ownerDetails = {
            name: res.data.name,
            ownerPhone: res.data.phone, 
            propertyPhone: this.property.contactNo || this.property.tempContactNo, 
            email: res.data.email
          };
          this.showContactModal = true;
          this.cd.detectChanges();
        } else {
          this.toastr.error('Could not fetch owner details');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Failed to load contact info');
      }
    });
  }

  closeContactModal() {
    this.showContactModal = false;
  }

  openImage(url: string | undefined): void {
    if (url && this.isBrowser) {
      window.open(url, '_blank');
    }
  }

  loadMapCoordinates(property: any) {
    if (property.latitude && property.longitude) {
      const lat = property.latitude;
      const lon = property.longitude;
      const offset = 0.02; 
      const bbox = `${Number(lon)-offset},${Number(lat)-offset},${Number(lon)+offset},${Number(lat)+offset}`;
      const rawUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
      
      this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
      this.cd.detectChanges();
      return; 
    }

    if (property.city && property.state) {
      this.propertyService.getGeocode(property.city, property.state).subscribe({
        next: (results: any[]) => {
          if (results && results.length > 0) {
            const location = results[0];
            const lat = location.lat;
            const lon = location.lon;
            const offset = 0.02; 
            const bbox = `${Number(lon)-offset},${Number(lat)-offset},${Number(lon)+offset},${Number(lat)+offset}`;
            const rawUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
            
            this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
            this.cd.detectChanges();
          }
        },
        error: () => this.toastr.warning('Could not load map location', 'Map Error')
      });
    }
  }

  shareProperty() {
    if (this.isBrowser && navigator.clipboard) {
      const currentUrl = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: this.property ? `${this.property.propertyType} in ${this.property.city}` : 'Check out this property',
          text: this.property ? `${this.property.propertyType} in ${this.property.city} — ${this.formatPrice(this.property.rentAmount)}/mo` : 'Check out this rental listing',
          url: currentUrl,
        }).catch((err) => {
          if (err?.name !== 'AbortError') {
            this.toastr.error('Sharing failed', 'Error');
          }
        });
      } else {
        navigator.clipboard.writeText(currentUrl).then(() => {
          this.isCopied = true;
          this.toastr.success('Link copied to clipboard!', 'Shared');
          setTimeout(() => {
            this.isCopied = false;
            this.cd.detectChanges();
          }, 2000);
          this.cd.detectChanges();
        }).catch(() => {
          this.toastr.error('Failed to copy link', 'Error');
        });
      }
    }
  }

  scheduleTour() { this.toastr.info('Tour scheduling feature coming soon!', 'Coming Soon'); }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
  
  loadSuggestions(property: any) {
    if (!property) return;
    const isRentedVal = false; 

    if (property.latitude && property.longitude) {
      const filters: any = {
        lat: property.latitude,
        lng: property.longitude,
        propertyType: property.propertyType 
      };

      this.propertyService.searchListingsWithFilters(0, 4, filters, isRentedVal).subscribe({
        next: (res: any) => this.processSuggestions(res, property.id),
        error: (err) => console.error('Failed to load spatial suggestions:', err)
      });
    } else if (property.city && property.state) {
      this.propertyService.searchListings(property.state, property.city, 0, 4, isRentedVal).subscribe({
        next: (res: any) => this.processSuggestions(res, property.id),
        error: (err) => console.error('Failed to load location suggestions:', err)
      });
    }
  }

  private processSuggestions(res: any, currentPropertyId: string) {
    if (res && res.listings) {
      let filtered = res.listings.filter((p: any) => String(p.id) !== String(currentPropertyId));
      this.similarProperties = filtered.slice(0, 3);
      this.cd.detectChanges();
    }
  }

  mapAmenities(propData: any) {
    if (!propData) return;
    const config = getAmenitiesMap();
    this.displayAmenities = config.filter(c => propData[c.dbKey] === true);
  }

  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString() : '0');
  }

  openGoogleMaps(): void {
    if (!this.property) return;
    let destination = '';

    if (this.property.latitude && this.property.longitude) {
      destination = `${this.property.latitude},${this.property.longitude}`;
    } 
    else if (this.property.city || this.property.street) {
      const addressParts = [
        this.property.street,
        this.property.landmark,
        this.property.city,
        this.property.state,
        this.property.zipCode
      ];
      destination = encodeURIComponent(
        addressParts.filter(part => part && String(part).trim() !== '').join(', ')
      );
    }

    if (destination) {
      if (this.isBrowser) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
        window.open(googleMapsUrl, '_blank');
      }
    } else {
      this.toastr.warning('Location details are not available for this property.', 'Location Unavailable');
    }
  }

  reportProperty() {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      this.openReportModal(); 
    } else {
      const returnUrl = `/property-details/${this.currentId}?action=report`;
      this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  submitReport() {
    if (!this.reportReason) {
      this.toastr.warning('Please select a reason for reporting.', 'Missing Info');
      return;
    }

    const finalReason = this.reportReason + (this.reportDescription ? ` - Details: ${this.reportDescription}` : '');

    const payload = {
      propertyId: this.currentId,
      propertyName: `${this.property?.propertyType} in ${this.property?.city}`,
      ownerId: this.property?.ownerId,
      reason: finalReason,
      reporterEmail: localStorage.getItem('userEmail') || 'Unknown User' 
    };

    this.propertyService.reportProperty(payload).subscribe({
      next: (res: any) => {
        if (res.status === 1) {
          this.toastr.success('Property reported successfully. Our team will look into it.', 'Reported');
          this.closeReportModal(); 
        } else {
          this.toastr.error('Could not submit report.', 'Error');
        }
      },
      error: (err) => {
        console.error('Report error:', err);
        this.toastr.error('Failed to report property.', 'Server Error');
      }
    });
  }

  openReportModal() {
    this.reportReason = '';
    this.reportDescription = '';
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }
  // NEW: Helper method to format description into bullet points
  get formattedDescription(): string[] {
    if (!this.property || !this.property.description) return [];
    
    // Split by '|', remove extra whitespace, and filter out any empty strings
    return this.property.description
      .split('|')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);
  }
  
highlightContact = false;
checkFocusContact() {
  const params = this.route.snapshot.queryParams;
  if (params['focusContact'] === 'true') {
    this.highlightContact = true;
    this.cd.detectChanges();
    
    if (this.isBrowser) {
      setTimeout(() => {
        // Target the button inside the booking card (works for both desktop and mobile flow)
        const targetBtn = document.querySelector('.booking-card .btn-primary');
        if (targetBtn) {
          targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Remove highlight animation after 3 seconds and clean the URL
        setTimeout(() => {
          this.highlightContact = false;
          this.cd.detectChanges();
          
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { focusContact: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }, 3000);
      }, 300); // Brief delay to ensure DOM is fully rendered
    }
  }
}
}