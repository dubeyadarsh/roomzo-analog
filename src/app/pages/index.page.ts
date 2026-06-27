import { afterNextRender, Component, Inject, PLATFORM_ID, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core'; 
import { ToastrService } from 'ngx-toastr'; // Added for contact error messages

import { HeroComponent } from '../components/hero/hero';
import { ContactComponent } from '../components/contact/contact';
import { PropertyService } from '../services/property.service';
import { mapBackendListingsToUi } from '../services/Utility';

// Added Safety Consent Imports (Adjust path if needed based on your folder structure)
import { SafetyConsentBottomSheetComponent, PendingAction } from '../components/safety-consent/safety-consent';

interface Listing {
  id: number;
  title: string;
  location: string;
  price: number;
  priceUnit?: string; 
  image: string;
  badge: { text: string; color: 'blue' | 'green' | 'purple' };
  specs: { beds: number; baths: number; area: number };
  rating?: number;
  isFavorite: boolean;
  postedDate?: string; 
  contactNo?: string;     // Added to support contact logic
  tempContactNo?: string; // Added to support contact logic
}

@Component({
  selector: 'app-home',
  standalone: true,
  // Added SafetyConsentBottomSheetComponent to imports
  imports: [CommonModule, HeroComponent, MatIconModule, MatButtonModule, ContactComponent, RouterModule, SafetyConsentBottomSheetComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export default class HomeComponent implements OnInit {
  @ViewChild('carouselGrid') carouselGrid!: ElementRef;
  @ViewChild('nearbyCarouselGrid', { static: false }) nearbyCarouselGrid!: ElementRef;
  
  listings: Listing[] = [];
  isLoading: boolean = true;
  nearbyListings: Listing[] = [];
  isLoadingNearby: boolean = false;
  nearbyIsAtStart: boolean = true;
  nearbyIsAtEnd: boolean = false;
  currentCarouselIndex: number = 0;
  carouselItemsToShow: number = 3; 
  isAtStart: boolean = true;
  isAtEnd: boolean = false;
  
  Math = Math; 

  // --- Safety Consent State Signals ---
  userHasGivenConsent = signal(false); 
  isConsentModalOpen = signal(false);
  pendingAction = signal<PendingAction | any>(null);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private propertyService: PropertyService, 
    private cd: ChangeDetectorRef,
    private toastr: ToastrService, // Added Toastr for feedback
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    afterNextRender(() => {
      this.calculateItemsToShow();
      this.fetchRecentListings();
      this.fetchNearbyProperties(); 
      if (isPlatformBrowser(this.platformId)) {
        window.addEventListener('resize', () => this.calculateItemsToShow());
      }
    });
  }

  popularCities = [
    { 
      name: 'Prayagraj', 
      state: 'Uttar Pradesh', 
      image: 'prayagraj.jpeg',
      active: true
    },
    { 
      name: 'Varanasi', 
      state: 'Uttar Pradesh', 
      image: 'banaras.jpg',
      active: true
    },
    { 
      name: 'Pune', 
      state: 'Maharashtra', 
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80',
      active: true
    },
    { 
      name: 'Mumbai', 
      state: 'Maharashtra', 
      image: 'https://images.unsplash.com/photo-1522256658092-1279a04a6fc6?w=400&q=80',
      active: false
    },
    { 
      name: 'Jaipur', 
      state: 'Rajasthan', 
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&q=80',
      active: false
    },
    { 
      name: 'Kota', 
      state: 'Rajasthan', 
      image: 'https://images.unsplash.com/photo-1565019018445-560b435af769?w=400&q=80',
      active: false
    }
  ];

  ngOnInit(): void {
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'contact' && isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          const contactElement = document.querySelector('app-contact');
          if (contactElement) {
            contactElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    });

    // Added: Check if returning from Login for Call/WhatsApp
    this.checkReturnFromLogin();
  }

  calculateItemsToShow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const width = window.innerWidth;
    if (width < 600) {
      this.carouselItemsToShow = 1; // Mobile
    } else if (width < 900) {
      this.carouselItemsToShow = 2; // Tablet
    } else {
      this.carouselItemsToShow = 3; // Desktop
    }
    
    this.onScroll();
    this.cd.detectChanges();
  }

  fetchRecentListings() {
    this.isLoading = true;
    
    this.propertyService.getRecentListings(5).subscribe(
      (response: any) => {
        if (response.listings && response.listings.length > 0) {
          this.listings = mapBackendListingsToUi(response.listings);
          this.calculateItemsToShow();
        }
        this.isLoading = false;
        
        this.cd.detectChanges();
        
        setTimeout(() => this.onScroll(), 100);
      },
      (error) => {
        console.error('Error fetching recent listings:', error);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    );
  }

  onScroll(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    
    const el = this.carouselGrid.nativeElement;
    
    this.isAtStart = el.scrollLeft <= 0;
    this.isAtEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;

    const card = el.querySelector('.listing-card');
    if (card) {
      const cardWidth = card.offsetWidth;
      const gap = parseInt(window.getComputedStyle(el).gap) || 0;
      this.currentCarouselIndex = Math.round(el.scrollLeft / (cardWidth + gap));
    }
    
    this.cd.detectChanges();
  }

  scrollLeft(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
  }

  scrollRight(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: (cardWidth + gap), behavior: 'smooth' });
  }

  scrollToIndex(index: number): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
  }

  getVisibleIndices(): number[] {
    const visible = [];
    for (let i = 0; i < this.carouselItemsToShow && this.currentCarouselIndex + i < this.listings.length; i++) {
      visible.push(this.currentCarouselIndex + i);
    }
    return visible;
  }

  formatPrice(price: number): string {
    return price >= 10000
      ? '₹' + (price / 1000).toFixed(0) + 'k'
      : '₹' + price.toLocaleString();
  }

  formatPostedDate(dateString?: string): string {
    if (!dateString) return 'Recently posted';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    if (diffInMs < 0) return 'Just now';

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  viewDetails(id: any): void {
    this.router.navigate(['/property-details', id]);
  }

  scrollToContact(id: number): void {
    this.router.navigate(['/property-details', id], { 
      queryParams: { focusContact: 'true' } 
    });
  }

  fetchNearbyProperties(): void {
    if (!isPlatformBrowser(this.platformId) || !('geolocation' in navigator)) return;

    this.isLoadingNearby = true;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.propertyService.searchListingsWithFilters(0, 5, { lat, lng, sortBy: 'nearest' }).subscribe(
          (res: any) => {
            if (res.listings && res.listings.length > 0) {
              this.nearbyListings = mapBackendListingsToUi(res.listings);
            }
            this.isLoadingNearby = false;
            this.cd.detectChanges();
            setTimeout(() => this.onNearbyScroll(), 100);
          },
          (err) => {
            console.error('Error fetching nearby listings', err);
            this.isLoadingNearby = false;
            this.cd.detectChanges();
          }
        );
      },
      (error) => {
        console.warn('Geolocation denied or failed', error);
        this.isLoadingNearby = false;
        this.cd.detectChanges();
      }
    );
  }

  onNearbyScroll(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    this.nearbyIsAtStart = el.scrollLeft <= 0;
    this.nearbyIsAtEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
    this.cd.detectChanges();
  }

  scrollNearbyLeft(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
  }

  scrollNearbyRight(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: (cardWidth + gap), behavior: 'smooth' });
  }

  exploreCity(cityName: string, stateName: string) {
    this.router.navigate(['/explore-city'], { 
      queryParams: { city: cityName, state: stateName } 
    });
  }

  // ==========================================
  // --- SAFETY CONSENT & CONTACT LOGIC ---
  // ==========================================

  checkReturnFromLogin() {
    if (isPlatformBrowser(this.platformId) && (this.isUserLoggedIn() || this.isOwnerLoggedIn())) {
      const pending = localStorage.getItem('pendingAction');
      
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          localStorage.removeItem('pendingAction'); 

          this.propertyService.getListingById(parsed.propertyId).subscribe({
            next: (res: any) => {
              if (res.status === 1 && res.data) {
                this.handleCardContactAction(res.data, parsed.action);
              }
            }
          });
        } catch (e) {
          localStorage.removeItem('pendingAction');
        }
      }
    }
  }

  handleCardContactAction(item: Listing, actionType: 'call' | 'whatsapp') {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      const actionPayload = { prop: item, actionType };
      
      this.checkAndExecuteConsent(actionPayload, () => {
        this.executeContactAction(item, actionType);
      });
      
    } else {
      const returnUrl = this.router.url;
      localStorage.setItem('pendingAction', JSON.stringify({ action: actionType, propertyId: item.id }));
      this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  private executeContactAction(item: Listing, actionType: 'call' | 'whatsapp') {
    const phone = item.contactNo || item.tempContactNo;
    
    if (!phone) {
      // Fetch full object if phone is missing from mapped UI model
      this.propertyService.getListingById(item.id.toString()).subscribe((res: any) => {
          const p = res.data;
          const phoneNum = p.contactNo || p.tempContactNo;
          if (phoneNum) {
            this.propertyService.triggerPhoneAndWP(phoneNum, actionType, p);
          } else {
            this.toastr.error('Contact number not available');
          }
      });
      return;
    }
    
    this.propertyService.triggerPhoneAndWP(phone, actionType, item);
  }

  private checkAndExecuteConsent(actionData: any, successCallback: () => void) {
    if (this.userHasGivenConsent() || (isPlatformBrowser(this.platformId) && localStorage.getItem('safetyConsentGiven') === 'true')) {
      this.userHasGivenConsent.set(true);
      successCallback();
      return;
    }

    let userId = null;
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try { userId = JSON.parse(storedUser).id; } catch (e) {}
      }
    }

    if (userId) {
      this.propertyService.checkSafetyConsent(userId).subscribe({
        next: (res: any) => {
          if (res.status === 1 && res.hasConsent) {
            if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
            this.userHasGivenConsent.set(true);
            successCallback();
          } else {
            this.pendingAction.set(actionData);
            this.isConsentModalOpen.set(true);
            this.cd.detectChanges(); 
          }
        },
        error: () => {
          this.pendingAction.set(actionData);
          this.isConsentModalOpen.set(true);
          this.cd.detectChanges();
        }
      });
    } else {
      this.pendingAction.set(actionData);
      this.isConsentModalOpen.set(true);
      this.cd.detectChanges();
    }
  }

  onConsentAccepted(action: any) {
    let userId = null;
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try { userId = JSON.parse(storedUser).id; } catch (e) {}
      }
    }

    const proceedWithAction = () => {
      this.executeContactAction(action.prop, action.actionType);
    };

    if (userId) {
      this.propertyService.updateSafetyConsent(userId, true).subscribe({
        next: (res: any) => {
          if (res.status === 1) {
            this.userHasGivenConsent.set(true);
            if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
            proceedWithAction();
          } else {
            this.toastr.error('Failed to record consent. Please try again.');
          }
        },
        error: (err) => {
          console.error('Consent save error:', err);
          this.toastr.error('Server error while recording consent.');
        }
      });
    } else {
      this.userHasGivenConsent.set(true);
      if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
      proceedWithAction();
    }
  }

  isUserLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!(localStorage.getItem('token') || localStorage.getItem('user'));
  }

  isOwnerLoggedIn(): boolean {
    return this.isUserLoggedIn(); 
  }

  navigateToCategory(type: string): void {
  switch (type) {
    case 'flatmate':
      // Isolated view routing target for flatmates matching
      this.router.navigate(['/flatmates']);
      break;
      
    case 'room':
      this.router.navigate(['/explore-listing'], { queryParams: { propertyType: 'Room' } });
      break;
      
    case 'pg':
      this.router.navigate(['/explore-listing'], { queryParams: { propertyType: 'PG' } });
      break;
      
    case 'flat':
      this.router.navigate(['/explore-listing'], { queryParams: { propertyType: 'Flat' } });
      break;
      
    default:
      this.router.navigate(['/explore-listing'], { queryParams: { propertyType: 'Any' } });
      break;
  }
}
}