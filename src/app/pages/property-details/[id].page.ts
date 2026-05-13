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

import { register } from 'swiper/element/bundle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
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
  
  // UPDATED: Hold both phone numbers
  ownerDetails = {
    name: 'Property Owner', 
    ownerPhone: '',
    propertyPhone: '',
    email: 'hidden@roomzo.com'
  };

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
  ) {
    if (isPlatformBrowser(this.platformId)) {
      register();
    }
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.pipe(
      tap(() => {
        this.isLoading = true;
        this.property = undefined;
        this.similarProperties = [];
        this.mapUrl = null; 
        this.showContactModal = false; 
        
        if (isPlatformBrowser(this.platformId)) {
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
          this.loadMapCoordinates(this.property);
          this.checkReturnFromLogin();
          this.loadSuggestions(this.property);

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

  contactAgent() {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      this.openContactModal();
    } else {
      const returnUrl = `/property-details/${this.currentId}?showContact=true`;
      this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  isUserLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

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
    if (!isPlatformBrowser(this.platformId)) return false;

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
    if (params['showContact'] === 'true' && this.isUserLoggedIn()) {
      this.openContactModal();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { showContact: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  // UPDATED: Capture both contact numbers for the modal
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
            ownerPhone: res.data.phone, // The account's registered number
            propertyPhone: this.property.contactNo || this.property.tempContactNo, // The number listed specifically for this property
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

  // NEW: Method to open image in a new tab safely
  openImage(url: string | undefined): void {
    if (url && isPlatformBrowser(this.platformId)) {
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
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      const currentUrl = window.location.href;
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

  saveProperty() { this.toastr.success('Property saved to your favorites', 'Saved'); }
  requestBooking() { this.contactAgent(); } 
  scheduleTour() { this.toastr.info('Tour scheduling feature coming soon!', 'Coming Soon'); }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
  
  loadSuggestions(property: any) {
    const filters: any = {};
    
    if (property.latitude && property.longitude) {
      filters.lat = property.latitude;
      filters.lng = property.longitude;
    } else if (property.city && property.state) {
      filters.city = property.city;
      filters.state = property.state;
    }

    this.propertyService.searchListingsWithFilters(0, 4, filters, false).subscribe({
      next: (res: any) => {
        if (res.listings) {
          let filtered = res.listings.filter((p: any) => String(p.id) !== String(property.id));
          
          if (filtered.length > 3) {
            filtered = filtered.slice(0, 3);
          }
          
          this.similarProperties = filtered;
          this.cd.detectChanges();
        }
      },
      error: () => console.warn('Failed to load similar properties')
    });
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
      if (isPlatformBrowser(this.platformId)) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
        window.open(googleMapsUrl, '_blank');
      }
    } else {
      this.toastr.warning('Location details are not available for this property.', 'Location Unavailable');
    }
  }
}