import { Component, OnInit, ChangeDetectorRef, OnDestroy, Inject, PLATFORM_ID, NgZone, HostListener, Renderer2, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router'; 
import { HttpClient } from '@angular/common/http'; 
import { AuthService } from '../../services/auth.service';
import { Subscription, of, forkJoin } from 'rxjs';
import { finalize, debounceTime, distinctUntilChanged, switchMap, catchError, filter, map } from 'rxjs/operators'; 
import { ToastrService } from 'ngx-toastr';

import { PropertyService, ListingFilter } from '../../services/property.service';
import { RouteMeta } from '@analogjs/router';

// Safety Consent Import
import { SafetyConsentBottomSheetComponent, PendingAction } from '../../components/safety-consent/safety-consent';

export const routeMeta: RouteMeta = {
  title: 'Roomzo : Trusted Rooms, PG & Flats Near You | No Broker | No Fake Listing',
  meta: [
    { 
      name: 'description', 
      content: 'Find 100% broker-free rooms, PGs, and flats for rent in Prayagraj (Katra, Civil Lines), Varanasi (Lanka, BHU), and Pune. Connect directly with owners.' 
    },
    { 
      name: 'keywords', 
      content: 'room rent in prayagraj, pg in varanasi, flat for rent in pune, brokerless pg, katra room rent, civil lines flats, allahpur pg, mumfordganj, teliyarganj, naini, jhunsi, dhoomanganj, lanka varanasi pg, bhu rooms, assi ghat, sigra, mahmoorganj, pandeypur, sarnath, hinjewadi pg, viman nagar flats, kothrud rooms, wakad, baner, zero brokerage roomzo, agentless rental platform' 
    },
    { property: 'og:title', content: '100% Brokerless Rooms & PG in UP & Pune | Roomzo' },
    { property: 'og:description', content: 'Zero broker fees. Connect directly with owners for verified single rooms, hostels, and flats in Prayagraj, Varanasi, and Pune.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: 'https://www.roomzo.in/favicon.ico' },
  ]
};

@Component({
  selector: 'app-explore-listings',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, 
    FormsModule, ReactiveFormsModule, 
    MatAutocompleteModule, MatInputModule,
    SafetyConsentBottomSheetComponent
  ],
  templateUrl: './explore-listing.html',
  styleUrls: ['./explore-listing.css']
})
export default class ExploreListingsComponent implements OnInit, OnDestroy {
  
  // Data State
  listings: any[] = [];
  totalItems = 0;
  isLoading = false;

  // Search State
  searchControl = new FormControl('');
  filteredCities: any[] = []; 
  selectedLocation: { city: string, state: string } | null = null;

  // Filter State
  filters: ListingFilter = {
    minPrice: 0,
    maxPrice: 50000,
    propertyType: 'Any',
    bedrooms: 'Any',
    sortBy: 'nearest'
  };

  availabilityFilter: 'available' | 'all' = 'all';

  // Pagination
  currentPage = 0;
  pageSize = 15;
  totalPages = 0;
  pagesArray: (number | string)[] = [];
  
  private searchSubscription: Subscription | null = null;
  isMobileFiltersOpen = false;

  // --- Dynamic Placeholder Properties ---
  placeholders: string[] = [
    'Search "Civil lines, Prayagraj"',
    'Search "Mumfordganj, Prayagraj"',
    'Search "Teliyarganj, Prayagraj"',
    'Search "Viman Nagar, Pune"',
    'Search "Katra, Prayagraj"',
    'Search "Lanka, Varanasi"',
    'Search "Kydganj, Prayagraj"',
    'Search "Naini, Prayagraj"',
  ];
  currentPlaceholder: string = '';
  private charIndex: number = 0;
  private placeholderIndex: number = 0;
  private typingTimeout: any;
  private isDestroyed = false;
  private documentClickListener: (() => void) | null = null;
  
  isDropdownOpen = false;

  // --- Safety Consent State Signals ---
  userHasGivenConsent = signal(false); 
  isConsentModalOpen = signal(false);
  pendingAction = signal<PendingAction | any>(null);

  constructor(
    private propertyService: PropertyService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.typeEffect();
    
    // Real-time OpenStreetMap Locality Search using forkJoin for both UP and MH
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter((val): val is string => typeof val === 'string' && val.trim().length > 2), 
      switchMap(val => {
        const text = val as string;
        const upQuery = `${text}, Uttar Pradesh`;
        const mhQuery = `${text}, Maharashtra`;

        const upUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(upQuery)}&addressdetails=1&countrycodes=in&limit=5`;
        const mhUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mhQuery)}&addressdetails=1&countrycodes=in&limit=5`;
        
        return forkJoin({
          up: this.http.get<any[]>(upUrl).pipe(catchError(() => of([]))),
          mh: this.http.get<any[]>(mhUrl).pipe(catchError(() => of([])))
        }).pipe(
          map(({ up, mh }) => {
            const combined = [...up, ...mh];
            return combined
              .sort((a, b) => (b.importance || 0) - (a.importance || 0))
              .slice(0, 6); 
          })
        );
      })
    ).subscribe(results => {
      this.filteredCities = results || [];
      this.cd.detectChanges();
    });

  this.route.queryParams.subscribe(params => {
  // Reset type filter to default 'Any' if not specifically provided in query params
  this.filters.propertyType = params['propertyType'] ? params['propertyType'] : 'Any';

  if (Object.keys(params).length > 0) {
    if (params['city'] && params['state']) {
      const city = params['city'];
      const state = params['state'];
      const street = params['street'] ?? '';
      this.selectedLocation = { city, state };
      
      const displayVal = street ? `${street}, ${city}` : city;
      this.searchControl.setValue(displayVal, { emitEvent: false });
      
      this.filters.city = city;
      this.filters.state = state;
    }

    if (params['lat'] && params['lng']) {
      this.filters.lat = Number(params['lat']);
      this.filters.lng = Number(params['lng']);
    }

    if (params['maxPrice']) {
      this.filters.maxPrice = Number(params['maxPrice']);
    }
  }

  // Reloads listings based on the newly captured parameter filter criteria
  this.loadListings();
});
    if (isPlatformBrowser(this.platformId)) {
      this.documentClickListener = this.renderer.listen('document', 'click', (event: Event) => {
        const target = event.target as HTMLElement;
        const dropdownElement = document.querySelector('.pro-dropdown');
        if (this.isDropdownOpen && dropdownElement && !dropdownElement.contains(target)) {
          this.isDropdownOpen = false;
          this.cd.detectChanges();
        }
      });
    }

    // Check if the user is returning from a login screen to complete an action
    this.checkReturnFromLogin();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.documentClickListener) {
      this.documentClickListener();
    }
  }

  // Check LocalStorage to see if we need to auto-trigger a WhatsApp/Call click
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

  displayCity = (result: any): string => {
    if (!result) return '';
    if (typeof result === 'string') return result;
    
    const addr = result.address || {};
    const locality = addr.neighbourhood || addr.suburb || addr.village || addr.town || result.name || '';
    const city = addr.city || addr.state_district || addr.county || '';
    const state = addr.state || '';

    const parts = [locality, city, state].filter((val, index, arr) => val && arr.indexOf(val) === index);
    return parts.join(', ');
  }

  onCitySelected(event: any) {
    const result = event.option.value;
    const addr = result.address || {};

    this.filters.lat = parseFloat(result.lat);
    this.filters.lng = parseFloat(result.lon); 
    
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';

    this.filters.city = city;
    this.filters.state = state;

    this.selectedLocation = { city, state };
    this.applyFilters();
  }

  loadListings(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.isLoading = true;
    this.cd.detectChanges();

    let isRentedParam = this.availabilityFilter === 'available' ? false : undefined;

    if (!this.filters.city && !this.filters.lat) {
      if (isPlatformBrowser(this.platformId)) {
        const storedLocation = localStorage.getItem('user_geo_location');
        if (storedLocation) {
          const parsed = JSON.parse(storedLocation);
          this.filters.lat = parsed.lat;
          this.filters.lng = parsed.lng;
        }
      }
    }

    this.searchSubscription = this.propertyService.searchListingsWithFilters(
        this.currentPage,
        this.pageSize,
        this.filters,
        isRentedParam
      ).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cd.detectChanges(); 
      })
    ).subscribe({
      next: (response: any) => {
        if (!response) {
            this.listings = [];
            this.totalItems = 0;
            return;
        }
        this.listings = response.listings || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.calculatePagination();
      },
      error: (err: any) => {
        console.error('API Error:', err);
        this.listings = []; 
        this.totalItems = 0;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadListings();
  }

  resetFilters(): void {
    this.filters = { minPrice: 0, maxPrice: 50000, propertyType: 'Any', bedrooms: 'Any', sortBy: 'nearest' };    
    this.searchControl.setValue('');
    this.selectedLocation = null;
    this.availabilityFilter = 'available';
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadListings();
    }
  }

  calculatePagination(): void {
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i);
  }

  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString() : '0');
  }

  formatPostedDate(dateString?: string): string {
    if (!dateString) return 'Recently posted';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  
  viewDetails(id: string) {
      this.router.navigate(['/room', id]);
  }
  
  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }

  scrollToContact(id: string): void {
    this.router.navigate(['/room', id], {
      queryParams: { focusContact: 'true' } 
    });
  }

  private typeEffect() {
    if (this.isDestroyed) return;

    const currentWord = this.placeholders[this.placeholderIndex];
    
    if (this.charIndex < currentWord.length) {
      this.ngZone.run(() => {
        this.currentPlaceholder += currentWord.charAt(this.charIndex);
        this.cd.markForCheck();   
      });
      this.charIndex++;
      this.typingTimeout = setTimeout(() => this.typeEffect(), 40);
    } else {
      this.typingTimeout = setTimeout(() => this.eraseEffect(), 1800);
    }
  }

  private eraseEffect() {
    if (this.isDestroyed) return;

    if (this.charIndex > 0) {
      this.ngZone.run(() => {
        this.currentPlaceholder = this.currentPlaceholder.substring(0, this.charIndex - 1);
        this.cd.markForCheck();   
      });
      this.charIndex--;
      this.typingTimeout = setTimeout(() => this.eraseEffect(), 25);
    } else {
      this.placeholderIndex = (this.placeholderIndex + 1) % this.placeholders.length;
      this.typingTimeout = setTimeout(() => this.typeEffect(), 200);
    }
  }

  typeof(val: any): string {
    return typeof val;
  }

  onScroll(event: WheelEvent, element: HTMLElement): void {
    const canScrollHorizontally = element.scrollWidth > element.clientWidth;
    
    if (canScrollHorizontally && event.deltaY !== 0) {
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    }
  }
  
  scrollPagination(element: HTMLElement, direction: 'left' | 'right'): void {
    const scrollAmount = 144; 
    
    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.cd.detectChanges();  
  }

  selectSort(value: string) {
    this.filters.sortBy = value;
    this.isDropdownOpen = false;
    this.applyFilters();
    this.cd.detectChanges();
  }

  getSortLabel(): string {
    switch(this.filters.sortBy) {
      case 'latest': return 'Latest First';
      case 'oldest': return 'Oldest First';
      default: return 'Nearest First';
    }
  }

  // --- Contact & Consent Logic ---
  handleCardContactAction(prop: any, actionType: 'call' | 'whatsapp') {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      const actionPayload = { prop, actionType };
      
      this.checkAndExecuteConsent(actionPayload, () => {
        this.executeContactAction(prop, actionType);
      });
      
    } else {
      const returnUrl = this.router.url; 
      localStorage.setItem('pendingAction', JSON.stringify({ action: actionType, propertyId: prop.id }));
      this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  private executeContactAction(prop: any, actionType: 'call' | 'whatsapp') {
    const phone = prop.contactNo || prop.tempContactNo;
    
    if (!phone) {
      this.propertyService.getListingById(prop.id).subscribe((res: any) => {
          const p = res.data;
          const phoneNum = p.contactNo || p.tempContactNo;
          if(phoneNum) {
            this.propertyService.triggerPhoneAndWP(phoneNum, actionType, p);
          } else {
            this.toastr.error('Contact number not available');
          }
      });
      return;
    }
    
    this.propertyService.triggerPhoneAndWP(phone, actionType, prop);
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
}