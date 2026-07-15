import { afterNextRender, Component, Inject, PLATFORM_ID, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core'; 
import { ToastrService } from 'ngx-toastr';

import { HeroComponent } from '../components/hero/hero';
import { ContactComponent } from '../components/contact/contact';
import { ListingCardComponent } from '../components/listing-card/listing-card';
import { PropertyService } from '../services/property.service';
import { mapBackendListingsToUi } from '../services/Utility';
import { RouteMeta } from '@analogjs/router';
import { ROOMZO_CITIES, buildCityPath, slugifyCity } from '../config/cities.config';

export const routeMeta: RouteMeta = {
  title: 'Roomzo — Rooms, PG & Flats for Rent | Direct Owner Contact',
  meta: [
    {
      name: 'description',
      content:
        'Find rooms, PGs, and flats listed by owners across India. Browse on Roomzo, contact owners directly, and follow safety tips before you pay or move in.',
    },
    {
      name: 'keywords',
      content:
        'room for rent, student housing, pg for rent, flat for rent, owner contact rentals, roomzo',
    },
    { property: 'og:title', content: 'Roomzo | Rooms, PG & Flats with Direct Owner Contact' },
    {
      property: 'og:description',
      content: 'Owner-listed rentals with city guides and safety tips. Browse, contact, then visit before you pay.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: 'https://www.roomzo.in/assets/og-roomzo-share.jpg' },
  ],
};

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
  isFavorite?: boolean;
  postedDate?: string; 
  contactNo?: string;     // Added to support contact logic
  tempContactNo?: string; // Added to support contact logic
}

@Component({
  selector: 'app-home',
  standalone: true,
  // Added SafetyConsentBottomSheetComponent to imports
  imports: [CommonModule, HeroComponent, MatIconModule, MatButtonModule, ContactComponent, RouterModule, SafetyConsentBottomSheetComponent, ListingCardComponent],
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

  popularCities = ROOMZO_CITIES.map((city) => ({
    name: city.name,
    state: city.state,
    image: city.heroImage,
    active: city.active,
    slug: city.slug,
  }));

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
    this.syncFavoriteStateFromStorage();
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
    
    this.propertyService.getRecentListings(10).subscribe(
      (response: any) => {
        if (response.listings && response.listings.length > 0) {
          this.listings = mapBackendListingsToUi(response.listings);
          this.syncFavoriteStateFromStorage();
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
    this.router.navigate(['/room', id]);
  }

  toggleSavedListing(item: Listing): void {
    const isLoggedIn = this.isUserLoggedIn() || this.isOwnerLoggedIn();
    if (!isLoggedIn) {
      localStorage.setItem('pendingFavoritePropertyId', String(item.id));
      const shouldNavigate = window.confirm('Please log in to save this property. Would you like to go to the login page now?');
      if (shouldNavigate) {
        this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: this.router.url } });
      }
      return;
    }

    const nextValue = !item.isFavorite;
    const propertyId = String(item.id);

    item.isFavorite = nextValue;

    const request = nextValue
      ? this.propertyService.saveFavoriteProperty(propertyId)
      : this.propertyService.removeFavoriteProperty(propertyId);

    request.subscribe({
      next: (res: any) => {
        if (res?.status === 1 || res?.status === '1') {
          this.toastr.success(nextValue ? 'Property saved to favorites.' : 'Property removed from favorites.');
        } else {
          item.isFavorite = !nextValue;
          this.toastr.error(res?.message || 'Could not update favorites right now.');
        }
        this.cd.detectChanges();
      },
      error: () => {
        item.isFavorite = !nextValue;
        this.toastr.error('Could not update favorites right now.');
        this.cd.detectChanges();
      }
    });
  }

  scrollToContact(id: number): void {
    this.router.navigate(['/room', id], {
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

        this.propertyService.searchListingsWithFilters(0, 10, { lat, lng, sortBy: 'nearest' }).subscribe(
          (res: any) => {
            if (res.listings && res.listings.length > 0) {
              this.nearbyListings = mapBackendListingsToUi(res.listings);
              this.syncFavoriteStateFromStorage();
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

  exploreCity(cityName: string, _stateName: string) {
    this.router.navigate(['/city', slugifyCity(cityName)]);
  }

  // ==========================================
  // --- SAFETY CONSENT & CONTACT LOGIC ---
  // ==========================================

  syncFavoriteStateFromStorage(): void {
    const favoriteIds = this.propertyService.getFavoritePropertyIds();
    const favoriteSet = new Set(favoriteIds.map(String));

    this.listings = this.listings.map((listing) => ({ ...listing, isFavorite: favoriteSet.has(String(listing.id)) }));
    this.nearbyListings = this.nearbyListings.map((listing) => ({ ...listing, isFavorite: favoriteSet.has(String(listing.id)) }));
    this.cd.detectChanges();
  }

  checkReturnFromLogin() {
    if (isPlatformBrowser(this.platformId) && (this.isUserLoggedIn() || this.isOwnerLoggedIn())) {
      const pendingFavorite = localStorage.getItem('pendingFavoritePropertyId');
      if (pendingFavorite) {
        localStorage.removeItem('pendingFavoritePropertyId');
        this.propertyService.saveFavoriteProperty(pendingFavorite).subscribe({
          next: (res: any) => {
            if (res?.status === 1 || res?.status === '1') {
              this.toastr.success('Property saved to favorites.');
              this.syncFavoriteStateFromStorage();
            }
          },
          error: () => {
            this.toastr.error('Could not save your favorite right now.');
          }
        });
      }

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
      this.router.navigate(['/flatmates']);
      break;
    case 'room':
      this.router.navigate(['/category/rooms-for-rent']);
      break;
    case 'pg':
      this.router.navigate(['/category/pg-for-rent']);
      break;
    case 'flat':
      this.router.navigate(['/category/flats-for-rent']);
      break;
    default:
      this.router.navigate(['/explore-listing'], { queryParams: { propertyType: 'Any' } });
      break;
  }
}
}